'use client';
import{useEffect,useRef,useState}from'react';
import{animateGateCat}from'../../../../../lib/picture-quest-gate-motion';
import'./gate-celebration.css';

export default function GateCelebration({data,completed=false,celebrate=false,onDone}){
 const gate=useRef(null),opening=useRef(null),cat=useRef(null),frames=useRef(null),shadow=useRef(null),done=useRef(onDone);
 const[phase,setPhase]=useState('idle'),[audioBlocked,setAudioBlocked]=useState(false),audio=useRef(null);
 done.current=onDone;
 const motion=data.settings.animate!==false&&data.journeyEffects!==false,door=data.gateDoorEnabled!==false,kitten=data.gateCatEnabled!==false,faheem=data.gateFaheemEnabled!==false,voice=data.gateVoiceEnabled!==false&&data.settings.sound!==false,url=data.gateVoiceUrl||'';
 useEffect(()=>{
  setPhase('idle');setAudioBlocked(false);if(cat.current)cat.current.hidden=completed&&!celebrate;let live=true,stopCat=()=>{};const timers=[];
  const later=(fn,ms)=>timers.push(setTimeout(()=>{if(live)fn()},ms));
  const reduced=!motion||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(celebrate){
   later(()=>setPhase('opening'),reduced?0:32);
   if(!reduced&&kitten)later(()=>{setPhase('crossing');stopCat=animateGateCat({gate:gate.current,opening:opening.current,cat:cat.current,frames:frames.current,shadow:shadow.current});},door?900:50);
   later(()=>{setPhase('cheering');if(faheem&&voice&&url){const player=new Audio(url);audio.current=player;player.play()?.catch(()=>{if(live)setAudioBlocked(true)});}},reduced?50:kitten?(door?3900:3050):door?950:50);
   later(()=>{setPhase('done');done.current?.();},reduced?100:kitten?(door?6900:6050):3950);
  }
  return()=>{live=false;timers.forEach(clearTimeout);stopCat();if(audio.current){audio.current.pause();audio.current=null;}};
 },[celebrate,completed,motion,door,kitten,faheem,voice,url]);
 const cheering=celebrate&&['cheering','done'].includes(phase);
 function replayAudio(){const player=audio.current;if(!player)return;player.currentTime=0;player.play()?.then(()=>setAudioBlocked(false)).catch(()=>setAudioBlocked(true));}
 return <div ref={gate} className={'pqg'+((celebrate?phase!=='idle':completed)?' pqg-open':'')+(!motion?' pqg-still':'')+(!door?' pqg-no-door-motion':'')+(cheering?' pqg-cheering':'')} data-phase={phase}>
  <span className="pqg-atlas pqg-gate-art" aria-hidden="true"/>
  <div ref={opening} className="pqg-opening" aria-hidden="true"><div className="pqg-leaf pqg-left"><span className="pqg-atlas pqg-texture"/></div><div className="pqg-leaf pqg-right"><span className="pqg-atlas pqg-texture"/></div></div>
  {kitten&&<><span ref={shadow} className="pqg-shadow" aria-hidden="true" hidden={completed&&!celebrate}/><span ref={cat} className="pqg-cat" aria-hidden="true" hidden={completed&&!celebrate||cheering}><span ref={frames} className="pqg-frames"/></span></>}
  {cheering&&faheem&&<div className="pqg-welcome"><span className="pqg-atlas pqg-faheem" aria-hidden="true"/><p role="status">أَحْسَنْتَ عَمَلًا!<br/>لَقَدْ عَبَرْتَ بَوَّابَةَ الْحَيَوَانَاتِ!</p>{audioBlocked&&<button type="button" onClick={replayAudio}>استمع إلى فهيم</button>}</div>}
 </div>;
}
