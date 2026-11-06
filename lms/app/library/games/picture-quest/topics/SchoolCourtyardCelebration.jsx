'use client';
import{useEffect,useRef,useState}from'react';
import{Award}from'lucide-react';
import{SCHOOL_CELEBRATION_ART,SCHOOL_CELEBRATION_WIDE_ART,SCHOOL_FAHEEM_ART,animateSchoolCelebration}from'../../../../../lib/picture-quest-school-celebration';
import{schoolSceneLayout,SCHOOL_SCENE_ART,SCHOOL_SCENE_WIDE_ART}from'../../../../../lib/picture-quest-school-scene';
import'./body-celebration.css';
import'./school-courtyard.css';
export default function SchoolCourtyardCelebration({data,layout,onClose,onNext,hasNext=false}){
 const host=useRef(null),callbacks=useRef({onClose,onNext}),[size,setSize]=useState(null),[ready,setReady]=useState(false),[message,setMessage]=useState('أكملت رحلة المدرسة!'),[settled,setSettled]=useState(false);
 callbacks.current={onClose,onNext};
 const geometry=layout||size,wide=geometry?.wide===true,plate=wide?SCHOOL_CELEBRATION_WIDE_ART:SCHOOL_CELEBRATION_ART,closed=wide?SCHOOL_SCENE_WIDE_ART:SCHOOL_SCENE_ART;
 const w=geometry?.viewportWidth||390,h=geometry?.viewportHeight||844,x=-(geometry?.left||0),y=-(geometry?.top||0);
 const overlays=wide?{heading:{left:x+24,top:y+16,right:'auto'},message:{left:x+w*.29,top:y+24,right:'auto',width:w*.42},actions:{left:x+w*(h<520?.72:.35),right:'auto',width:w*(h<520?.25:.30),bottom:20+y},album:{left:x+w*.72,top:y+h*.57,width:Math.min(340,w*.25),height:Math.min(180,h*.22)},badge:{left:x+w*.30,top:y+h*.59,width:Math.min(130,w*.12)},audio:{left:x+w*.72,right:'auto',top:y+h*.22,width:w*.25}}:{};
 useEffect(()=>{host.current?.focus({preventScroll:true})},[]);
 useEffect(()=>{if(settled)host.current?.querySelector('.bm-complete')?.focus({preventScroll:true})},[settled]);
 const audio=useRef(null),[blocked,setBlocked]=useState('');
 function play(url){audio.current?.pause();setBlocked('');if(!url)return;const a=new Audio(url);audio.current=a;a.play()?.catch(()=>{if(audio.current===a)setBlocked(url)});}
 useEffect(()=>{if(!ready)return;let live=true;const jobs=[];const sound=data.settings.sound!==false;
 if(sound&&data.schoolBellSoundEnabled!==false&&data.schoolBellUrl)play(data.schoolBellUrl);
 if(sound&&data.schoolVoiceEnabled!==false&&data.schoolFaheemEnabled!==false&&data.schoolVoiceUrl)jobs.push(setTimeout(()=>{if(live)play(data.schoolVoiceUrl)},data.settings.animate===false?40:4500));
 return()=>{live=false;jobs.forEach(clearTimeout);audio.current?.pause();audio.current=null};},[ready,data,wide]);
 useEffect(()=>{if(layout)return;const el=host.current,update=()=>setSize(schoolSceneLayout(el.clientWidth,el.clientHeight));update();const ro=new ResizeObserver(update);ro.observe(el);return()=>ro.disconnect()},[layout]);
 useEffect(()=>{let live=true;const images=[plate,data.schoolBackpackEnabled===false?'/picture-quest/body-faheem-front-v1.webp':SCHOOL_FAHEEM_ART,closed];Promise.all(images.map(src=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=src;if(img.complete)resolve()}))).then(()=>{if(live)setReady(true)});return()=>{live=false}},[data.schoolBackpackEnabled,plate,closed]);
 useEffect(()=>{if(!ready)return;return animateSchoolCelebration(host.current,{data,wide,reduced:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,onMessage:setMessage,onSettled:()=>setSettled(true)});},[ready,data,wide]);
 return <div ref={host} className={'pbc-shell pqschool-celebration'+(wide?' pqschool-wide':'')} role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();callbacks.current.onClose?.()}if(event.key==='Tab'){const items=[...host.current.querySelectorAll('button')],at=items.indexOf(document.activeElement);event.preventDefault();if(items.length)items[(at+(event.shiftKey?-1:1)+items.length)%items.length].focus()}}} style={{'--bm-closed':`url("${closed}")`,'--bm-plate':`url("${plate}")`}} aria-label="احتفال إنجاز المدرسة" aria-busy={!ready}>
  <section className="bm-scene" style={{...(geometry?{width:geometry.width,height:geometry.height,...(wide?{position:'absolute',left:geometry.left,top:geometry.top}:{})}:{}),'--bw-faheem':`url("${data.schoolBackpackEnabled===false?'/picture-quest/body-faheem-front-v1.webp':SCHOOL_FAHEEM_ART}")`}}>
   <h2 className="bm-heading" style={overlays.heading}>المدرسة</h2>
   <span className="sc-bell" aria-hidden="true"/><span className="bm-door bm-door-left" aria-hidden="true"/><span className="bm-door bm-door-right" aria-hidden="true"/>
   {data.schoolFaheemEnabled!==false&&<div className="bw-faheem" style={wide?{width:geometry.width*.20}:undefined} aria-hidden="true"><span className="bw-shadow"/><span className="bw-pose bw-rest"/></div>}
   <div className="bw-gate-foreground" aria-hidden="true"/>
   {data.schoolAlbumEnabled!==false&&<div className="bw-album" style={overlays.album} aria-label="ألبوم الإنجازات" aria-hidden="true"><div className="bw-book"><div className="bw-page"><span className="bw-album-title">ألبوم إنجازاتي</span>{data.schoolBadgeEnabled!==false&&<><span className="bw-slot"><Award aria-hidden="true"/></span><span className="bw-album-label">بطل المدرسة</span></>}</div><div className="bw-page bw-other"><span className="bw-book-stars" aria-hidden="true">✦</span><span>رحلة جديدة تنتظرك</span></div></div></div>}
   {data.schoolBadgeEnabled!==false&&<div className="bw-badge" style={overlays.badge} aria-hidden="true"><Award/><span>بطل<br/>المدرسة</span></div>}
   <p className="bm-message" style={overlays.message} role="status" aria-live="polite">{message}</p>
   {blocked&&<button type="button" className="pqschool-audio" style={overlays.audio} onClick={()=>play(blocked)}>استمع إلى التهنئة</button>}{settled&&<div className="bm-actions" style={overlays.actions}><button type="button" className="bm-complete" onClick={()=>hasNext?callbacks.current.onNext?.():callbacks.current.onClose?.()}>{hasNext?'العالم التالي ←':'العودة إلى المراحل ←'}</button></div>}
  </section>
 </div>;
}
