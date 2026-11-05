'use client';
import{useEffect,useRef,useState}from'react';
import{Award}from'lucide-react';
import{SCHOOL_CELEBRATION_ART,SCHOOL_FAHEEM_ART,animateSchoolCelebration}from'../../../../../lib/picture-quest-school-celebration';
import'./body-celebration.css';
import'./school-courtyard.css';
export default function SchoolCourtyardCelebration({data,onClose,onNext,hasNext=false}){
 const host=useRef(null),callbacks=useRef({onClose,onNext}),[size,setSize]=useState(null),[ready,setReady]=useState(false),[message,setMessage]=useState('أكملت رحلة المدرسة!'),[settled,setSettled]=useState(false);
 callbacks.current={onClose,onNext};
 const audio=useRef(null),[blocked,setBlocked]=useState('');
 function play(url){audio.current?.pause();setBlocked('');if(!url)return;const a=new Audio(url);audio.current=a;a.play()?.catch(()=>{if(audio.current===a)setBlocked(url)});}
 useEffect(()=>{if(!ready)return;let live=true;const jobs=[];const sound=data.settings.sound!==false;
 if(sound&&data.schoolBellSoundEnabled!==false&&data.schoolBellUrl)play(data.schoolBellUrl);
 if(sound&&data.schoolVoiceEnabled!==false&&data.schoolFaheemEnabled!==false&&data.schoolVoiceUrl)jobs.push(setTimeout(()=>{if(live)play(data.schoolVoiceUrl)},data.settings.animate===false?40:4500));
 return()=>{live=false;jobs.forEach(clearTimeout);audio.current?.pause();audio.current=null};},[ready,data]);
 useEffect(()=>{const el=host.current,update=()=>{const w=Math.min(el.clientWidth,el.clientHeight*944/1666);setSize({width:w,height:w*1666/944})};update();const ro=new ResizeObserver(update);ro.observe(el);return()=>ro.disconnect()},[]);
 useEffect(()=>{let live=true;const images=[SCHOOL_CELEBRATION_ART,data.schoolBackpackEnabled===false?'/picture-quest/body-faheem-front-v1.webp':SCHOOL_FAHEEM_ART,'/picture-quest/school-scene-v1.webp'];Promise.all(images.map(src=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=src;if(img.complete)resolve()}))).then(()=>{if(live)setReady(true)});return()=>{live=false}},[data.schoolBackpackEnabled]);
 useEffect(()=>{if(!ready)return;return animateSchoolCelebration(host.current,{data,reduced:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,onMessage:setMessage,onSettled:()=>setSettled(true)});},[ready,data]);
 return <div ref={host} className="pbc-shell pqschool-celebration" aria-label="احتفال إنجاز المدرسة" aria-busy={!ready}>
  <section className="bm-scene" style={{...size,'--bw-faheem':`url("${data.schoolBackpackEnabled===false?'/picture-quest/body-faheem-front-v1.webp':SCHOOL_FAHEEM_ART}")`}}>
   <h2 className="bm-heading">المدرسة</h2>
   <span className="sc-bell" aria-hidden="true"/><span className="bm-door bm-door-left" aria-hidden="true"/><span className="bm-door bm-door-right" aria-hidden="true"/>
   {data.schoolFaheemEnabled!==false&&<div className="bw-faheem" aria-hidden="true"><span className="bw-shadow"/><span className="bw-pose bw-rest"/></div>}
   <div className="bw-gate-foreground" aria-hidden="true"/>
   {data.schoolAlbumEnabled!==false&&<div className="bw-album" aria-label="ألبوم الإنجازات" aria-hidden="true"><div className="bw-book"><div className="bw-page"><span className="bw-album-title">ألبوم إنجازاتي</span>{data.schoolBadgeEnabled!==false&&<><span className="bw-slot"><Award aria-hidden="true"/></span><span className="bw-album-label">بطل المدرسة</span></>}</div><div className="bw-page bw-other"><span className="bw-book-stars" aria-hidden="true">✦</span><span>رحلة جديدة تنتظرك</span></div></div></div>}
   {data.schoolBadgeEnabled!==false&&<div className="bw-badge" aria-hidden="true"><Award/><span>بطل<br/>المدرسة</span></div>}
   <p className="bm-message" role="status" aria-live="polite">{message}</p>
   {blocked&&<button type="button" className="pqschool-audio" onClick={()=>play(blocked)}>استمع إلى التهنئة</button>}{settled&&<div className="bm-actions"><button type="button" className="bm-complete" onClick={()=>hasNext?callbacks.current.onNext?.():callbacks.current.onClose?.()}>{hasNext?'العالم التالي ←':'العودة إلى المراحل ←'}</button></div>}
  </section>
 </div>;
}
