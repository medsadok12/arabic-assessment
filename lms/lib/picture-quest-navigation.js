const KEY='__aremQuestNavigation';
const empty=()=>({topicId:null,stageId:null,selection:null});
const id=v=>typeof v==='string'&&/^[a-z0-9_-]{1,70}$/i.test(v);
function valid(entry,child){
 const v=entry?.view;
 return entry?.child===child&&Number.isInteger(entry.depth)&&entry.depth>=0&&entry.depth<=2&&v&&
  (v.topicId===null||id(v.topicId))&&(v.stageId===null||[1,2,3].includes(v.stageId))&&
  (v.selection===null||id(v.selection?.topicId)&&[1,2,3,4].includes(v.selection?.stage));
}
// Keep the App Router's history fields intact. Only the training's local views
// are added; returning from the root still uses the browser's real previous page.
export function createTopicNavigation(win,{child=null,onChange,onExitRequest,shouldConfirm=()=>true}){
 const history=win.history,route=win.location.href;
 let current=valid(history.state?.[KEY],child)?history.state[KEY]:{child,depth:0,view:empty()};
 let restoring=false,allowExit=false,queuedExit=false,disposed=false;
 const write=(entry,push=false)=>{
  history[push?'pushState':'replaceState']({...history.state,[KEY]:entry},'',win.location.href);
  current=entry;onChange(entry.view);
 };
 write(current);
 function leave(){
  if(restoring){queuedExit=true;return;}
  if(!current.view.selection)return;
  allowExit=true;history.back();
 }
 function pop(event){
  if(disposed)return;
  // These history entries represent views inside this route, not a Next.js
  // page navigation. Consume them before its popstate listener restores a
  // stale route tree and remounts the catalog. Real cross-page Back stays native.
  if(win.location.href!==route||!event.state?.[KEY])return;
  event.stopImmediatePropagation?.();
  if(restoring){restoring=false;if(queuedExit){queuedExit=false;leave();}return;}
  const incoming=event.state?.[KEY];
  if(current.view.selection&&!allowExit&&shouldConfirm()){
   // Restore the play entry before asking. Cancelling must not consume history
   // or send an exit API call; confirmation traverses the same entry once.
   restoring=true;history.forward();onExitRequest();return;
  }
  allowExit=false;
  if(valid(incoming,child)){current=incoming;onChange(current.view);}
  else write({child,depth:0,view:empty()}); // Never restore another child's view.
 }
 win.addEventListener('popstate',pop,true);
 const push=view=>write({child,depth:current.depth+1,view},true);
 return{
  openTopic(topicId,stageId=null){push({topicId,stageId,selection:null});},
  chooseStage(stageId){write({...current,view:{...current.view,stageId}});},
  begin(selection){
   if(!['final','review'].includes(selection.topicId)){
    if(current.view.topicId!==selection.topicId)push({topicId:selection.topicId,stageId:selection.stage,selection:null});
    else write({...current,view:{...current.view,stageId:selection.stage}});
   }
   push({...current.view,selection});
  },
  back(){if(current.view.selection)onExitRequest();else if(current.depth>0)history.back();},
  confirmExit:leave,
  dispose(){disposed=true;win.removeEventListener('popstate',pop,true);}
 };
}
