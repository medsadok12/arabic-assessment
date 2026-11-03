'use client';
import{useEffect,useMemo,useRef,useState}from'react';
import{Check,Flag,LocateFixed,LockKeyhole,MoveVertical}from'lucide-react';
import{displayNumber}from'../../../../../lib/display-number';
import{journeyGeometry}from'../../../../../lib/picture-quest-journey';
import{createQuestMapPan}from'../../../../../lib/picture-quest-map-client';
import JourneyArt from'./JourneyArt';
import JourneyScenery from'./JourneyScenery';
import'./journey.css';
let atlasPromise;
function loadAtlas(){if(!atlasPromise)atlasPromise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>Promise.resolve(image.decode?.()).catch(()=>{}).then(resolve);image.onerror=()=>{atlasPromise=null;reject(Error('image'))};image.src='/picture-quest/journey-worlds-v1.webp';});return atlasPromise;}
export default function JourneyMap({data,staff=false,onOpen,onFinal,positionRef,worldButtons}){
 const viewport=useRef(null),terrain=useRef(null),pan=useRef(null),keyboard=useRef(false),ownPosition=useRef(null),position=positionRef||ownPosition;
 const[size,setSize]=useState({width:375,height:560}),[region,setRegion]=useState('الغابة'),[art,setArt]=useState('loading'),[retry,setRetry]=useState(0),[dragged,setDragged]=useState(false),[notice,setNotice]=useState(''),[celebrating,setCelebrating]=useState(false);
 const timer=useRef(null),topics=data.topics||[],final=data.final,scenery=data.journeyScenery!==false,effects=data.journeyEffects!==false&&data.settings.animate!==false,showProgress=data.settings.controls?.progress!==false;
 const entries=useMemo(()=>[...topics,...(final?.enabled?[{id:'final',title:'الأذكياء',completed:final.completed,unlocked:final.unlocked&&final.ready,final:true}]:[])],[topics,final]);
 const geometry=useMemo(()=>journeyGeometry(entries.length,size.width,size.height),[entries.length,size]);
 const done=topics.filter(t=>t.completed||t.stages?.every(s=>s.completed)).length;
 const candidate=entries.findIndex(t=>!t.completed&&(staff||t.unlocked!==false)),current=candidate<0?Math.max(0,entries.length-1):candidate,target=entries[current];
 const needsAtlas=scenery||entries.some(t=>!t.final&&t.mapImageEnabled!==false&&!t.map_image_url);
 useEffect(()=>{let live=true;if(!needsAtlas){setArt('ready');return;}setArt('loading');const timeout=setTimeout(()=>{if(live)setArt('failed')},12000);loadAtlas().then(()=>{if(live){clearTimeout(timeout);setArt('ready')}}).catch(()=>{if(live){clearTimeout(timeout);setArt('failed')}});return()=>{live=false;clearTimeout(timeout)}},[needsAtlas,retry]);
 useEffect(()=>{const v=viewport.current;const resize=()=>{const w=v.clientWidth,h=v.clientHeight;if(w&&h)setSize(old=>old.width===w&&old.height===h?old:{width:w,height:h})};resize();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);observer?.observe(v);window.addEventListener('resize',resize);return()=>{observer?.disconnect();window.removeEventListener('resize',resize)}},[]);
 const restore=useRef(null);
 useEffect(()=>{
  const previous=position.current,won=previous?.done!==undefined&&done>previous.done;
  if(won)restore.current={locate:true};else if(restore.current===null)restore.current={ratio:previous?.ratio};
  position.current={...position.current,done};
  if(won&&effects){setCelebrating(true);const id=setTimeout(()=>setCelebrating(false),900);return()=>clearTimeout(id)}
 },[done,effects,position]);
 useEffect(()=>{
  const controller=createQuestMapPan(viewport.current,terrain.current,{geometry,animate:effects,onPosition:ratio=>{position.current={...position.current,ratio}},onRegion:setRegion,onDrag:()=>setDragged(true),keyboard:()=>keyboard.current});pan.current=controller;
  const saved=restore.current;
  if(saved?.ratio!==undefined&&!saved.locate)controller.setGeometry(geometry,saved.ratio);else controller.locate(current,false);
  restore.current={ratio:undefined};
  return()=>{controller.dispose();restore.current={ratio:position.current?.ratio};pan.current=null;};
 },[geometry,effects,position,done,current]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 function open(t){
  if(!staff&&t.unlocked===false){const previous=topics[Math.max(0,topics.findIndex(x=>x.id===t.id)-1)];setNotice(t.final?'أكمل العوالم لنصل إلى تحدّي الأذكياء!':'أكمل عالم '+(previous?.title||'المحطة السابقة')+' أولًا، ثم نكمل المغامرة.');clearTimeout(timer.current);timer.current=setTimeout(()=>setNotice(''),2600);return;}
  if(t.final)onFinal?.();else onOpen?.(t.id);
 }
 return <section className={'pqj-map'+(!effects?' pqj-still':'')+(art!=='ready'?' pqj-no-art':'')} aria-label="خريطة العوالم" onKeyDownCapture={()=>{keyboard.current=true}}>
  <div className="pqj-map-meta"><span>{region}</span>{showProgress&&<span className="pqj-total" aria-label="العوالم المكتملة"><Flag aria-hidden="true"/>{displayNumber(done)} / {displayNumber(topics.length)}</span>}</div>
  <div ref={viewport} className="pqj-viewport" aria-label="اسحب الخريطة رأسيًا لاستكشاف العوالم" onPointerDownCapture={()=>{keyboard.current=false}}>
   <div ref={terrain} className="pqj-terrain" style={{height:geometry.height}}>
    <JourneyScenery geometry={geometry} scenery={scenery&&art==='ready'} path={data.journeyPath!==false} completed={done}/>
    <div className="pqj-nodes">{entries.map((t,i)=>{const status=t.completed?'completed':!staff&&t.unlocked===false?'locked':i===current?'current':'available';return <button ref={el=>{if(worldButtons){if(el)worldButtons.current.set(t.id,el);else worldButtons.current.delete(t.id)}}} key={t.id} type="button" className={'pqj-node '+status} data-journey-index={i} aria-disabled={!staff&&t.unlocked===false} aria-label={t.title+(status==='completed'?'، مكتمل':status==='locked'?'، مقفل':'، متاح')} style={{left:geometry.points[i].x,top:geometry.points[i].y}} onClick={()=>open(t)}>
     <span className="pqj-node-art"><JourneyArt topic={t}/>{(t.mapImageEnabled===false||art!=='ready')&&<span className="pqj-art-fallback" aria-hidden="true">{displayNumber(i+1)}</span>}{status==='locked'?<span className="pqj-status"><LockKeyhole aria-hidden="true"/></span>:status==='completed'?<span className="pqj-status"><Check aria-hidden="true"/></span>:null}</span><strong className="pqj-node-label">{t.title}</strong>
    </button>})}</div>
   </div>
   {art==='loading'&&<div className="pqj-loading" role="status">نجهّز المغامرة…</div>}
   {art==='failed'&&<button data-map-control type="button" className="pqj-retry" onClick={()=>setRetry(n=>n+1)}>أعد تحميل الرسوم</button>}
   {!dragged&&art==='ready'&&<span className="pqj-drag-label"><MoveVertical aria-hidden="true"/>اسحب لاستكشاف الطريق</span>}
   <button type="button" data-map-control className="pqj-locate" onClick={()=>pan.current?.locate(current)}><LocateFixed aria-hidden="true"/>موقعي</button>
   {notice&&<p className="pqj-notice" role="status">{notice}</p>}
   {celebrating&&<div className="pqj-celebration" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--dx':Math.cos(i*2.4)*(70+i*8)+'px','--dy':Math.sin(i*2.4)*(70+i*7)+'px'}}/>)}</div>}
  </div>
  {target&&<footer className="pqj-footer"><div><small>{done===topics.length?'محطّتك الأخيرة':'محطّتك الحالية'}</small><strong>{target.title}</strong></div><button type="button" className="pqf-go" onClick={()=>{pan.current?.locate(current);open(target)}}>{staff?'معاينة':target.completed?'راجع':'ابدأ'} ←</button></footer>}
  {!topics.length&&<p className="pqf-status">العوالم قيد التجهيز. عد قريبًا لمغامرة جديدة.</p>}
 </section>;
}
