'use client';
import{useEffect,useRef,useState}from'react';
import'./fruit-celebration.css';
import{HARVEST_FRUITS,HARVEST_START,HARVEST_STAGGER,HARVEST_CHEER,HARVEST_DONE,harvestFruitStyle}from'../../../../../lib/picture-quest-harvest';

export default function FruitCelebration({data,completed=false,celebrate=false,onDone}){
 const[phase,setPhase]=useState('idle'),[landed,setLanded]=useState(0),[blocked,setBlocked]=useState(false),done=useRef(onDone),audio=useRef(null);
 done.current=onDone;
 const motion=data.settings.animate!==false&&data.journeyEffects!==false,awning=data.fruitAwningEnabled!==false,panel=data.fruitPanelEnabled!==false,basket=data.fruitBasketEnabled!==false,jump=data.fruitJumpEnabled!==false,faheem=data.fruitFaheemEnabled!==false,voice=data.fruitVoiceEnabled!==false&&data.settings.sound!==false,url=data.fruitVoiceUrl||'';
 useEffect(()=>{
  let live=true;const timers=[];setPhase('idle');setLanded(0);setBlocked(false);
  const later=(fn,ms)=>timers.push(setTimeout(()=>{if(live)fn()},ms));
  const reduced=!motion||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(celebrate){
   later(()=>setPhase('opening'),reduced?0:50);
   later(()=>setPhase('released'),reduced?10:1050);
   if(basket)for(let i=1;i<=HARVEST_FRUITS.length;i++)later(()=>setLanded(i),reduced||!jump?20:HARVEST_START+(i-1)*HARVEST_STAGGER);
   later(()=>{setPhase('cheering');if(faheem&&voice&&url){const player=new Audio(url);audio.current=player;player.play()?.catch(()=>{if(live)setBlocked(true)});}},reduced?40:basket&&jump?HARVEST_CHEER:1850);
   later(()=>{setPhase('done');done.current?.();},reduced?100:basket&&jump?HARVEST_DONE:4000);
  }
  return()=>{live=false;timers.forEach(clearTimeout);if(audio.current){audio.current.pause();audio.current=null;}};
 },[celebrate,motion,awning,panel,basket,jump,faheem,voice,url]);
 const opened=celebrate?phase!=='idle':completed,released=opened&&(phase!=='opening'||completed&&!celebrate),cheer=celebrate&&['cheering','done'].includes(phase),filled=completed&&!celebrate;
 function replayVoice(){const p=audio.current;if(!p)return;p.currentTime=0;p.play()?.then(()=>setBlocked(false)).catch(()=>setBlocked(true));}
 return <div className={'pqh'+(basket?' pqh-has-basket':'')+(opened?' pqh-open':'')+(released?' pqh-released':'')+(celebrate&&released&&motion?' pqh-basket-exiting':'')+(landed||filled?' pqh-flight':'')+(cheer?' pqh-cheer':'')+(!motion?' pqh-still':'')+(!awning?' pqh-no-awning-motion':'')+(!panel?' pqh-no-panel-motion':'')+(!jump?' pqh-no-jump':'')} data-phase={phase}>
  <span className="pqh-frame" aria-hidden="true"/>
  <div className="pqh-prize" aria-hidden="true">
   {basket&&<><span className="pqh-shadow"/><div className="pqh-basket"><span className="pqh-art pqh-basket-back"/><span className="pqh-art pqh-basket-front"/></div></>}
   {HARVEST_FRUITS.map((fruit,i)=><span key={i} style={harvestFruitStyle(fruit)} hidden={i>=3&&(!basket||!filled&&landed<=i)} className={'pqh-fruit pqh-'+fruit.kind+(basket&&(filled||landed>i)?' pqh-landed':'')+(filled&&basket?' pqh-settled':'')}><span className="pqh-art"/></span>)}
   {basket&&<span className="pqh-art pqh-front-cover"/>}
  </div>
  <span className="pqh-panel" aria-hidden="true"/><span className="pqh-awning" aria-hidden="true"/>
  {cheer&&faheem&&<div className="pqh-welcome"><span className="pqh-faheem" aria-hidden="true"/><p role="status">أَحْسَنْتَ يَا بَطَلُ!<br/>لَقَدْ أَكْمَلْتَ رِحْلَةَ الْفَوَاكِهِ!</p>{blocked&&<button type="button" onClick={replayVoice}>استمع إلى فهيم</button>}</div>}
 </div>;
}
