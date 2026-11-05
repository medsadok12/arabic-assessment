'use client';
import{useEffect,useLayoutEffect,useRef,useState}from'react';
import{Award,Check,House,LockKeyhole}from'lucide-react';
import{displayNumber}from'../../../../../lib/display-number';
import{HOME_SCENE_STATIONS,homeSceneLayout,homeStationBox}from'../../../../../lib/picture-quest-home-scene';
import HomeArt from'./HomeArt';
import'./home-scene.css';

const useBrowserLayoutEffect=typeof window==='undefined'?useEffect:useLayoutEffect;
// Falling hearts, stars and confetti for the celebration: fixed positions keep server and client markup identical.
const CONFETTI=Array.from({length:22},(_,i)=>({left:(i*37+11)%100,delay:(i*.23)%2.4,shape:['heart','star','dot'][i%3],color:['#ff7aa8','#ffd23f','#7fe0c4','#ff9f68','#8fc8ff'][i%5]}));

function HomeCelebration({motion,hasNext,onNext,onClose}){
 const first=useRef(null);
 useEffect(()=>{first.current?.focus({preventScroll:true,focusVisible:false})},[]);
 return <div className={'pqh-party'+(motion?' pqh-party-motion':'')} role="dialog" aria-modal="true" aria-label="احتفال إنجاز البيت">
  <div className="pqh-confetti" aria-hidden="true">{CONFETTI.map((c,i)=><i key={i} className={'pqh-bit pqh-bit-'+c.shape} style={{left:c.left+'%',animationDelay:c.delay+'s','--pqh-bit':c.color}}/>)}</div>
  <div className="pqh-party-card">
   <span className="pqh-party-badge" aria-hidden="true"><Award/></span>
   <h3 className="pqh-party-title">بطل البيت!</h3>
   <p className="pqh-party-text" role="status">أضأتَ كلَّ غرف البيت بكلماتك ✨</p>
   <button ref={first} type="button" className="pqh-go" onClick={hasNext?onNext:onClose}>{hasNext?'العالم التالي ←':'العودة إلى المراحل ←'}</button>
   {hasNext&&<button type="button" className="pqh-party-stay" onClick={onClose}>سأبقى في البيت 🏠</button>}
  </div>
 </div>;
}

