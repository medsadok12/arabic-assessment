'use client';
import{useEffect,useRef,useState}from'react';
import{Award}from'lucide-react';
import{BODY_CELEBRATION_ART,BODY_FAHEEM_ART,animateBodyCelebration}from'../../../../../lib/picture-quest-body-celebration';
import'./body-celebration.css';
export default function BodyCelebration({data,onClose,onNext,hasNext=false}){
 const host=useRef(null),callbacks=useRef({onClose,onNext}),[size,setSize]=useState(null),[ready,setReady]=useState(false),[message,setMessage]=useState('أكملت رحلة أعضاء الجسم!'),[settled,setSettled]=useState(false);
 callbacks.current={onClose,onNext};
 useEffect(()=>{const el=host.current,update=()=>{const w=Math.min(el.clientWidth,el.clientHeight*870/1808);setSize({width:w,height:w*1808/870})};update();const ro=new ResizeObserver(update);ro.observe(el);return()=>ro.disconnect()},[]);
 useEffect(()=>{let live=true;const images=[BODY_CELEBRATION_ART,BODY_FAHEEM_ART,'/picture-quest/body-scene-v3.webp'];Promise.all(images.map(src=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=src;if(img.complete)resolve()}))).then(()=>{if(live)setReady(true)});return()=>{live=false}},[]);
 useEffect(()=>{if(!ready)return;return animateBodyCelebration(host.current,{data,reduced:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,onMessage:setMessage,onSettled:()=>setSettled(true)});},[ready,data]);
 return <div ref={host} className="pbc-shell" aria-label="احتفال إنجاز أعضاء الجسم" aria-busy={!ready}>
  <section className="bm-scene" style={size||undefined}>
   <h2 className="bm-heading">أعضاء الجسم</h2>
   <span className="bm-door bm-door-left" aria-hidden="true"/><span className="bm-door bm-door-right" aria-hidden="true"/>
   {data.bodyFaheemEnabled!==false&&<div className="bw-faheem" aria-hidden="true"><span className="bw-shadow"/><span className="bw-pose bw-rest"/></div>}
   <div className="bw-gate-foreground" aria-hidden="true"/>
   {data.bodyAlbumEnabled!==false&&<div className="bw-album" aria-label="ألبوم الإنجازات" aria-hidden="true"><div className="bw-book"><div className="bw-page"><span className="bw-album-title">ألبوم إنجازاتي</span>{data.bodyBadgeEnabled!==false&&<><span className="bw-slot"><Award aria-hidden="true"/></span><span className="bw-album-label">بطل أعضاء الجسم</span></>}</div><div className="bw-page bw-other"><span className="bw-book-stars" aria-hidden="true">✦</span><span>رحلة جديدة تنتظرك</span></div></div></div>}
   {data.bodyBadgeEnabled!==false&&<div className="bw-badge" aria-hidden="true"><Award/><span>بطل<br/>أعضاء الجسم</span></div>}
   <p className="bm-message" role="status" aria-live="polite">{message}</p>
   {settled&&<div className="bm-actions"><button type="button" className="bm-complete" onClick={()=>hasNext?callbacks.current.onNext?.():callbacks.current.onClose?.()}>{hasNext?'العالم التالي ←':'العودة إلى المراحل ←'}</button></div>}
  </section>
 </div>;
}
