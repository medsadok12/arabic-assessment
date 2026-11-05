// @vitest-environment jsdom
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import{createTopicNavigation}from'./picture-quest-navigation';
let nav,view,ask;
const settle=()=>new Promise(resolve=>setTimeout(resolve,30));
function mount(child='one'){
 ask=vi.fn();nav=createTopicNavigation(window,{child,onChange:v=>{view=v},onExitRequest:ask});return nav;
}
beforeEach(()=>{window.history.replaceState({__NA:true,tree:{original:true}},'','/library/games/picture-quest/topics');view=null;});
afterEach(()=>nav?.dispose());
it('returns from play to its selected stage, then worlds, with Back and Forward retaining the route',async()=>{
 mount();nav.openTopic('animals',1);nav.chooseStage(2);nav.begin({topicId:'animals',stage:2});
 nav.confirmExit();await settle();expect(view).toEqual({topicId:'animals',stageId:2,selection:null});
 nav.back();await settle();expect(view.topicId).toBeNull();
 history.forward();await settle();expect(view).toEqual({topicId:'animals',stageId:2,selection:null});
 expect(history.state.__NA).toBe(true);expect(history.state.tree).toEqual({original:true});
});
it('phone Back requests confirmation and restores play without consuming a history entry on cancellation',async()=>{
 mount();nav.openTopic('school');nav.begin({topicId:'school',stage:1});
 history.back();await settle();await settle();expect(ask).toHaveBeenCalledTimes(1);expect(view.selection).toEqual({topicId:'school',stage:1});
 // Cancellation leaves play intact. Another Back asks again, then confirmation
 // traverses exactly once, returning to the same topic and selected stage.
 history.back();await settle();await settle();expect(ask).toHaveBeenCalledTimes(2);
 nav.confirmExit();await settle();expect(view).toEqual({topicId:'school',stageId:1,selection:null});
 nav.back();await settle();expect(view.topicId).toBeNull();
});
it('can confirm immediately while the browser is restoring the guarded play entry',async()=>{
 mount();nav.openTopic('fruit');nav.begin({topicId:'fruit',stage:1});
 ask.mockImplementation(()=>nav.confirmExit());history.back();await settle();await settle();expect(view.selection).toBeNull();expect(view.topicId).toBe('fruit');
});
it('uses one parent for final and review, and creates the stages parent for a direct resume',async()=>{
 mount();nav.begin({topicId:'final',stage:4});nav.confirmExit();await settle();expect(view.topicId).toBeNull();
 nav.begin({topicId:'review',stage:1});nav.confirmExit();await settle();expect(view.topicId).toBeNull();
 nav.begin({topicId:'animals',stage:3});nav.confirmExit();await settle();expect(view).toEqual({topicId:'animals',stageId:3,selection:null});
});
it('restores a reload within the same child, but never opens another child’s saved view',()=>{
 mount();nav.openTopic('school');nav.begin({topicId:'school',stage:1});nav.dispose();mount();expect(view.selection?.topicId).toBe('school');
 nav.dispose();mount('two');expect(view).toEqual({topicId:null,stageId:null,selection:null});
});
it('removes its listener on an unexpected unmount without treating it as deliberate exit',async()=>{
 mount();nav.openTopic('school');nav.begin({topicId:'school',stage:1});nav.dispose();history.back();await settle();expect(ask).not.toHaveBeenCalled();
});
it('allows root Back to return to the actual library page without a confirmation trap',async()=>{
 history.replaceState({__NA:true},'','/library');history.pushState({__NA:true},'','/library/games/picture-quest/topics');mount();
 history.back();await settle();expect(location.pathname).toBe('/library');expect(ask).not.toHaveBeenCalled();
});
it('does not trap Back if a restored game cannot load and no play screen is mounted',async()=>{
 mount();nav.openTopic('school');nav.begin({topicId:'school',stage:1});nav.dispose();
 nav=createTopicNavigation(window,{child:'one',onChange:v=>{view=v},onExitRequest:ask,shouldConfirm:()=>false});
 history.back();await settle();expect(view.selection).toBeNull();expect(view.topicId).toBe('school');expect(ask).not.toHaveBeenCalled();
});
it('handles local Back before the framework router without swallowing real page navigation',async()=>{
 const router=vi.fn();window.addEventListener('popstate',router);
 try{
  mount();nav.openTopic('body',1);nav.begin({topicId:'body',stage:1});
  nav.confirmExit();await settle();expect(view.selection).toBeNull();expect(router).not.toHaveBeenCalled();
  nav.back();await settle();expect(view.topicId).toBeNull();expect(router).not.toHaveBeenCalled();
  history.replaceState({__NA:true},'','/library');history.pushState({__NA:true},'','/library/games/picture-quest/topics');nav.dispose();mount();
  history.back();await settle();expect(location.pathname).toBe('/library');expect(router).toHaveBeenCalledTimes(1);
 }finally{window.removeEventListener('popstate',router)}
});