export default function HomeScene({data,topic,active,staff,embedded,preparing,entering,status,onChoose,onBegin,onPreview,celebrate=false,onCelebrationDone,onNextWorld}){
 const root=useRef(null),notified=useRef(false),[box,setBox]=useState(null),[celebration,setCelebration]=useState(false),[replay,setReplay]=useState(0);
 const completed=topic.stages.length===3&&topic.stages.every(s=>s.completed);
 useEffect(()=>{if(celebrate&&completed&&!notified.current){notified.current=true;setCelebration(true);onCelebrationDone?.()}if(!celebrate)notified.current=false},[celebrate,completed,onCelebrationDone]);
 useBrowserLayoutEffect(()=>{
  const el=root.current;if(!el)return;
  const update=()=>{const w=el.clientWidth,h=el.clientHeight;if(w&&h)setBox(old=>old&&old.w===w&&old.h===h?old:{w,h})};
  update();if(typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();
 },[]);
 // Short landscape phones keep the start button in a side panel; elsewhere it sits under the house.
 const side=!!box&&box.h<520&&box.w/box.h>1.5,showTrial=staff||completed;
 const layout=homeSceneLayout(box?.w,box?.h,side?{top:58,bottom:12,left:Math.min(300,box.w*.36)}:{top:80,bottom:showTrial?184:128,left:0});
 const motion=data.settings.animate!==false&&data.journeyEffects!==false;
 const done=n=>!!topic.stages.find(s=>s.stage===n)?.completed;
 // Each completed stage lights its floor (1 living room, 2 bedroom, 3 attic). With motion on, the earned
 // lights switch on one floor at a time after the screen opens, so the child sees their own progress light up.
 const earned=[1,2,3].filter(done),earnedKey=earned.join(''),[lit,setLit]=useState(()=>motion?[]:earned);
 useEffect(()=>{
  const target=earnedKey.split('').map(Number);
  setLit(old=>old.filter(n=>target.includes(n)));
  if(!motion||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){setLit(target);return;}
  const timers=target.map((n,i)=>setTimeout(()=>setLit(old=>old.includes(n)?old:[...old,n]),450+i*550));
  return()=>timers.forEach(clearTimeout);
 },[earnedKey,motion]);
 const focus=homeStationBox(layout,HOME_SCENE_STATIONS[active.stage]||HOME_SCENE_STATIONS[1]);
 function spring(button){
  if(!motion||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
  const medal=button.querySelector('.pqh-medal');medal?.getAnimations?.().forEach(a=>a.cancel());
  medal?.animate?.([{transform:'scale(1)'},{offset:.2,transform:'scale(.88,.92)'},{offset:.6,transform:'scale(1.1,1.06)'},{transform:'scale(1)'}],{duration:440,easing:'cubic-bezier(.22,.7,.25,1)'});
 }
 const artClass=[lit.includes(1)&&'pqh-on-1 pqh-lit-a',lit.includes(2)&&'pqh-on-2 pqh-lit-b',lit.includes(3)&&'pqh-on-3',celebration&&'pqh-celebrating'].filter(Boolean).join(' ');
 return <section ref={root} className={'pqh-scene'+(motion?' pqh-motion':'')+(embedded?' pqh-embedded':'')+(side?' pqh-side':'')+(entering?' pqh-entering':'')+(data.hubDepthEnabled===false?' pqh-flat':'')} style={{'--pqh-ox':focus.left+'%','--pqh-oy':focus.top+'%'}} aria-label={'مراحل '+topic.title} aria-busy={preparing||entering}>
  <HomeArt layout={layout} className={artClass}/>
  <h2 className="pqh-heading"><span className="pqh-heading-icon" aria-hidden="true"><House/></span>{topic.title}</h2>
  <div className="pqh-stations" role="group" aria-label={'مراحل '+topic.title}>{topic.stages.map(s=>{
   const spot=HOME_SCENE_STATIONS[s.stage];if(!spot)return null;
   const{left,top,size}=homeStationBox(layout,spot),locked=!staff&&!s.unlocked;
   return <button type="button" key={s.stage} className={'pqh-station'+(active.stage===s.stage?' current':'')+(s.completed?' completed':'')+(locked?' locked':'')} style={{left:left+'%',top:top+'%',width:size,height:size,'--pqh-font':Math.round(size*.44)+'px'}} disabled={preparing||entering||locked} aria-label={'المرحلة '+displayNumber(s.stage)+(s.completed?'، مكتملة':locked?'، مقفلة':'')} aria-pressed={active.stage===s.stage} onClick={e=>{spring(e.currentTarget);onChoose?.(s.stage)}}>
    <span className="pqh-medal" aria-hidden="true"><b className="pqh-num">{displayNumber(s.stage)}</b></span>
    {s.completed?<span className="pqh-state" aria-hidden="true"><Check/></span>:locked?<span className="pqh-state" aria-hidden="true"><LockKeyhole/></span>:null}
   </button>;
  })}</div>
  <div className="pqh-action">
   {showTrial&&<button type="button" className="pqh-celebrate-preview" disabled={preparing||entering} onClick={()=>{setReplay(n=>n+1);setCelebration(true)}}>{staff?'جرّب احتفال البيت':'احتفال بيتي ✨'}</button>}
   <p className="pqh-status" role="status">{status}</p>
   <button type="button" className="pqh-go" disabled={preparing||entering||!staff&&(!active.ready||!active.unlocked)} onClick={()=>staff?(onPreview?onPreview():onBegin?.()):onBegin?.()}>{preparing?'نجهّز لعبتك…':staff?'معاينة المرحلة ←':!active.ready?'قيد التجهيز':active.completed?'راجع ←':active.resume?'واصل ←':'ابدأ ←'}</button>
  </div>
  {celebration&&<HomeCelebration key={replay} motion={motion} hasNext={!staff&&!!onNextWorld} onNext={onNextWorld} onClose={()=>setCelebration(false)}/>}
 </section>;
}
