'use client';
import{useEffect,useRef,useState}from'react';
import'./school-celebration.css';

const CUES=[['ring',400],['opened',1150],['welcoming',2200],['reading',4200],['gift',5900],['item-one',7250],['item-two',7680],['item-three',8110],['finished',8750]];
const ITEMS=[['school-book','كِتَابٌ'],['pencil','قَلَمٌ'],['school-bag','حَقِيبَةٌ']];
export function SchoolBuilding(){return <div className="pqs-school" aria-hidden="true"><div className="pqs-sprite pqs-building"/><div className="pqs-bell-wrap"><div className="pqs-sprite pqs-bell"/></div><i className="pqs-window pqs-window-a"/><i className="pqs-window pqs-window-b"/><div className="pqs-door"><div className="pqs-sprite pqs-door-frame"/><div className="pqs-door-half pqs-left"><div className="pqs-sprite"/></div><div className="pqs-door-half pqs-right"><div className="pqs-sprite"/></div></div></div>}
export default function SchoolCelebration({data,celebrate=false,onDone}){
 const[phase,setPhase]=useState('idle'),[blocked,setBlocked]=useState(null),[settled,setSettled]=useState(false);
 const stage=useRef(null),person=useRef(null),notebook=useRef(null),audio=useRef(null),finish=useRef(()=>{}),done=useRef(onDone);done.current=onDone;
 const motion=data.settings.animate!==false&&data.journeyEffects!==false,door=data.schoolDoorEnabled!==false,bell=data.schoolBellEnabled!==false,lights=data.schoolLightsEnabled!==false,faheem=data.schoolFaheemEnabled!==false,book=data.schoolBookEnabled!==false,flip=data.schoolPagesEnabled!==false,sound=data.settings.sound!==false;
 const bellUrl=data.schoolBellSoundEnabled!==false&&sound?data.schoolBellUrl||'':'',voiceUrl=data.schoolVoiceEnabled!==false&&sound&&faheem?data.schoolVoiceUrl||'':'';
 useEffect(()=>{
  let live=true,finished=false;const jobs=[];setPhase('idle');setBlocked(null);setSettled(false);
  function stop(){if(audio.current){audio.current.pause();audio.current=null}}
  function play(url){stop();setBlocked(null);if(!url)return;const a=new Audio(url);audio.current=a;a.play()?.catch(()=>{if(live&&audio.current===a)setBlocked(url)})}
  function clear(){jobs.forEach(clearTimeout);stop()}
  function complete(){if(!live||finished)return;finished=true;setPhase('finished');done.current?.()}
  finish.current=()=>{clear();setSettled(true);complete()};
  const reduced=!motion||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(celebrate){
   // Measure at rest, once, before transforms start: the feet originate inside the doorway.
   const p=person.current?.getBoundingClientRect(),d=stage.current?.querySelector('.pqs-door')?.getBoundingClientRect(),b=notebook.current?.getBoundingClientRect();
   if(p&&d){person.current.style.setProperty('--start-x',d.left+d.width*.5-(p.left+p.width*.5)+'px');person.current.style.setProperty('--start-y',d.top+d.height*.85-(p.top+p.height*.95)+'px')}
   if(b){const x=p?p.left+p.width*.49-(b.left+b.width*.5):0,y=p?p.top+p.height*.64-(b.top+b.height*.68):0;notebook.current.style.setProperty('--handoff-x',x+'px');notebook.current.style.setProperty('--handoff-y',y+'px');notebook.current.style.setProperty('--handoff-mid-x',x*.46+'px');notebook.current.style.setProperty('--handoff-mid-y',y*.46-12+'px')}
   if(reduced){setSettled(true);jobs.push(setTimeout(()=>{complete();play(voiceUrl)},40))}
   else for(const[name,ms]of CUES)jobs.push(setTimeout(()=>{if(!live)return;setPhase(name);if(name==='ring')play(bellUrl);if(name==='finished'){complete();play(voiceUrl)}},ms));
  }
  const hide=()=>{if(document.hidden&&celebrate){clear();setSettled(true);complete()}};document.addEventListener('visibilitychange',hide);
  return()=>{live=false;clear();document.removeEventListener('visibilitychange',hide)};
 },[celebrate,motion,door,bell,lights,faheem,book,flip,bellUrl,voiceUrl]);
 const index=CUES.findIndex(([name])=>name===phase),has=name=>index>=CUES.findIndex(([n])=>n===name);
 function replay(){const url=blocked;if(!url)return;audio.current?.pause();const a=new Audio(url);audio.current=a;a.play()?.then(()=>{if(audio.current===a)setBlocked(null)}).catch(()=>{});}
 return <div ref={stage} className={'pqs pqs-celebration'+CUES.filter(([name])=>has(name)).map(([name])=>' pqs-'+name).join('')+(!motion||settled?' pqs-settled':'')+(!door?' pqs-no-door-motion':'')+(!bell?' pqs-no-bell-motion':'')+(!lights?' pqs-no-lights':'')+(!flip?' pqs-no-pages':'')+(!book?' pqs-no-book':'')} data-phase={phase} aria-label="احتفال إكمال رحلة المدرسة">
  <div className="pqs-layout"><SchoolBuilding/>
   {faheem&&<div ref={person} className="pqs-faheem" aria-hidden="true"><div className="pqs-sprite pqs-faheem-closed"/><div className="pqs-sprite pqs-faheem-open"/>{book&&flip&&<div className="pqs-book-flip"><i/><i/><i/></div>}<div className="pqs-clap pqs-palms-open"/><div className="pqs-clap pqs-palms-closed"/></div>}
   {book&&<div ref={notebook} className={'pqs-notebook'+(!faheem?' pqs-book-alone':'')} aria-label="دفتر المعرفة"><div className="pqs-sprite"/><span className="pqs-gold-star" aria-hidden="true">★</span><div className="pqs-items">{ITEMS.map(([image,label])=><div className="pqs-item" key={image}><img src={'/discover-objects/objects/'+image+'.svg'} alt=""/><span>{label}</span></div>)}</div></div>}
  </div>
  <div className="pqs-message" role="status">{phase==='finished'&&<p>أَحْسَنْتَ يَا بَطَلُ!<br/>لَقَدْ أَكْمَلْتَ رِحْلَةَ الْمَدْرَسَةِ!</p>}{blocked&&<button type="button" onClick={replay}>استمع إلى التهنئة</button>}</div>
  {celebrate&&phase!=='finished'&&<button type="button" className="pqs-skip" onClick={()=>finish.current()}>تخطَّ</button>}
 </div>;
}
