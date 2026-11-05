'use client';
import{useEffect,useRef,useState}from'react';
import{Check,LockKeyhole}from'lucide-react';
import{displayNumber}from'../../../../../lib/display-number';
import{BODY_SCENE_PORTRAIT,BODY_SCENE_LANDSCAPE,BODY_SCENE_STATIONS,bodySceneLayout}from'../../../../../lib/picture-quest-body-scene';
import BodyCelebration from'./BodyCelebration';
import{BODY_CELEBRATION_ART,BODY_CELEBRATION_WIDE_ART,BODY_FAHEEM_ART}from'../../../../../lib/picture-quest-body-celebration';
import'./body-scene.css';
export default function BodyScene({data,topic,active,staff,embedded,preparing,entering,status,onChoose,onBegin,onPreview,celebrate=false,onCelebrationDone,onNextWorld}){
 const root=useRef(null),[size,setSize]=useState(null),[celebration,setCelebration]=useState(false),[replay,setReplay]=useState(0);
 const completed=topic.stages.length===3&&topic.stages.every(s=>s.completed),notified=useRef(false);
 useEffect(()=>{if(celebrate&&completed&&!notified.current){notified.current=true;setCelebration(true);onCelebrationDone?.()}if(!celebrate)notified.current=false},[celebrate,completed,onCelebrationDone]);
 const motion=data.settings.animate!==false&&data.journeyEffects!==false;
 function spring(button){if(!motion||data.bodyPressEnabled===false||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;const face=button.querySelector('.pqb-face');face.getAnimations?.().forEach(a=>a.cancel());face.animate?.([{transform:'scale(1)'},{offset:.2,transform:'scale(.89,.93)'},{offset:.6,transform:'scale(1.09,1.06)'},{transform:'scale(1)'}],{duration:440,easing:'cubic-bezier(.22,.7,.25,1)'});}
 function trial(){setReplay(n=>n+1);setCelebration(true)}
 useEffect(()=>{const el=root.current;if(!el)return;const update=()=>{const next=bodySceneLayout(el.clientWidth,el.clientHeight);setSize(old=>old?.width===next.width&&old?.height===next.height&&old?.wide===next.wide?old:next);};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();},[]);
 const wide=size?.wide===true,src=wide?BODY_SCENE_LANDSCAPE:BODY_SCENE_PORTRAIT;
 useEffect(()=>{[wide?BODY_CELEBRATION_WIDE_ART:BODY_CELEBRATION_ART,BODY_FAHEEM_ART].forEach(src=>{const image=new Image();image.src=src;image.decode?.().catch(()=>{})})},[wide]);
 return <section ref={root} className={'pqb-scene'+(embedded?' pqb-embedded':'')+(wide?' pqb-wide':'')} style={{'--pqb-art':`url("${src}")`}} aria-label={'مراحل '+topic.title} aria-busy={preparing||entering}>
  <div className="pqb-canvas" style={size?{width:size.width,height:size.height}:undefined}>
   <img className="pqb-art" src={src} alt="" draggable={false} decoding="async"/>
   <h2 className="pqb-heading">{topic.title}</h2>
   <div className="pqb-stations" role="group" aria-label={'مراحل '+topic.title}>{topic.stages.map(s=>{const[x,y,diameter]=BODY_SCENE_STATIONS[wide?'landscape':'portrait'][s.stage];const locked=!staff&&!s.unlocked;return <button type="button" key={s.stage} className={'pqb-station'+(active.stage===s.stage?' current':'')+(s.completed?' completed':'')+(locked?' locked':'')} style={{left:x+'%',top:y+'%',width:size?Math.max(44,size.width*diameter/100):diameter+'%',height:size?Math.max(44,size.width*diameter/100):undefined}} disabled={preparing||entering||locked} aria-label={'المرحلة '+displayNumber(s.stage)+(s.completed?'، مكتملة':locked?'، مقفلة':'')} aria-pressed={active.stage===s.stage} onClick={e=>{spring(e.currentTarget);onChoose?.(s.stage)}}><span className="pqb-face" aria-hidden="true" style={{backgroundSize:`${10000/diameter}% ${10000/(diameter*(wide?1.5:870/1808))}%`,backgroundPosition:`${(x-diameter/2)/(100-diameter)*100}% ${(y-diameter*(wide?1.5:870/1808)/2)/(100-diameter*(wide?1.5:870/1808))*100}%`}}/>{s.completed?<span className="pqb-state" aria-hidden="true"><Check/></span>:locked?<span className="pqb-state" aria-hidden="true"><LockKeyhole/></span>:null}</button>})}</div>
   {(staff||completed)&&<button type="button" className="pqb-celebrate-preview" disabled={preparing||entering} onClick={trial}>{staff?'جرّب احتفال أعضاء الجسم':'ألبوم إنجازاتي'}</button>}
   <div className="pqb-action"><p className="pqb-status" role="status">{status}</p><button type="button" className="pqb-go" disabled={preparing||entering||!staff&&(!active.ready||!active.unlocked)} onClick={()=>staff?(onPreview?onPreview():onBegin?.()):onBegin?.()}>{preparing?'نجهّز لعبتك…':staff?'معاينة المرحلة ←':!active.ready?'قيد التجهيز':active.completed?'راجع ←':active.resume?'واصل ←':'ابدأ ←'}</button></div>
  </div>
  {celebration&&<BodyCelebration key={replay} layout={size} data={data} hasNext={!staff&&!!onNextWorld} onNext={onNextWorld} onClose={()=>setCelebration(false)}/>}
 </section>;
}
