'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {childFetch,getActiveChildTab} from '../../../../lib/child-fetch';
import {freshFetch,freshUrl} from '../../../../lib/fresh-fetch';
import {activeSentences,publicSentence,sentenceRight,sentenceHint,sentenceRequestId} from '../../../../lib/sentence-builder';
import {sentenceAudio} from '../../../../lib/sentence-builder-audio';
import './sentence.css';
const requestId=sentenceRequestId;
export default function Game({initialContent=null,staff=false,previewConfig=null,previewIndex=0}){
 const [content,setContent]=useState(initialContent),[session,setSession]=useState(null),[picked,setPicked]=useState([]),[phase,setPhase]=useState('loading'),[message,setMessage]=useState(''),[points,setPoints]=useState(null),[muted,setMuted]=useState(false),[reward,setReward]=useState(0),[sentence,setSentence]=useState(''),[retry,setRetry]=useState(false),[listening,setListening]=useState(false),[heard,setHeard]=useState(false);
 const config=previewConfig||content?.config,settings=config?.settings,question=session?.question,preview=staff||Boolean(previewConfig);
 const configRef=useRef(config);configRef.current=config;
 const busy=useRef(false),generation=useRef(0),identity=useRef(null),pending=useRef(null),player=useRef(null),motion=useRef(null),finishFrom=useRef([]),answerRef=useRef(null),bankRef=useRef(null),sentenceRef=useRef(null),previewCursor=useRef(previewIndex),live=useRef(true),again=useRef(false);
 const reduced=()=>!settings?.animate||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function audio(){return player.current ||=sentenceAudio()}
 function fx(kind,step=0){if(muted||!settings?.sound){player.current?.stop();return}const url=settings.sounds?.[kind];if(!url){if(kind!=='wrong')audio().effect(kind,step);return}audio().clip(url).then(ok=>{if(ok===false&&kind!=='wrong'&&live.current)audio().effect(kind,step)})}
 async function api(body){const response=await childFetch('/api/games/sentence-builder/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json();if(!response.ok)throw new Error(data.error||'أعد المحاولة.');return data}
 function install(data){setSession(data);setListening(false);setHeard(false);setPicked([]);setPoints(data.points);setPhase(data.finished?'finish':'play');setMessage('');setRetry(false);setSentence('');setReward(0);pending.current=null}
 // mode==='replay': «العب مجدداً» بعد إكمال كل الجمل — جولة مراجعة بلا نقاط جديدة (الخادم يقرر)
 async function begin(mode){
  if(busy.current)return;const action=mode==='replay'?'replay':'start';busy.current=true;const token=++generation.current;setPhase('loading');player.current?.stop();
  try{const current=configRef.current;if(preview){if(!current)return;const items=activeSentences(current),item=items[previewCursor.current];install({finished:!item,question:item?publicSentence(item):null,index:previewCursor.current,total:items.length,points:null});return}
   let data=await api({action});
   // الوصول من زر «العب مجدداً» في المكتبة (?again=1) يبدأ المراجعة مباشرة بدل شاشة «أكملت»
   if(action==='start'&&data.finished&&again.current){again.current=false;if(live.current&&token===generation.current)data=await api({action:'replay'})}
   if(live.current&&token===generation.current)install(data);
  }catch(e){if(token===generation.current){setMessage(e.message||'لنفتح التدريب من جديد.');setPhase('load-error')}}finally{if(token===generation.current)busy.current=false}
 }
 useEffect(()=>{live.current=true;busy.current=false;identity.current=getActiveChildTab();let seq=0;
  try{const q=new URLSearchParams(window.location.search);if(q.get('again')==='1'){again.current=true;q.delete('again');window.history.replaceState(window.history.state,'',window.location.pathname+(q.toString()?'?'+q:''))}}catch{}
  async function refresh(){if(document.hidden)return;const tick=++seq,scope=getActiveChildTab();if(scope!==identity.current){identity.current=scope;generation.current++;busy.current=false;setSession(null);setPoints(null);pending.current=null;await begin()}
   if(previewConfig)return;
   try{const r=await freshFetch('/api/games/sentence-builder'),d=await r.json();if(!r.ok)throw new Error();if(live.current&&tick===seq)setContent(d);if(!preview){const b=await childFetch(freshUrl('/api/points'));const p=await b.json();if(live.current&&tick===seq&&scope===getActiveChildTab()&&b.ok)setPoints(p.points)}}catch{if(live.current&&!configRef.current){setMessage('لنفتح التدريب من جديد.');setPhase('load-error')}}
  }
  function visibility(){if(document.hidden)player.current?.stop();else refresh()}
  if(initialContent||previewConfig)begin();else refresh();
  const interval=setInterval(refresh,15000);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visibility);
  return()=>{live.current=false;busy.current=false;generation.current++;seq++;clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visibility);player.current?.dispose();player.current=null};
 },[]);
 useEffect(()=>{if(config&&phase==='loading'&&!session&&!busy.current)begin()},[config]);
 // أصوات المعلم تُجلب مسبقًا لتُسمع فور اللمس
 const soundUrls=settings?.sound?Object.values(settings.sounds||{}).filter(Boolean).join('\n'):'';
 useEffect(()=>{if(soundUrls)(player.current ||=sentenceAudio()).preload(soundUrls.split('\n'))},[soundUrls]);
 useLayoutEffect(()=>{
  if(!question||reduced())return;
  if(motion.current){const {slot,from,target}=motion.current,container=target==='answer'?answerRef.current:bankRef.current,to=container?.querySelector(`[data-slot="${slot}"]`);motion.current=null;if(to&&from){const d=to.getBoundingClientRect();to.animate([{transform:`translate(${from.left-d.left}px,${from.top-d.top}px) scale(.92)`},{transform:'translate(0,-12px) scale(1.06)',offset:.72},{transform:'translate(0,3px) scale(.98)',offset:.89},{transform:'translate(0,0) scale(1)'}],{duration:500*settings.speed,easing:'ease-out'})}}
  if(phase==='right'&&sentenceRef.current){const box=sentenceRef.current;box.animate([{transform:'scale(.97)'},{transform:'scale(1.025)',offset:.65},{transform:'scale(1)'}],{duration:550*settings.speed,easing:'ease-out'});box.querySelectorAll('span').forEach((span,i)=>{const d=span.getBoundingClientRect(),from=finishFrom.current[i]||d;span.animate([{transform:`translate(${from.left-d.left}px,${from.top-d.top}px)`},{transform:'translate(0,-9px) scale(1.08)',offset:.7},{transform:'translate(0,0) scale(1)'}],{duration:460*settings.speed,delay:i*90*settings.speed,fill:'backwards',easing:'ease-out'})})}
 },[picked,phase,sentence]);
 const interactive=phase==='play'||phase==='wrong';
 // الصورة زر الاستماع: حلقات تدعو للضغط حتى أول استماع لكل جملة، وموجات أثناء القراءة؛ الضغط أثناء القراءة لا يعيدها من أولها
 async function listen(){if(!question?.audio_url||listening)return;setHeard(true);setListening(true);setMessage('');if(await audio().recording(question.audio_url,()=>{if(live.current)setListening(false)})===false&&live.current)setMessage('أعد الضغط على الصورة للاستماع.')}
 function choose(slot,event,remove=false){if(!interactive||busy.current||retry||!question)return;if(!remove&&picked.length>=question.length)return;motion.current={slot,from:event.currentTarget.getBoundingClientRect(),target:remove?'bank':'answer'};setPicked(remove?picked.filter(x=>x!==slot):[...picked,slot]);setPhase('play');setMessage('');fx(remove?'undo':'tap',picked.length)}
 async function check(){
  if(busy.current||!question)return;
  if(phase==='right'){previewCursor.current++;await begin();return}
  if(picked.length!==question.length)return;busy.current=true;setPhase('checking');setMessage('');const token=generation.current;
  finishFrom.current=[...answerRef.current.querySelectorAll('button')].map(el=>el.getBoundingClientRect());
  const body=pending.current||{action:'answer',sessionId:session.sessionId,requestId:requestId(),slots:picked};pending.current=body;
  try{let data;if(preview){const item=activeSentences(config)[session.index];data={right:sentenceRight(item,picked),sentence:item.words.join(' ')+item.end,reward:settings.reward,points:null}}else data=await api(body);if(!live.current||token!==generation.current)return;
   pending.current=null;setRetry(false);setPoints(data.points);if(data.right){setSentence(data.sentence);setReward(data.reward);setPhase('right');fx('success');window.dispatchEvent(new Event('points-updated'))}else{setPhase('wrong');setMessage(settings.retryText);fx('wrong')}
  }catch(e){if(token===generation.current){setRetry(true);setPhase('play');setMessage(e.message||'أعد تأكيد الجملة.')}}finally{if(token===generation.current)busy.current=false}
 }
 async function help(){
  if(busy.current||!interactive||retry||!question)return;busy.current=true;setPhase('helping');setMessage('');const token=generation.current;
  try{let data;if(preview){const hint=sentenceHint(activeSentences(config)[session.index],picked,settings.hintMode);if(!hint){setPhase('play');setMessage('جرّب ترتيب الجملة ثم اضغط تحقّق.');return}data={state:'done',slots:hint.slots,points:null}}else data=await api({action:'hint',sessionId:session.sessionId,slots:picked,expectedCost:settings.helpCost});if(!live.current||token!==generation.current)return;setPoints(data.points);
   if(data.state==='cost_changed'){setContent(old=>({...old,config:{...old.config,settings:{...old.config.settings,helpCost:data.cost}}}));setMessage('تغيّرت تكلفة المساعدة إلى '+data.cost+' نقاط. اضغط مجدّدًا إن رغبت.');setPhase('play');return}
   if(data.state==='insufficient'){setMessage('اجمع نقاطًا أكثر من الألعاب ثم عد للمساعدة ⭐');setPhase('play');return}
   const slot=data.slots.at(-1),from=bankRef.current.querySelector(`[data-slot="${slot}"]`)?.getBoundingClientRect();motion.current={slot,from,target:'answer'};setPicked(data.slots);setPhase('play');fx('tap',data.slots.length-1);window.dispatchEvent(new Event('points-updated'));
  }catch(e){if(token===generation.current){setMessage(e.message||'أعد الضغط على المساعدة.');setPhase('play')}}finally{if(token===generation.current)busy.current=false}
 }
 const style=settings?{'--sb-bg':settings.background,'--sb-ink':settings.ink,'--sb-gold':settings.gold,'--sb-selected':settings.selected,'--sb-success':settings.success,'--sb-picture':`${settings.pictureSize}px`,'--sb-word':`${settings.wordSize}px`}:{};
 return <div className="sb-wrap" dir="rtl" style={style}>
  {staff&&!previewConfig&&<div className="sb-staff"><Link href="/library/games/sentence-builder/manage">⚙ تعديل التدريب</Link><span>معاينة بلا خصم نقاط أو تسجيل نتائج</span></div>}
  <section className={`sb-app ${phase==='right'?'sb-right':''}${settings&&!settings.animate?' sb-still':''}`} aria-label={config?.title||'تدريب بناء الجملة'}>
   {phase==='loading'||phase==='load-error'?<div className="sb-loading"><p role="status">{message||'نجهّز كلماتك…'}</p>{phase==='load-error'&&<button onClick={begin}>أعد المحاولة ↻</button>}</div>:phase==='finish'?<div className="sb-finish"><div aria-hidden="true">🏆</div><h1>{settings?.finishText}</h1><p>أكملتَ جميع الجمل المتاحة.</p>{preview?<button onClick={()=>{previewCursor.current=0;begin()}}>نجرّب من جديد ↻</button>:<><button onClick={()=>begin('replay')}>العب مجدداً ↻</button><Link href="/library">العودة للألعاب ←</Link></>}</div>:question&&<>
    <div className="sb-main"><div className="sb-top"><button className="sb-sound" aria-label={muted?'تشغيل المؤثرات':'كتم الأصوات'} aria-pressed={muted} onClick={()=>{setMuted(!muted);player.current?.stop()}}>{muted?'🔇':'🔊'}</button><div className="sb-progress" role="progressbar" aria-label="تقدم التدريب" aria-valuemin={0} aria-valuemax={session.total} aria-valuenow={session.index+(phase==='right'?1:0)}><div style={{width:`${(session.index+(phase==='right'?1:0))/session.total*100}%`}}/></div><span className="sb-count" dir="ltr">{session.index+1} / {session.total}</span></div>
    <h1>{question.audio_url?config.title:config.title.replace(/^استمع و/,'')}</h1>{config.subtitle&&<p className="sb-subtitle">{config.subtitle}</p>}{session.review&&<p className="sb-review">🔁 جولة مراجعة: تدرّب واستمتع، ونجومك السابقة محفوظة ⭐</p>}
    <div className={'sb-dialogue'+(question.audio_url?' sb-dialogue-listen':'')}>{question.audio_url?<><button type="button" className={'sb-picture sb-picture-btn'+(listening?' sb-playing':heard?'':' sb-invite')} aria-label={'اضغط الصورة لتسمع الجملة: '+question.alt} onClick={listen}>{question.image_url?<img src={question.image_url} alt=""/>:<span aria-hidden="true">{question.emoji}</span>}<span className="sb-badge" aria-hidden="true">{listening?<span className="sb-bars"><i/><i/><i/><i/></span>:'🔊'}</span></button><p className="sb-listen-cap" aria-live="polite">{listening?'🎧 استمع جيدًا…':heard?'👆 اضغط الصورة لتسمع مرة أخرى':'👆 اضغط الصورة لتسمع'}</p></>:<div className="sb-picture" role="img" aria-label={question.alt}>{question.image_url?<img src={question.image_url} alt=""/>:question.emoji}</div>}</div>
    <div className="sb-answer" aria-label="جملتك" ref={answerRef}>{phase==='right'?<p className="sb-sentence" ref={sentenceRef}>{sentence.split(' ').map((w,i)=><span key={i}>{w}{i<sentence.split(' ').length-1?' ':''}</span>)}</p>:picked.map(slot=><button key={slot} data-slot={slot} className="sb-word" disabled={!interactive||retry} aria-label={'إعادة كلمة '+question.bank[slot]} onClick={e=>choose(slot,e,true)}>{question.bank[slot]}</button>)}</div>
    <div className="sb-bank" aria-label="الكلمات المتاحة" ref={bankRef}>{question.bank.map((word,slot)=><button key={slot} data-slot={slot} className={'sb-word'+(picked.includes(slot)?' sb-used':'')} aria-label={'اختيار '+word} disabled={!interactive||retry||picked.includes(slot)||picked.length>=question.length} onClick={e=>choose(slot,e)}>{word}</button>)}</div>
    {settings.hintMode!=='off'&&phase!=='right'&&<div className="sb-help-row"><button className="sb-help" disabled={!interactive||retry} onClick={help}>💡 {settings.helpText}</button><span>{settings.helpCost===0||session.review?'مجانًا':<><bdi>{settings.helpCost}</bdi> نقاط لكل مساعدة</>}</span></div>}
    <div className="sb-wallet">{preview?'معاينة المعلم':<><span aria-hidden="true">⭐ </span><bdi>{points??'…'}</bdi></>}</div></div>
    <div className="sb-action"><div className="sb-feedback" role="status" aria-live="polite">{phase==='right'?<>✓ {settings.successText}{(reward>0||preview)&&<> <strong dir="rtl">+<bdi>{reward}</bdi> نقاط ⭐{preview?' (معاينة)':''}</strong></>}</>:message}</div><button className="sb-cta" disabled={phase!=='right'&&(!interactive||picked.length!==question.length)} onClick={check}>{phase==='right'?settings.nextText+' ←':retry?'أعد التأكيد ↻':settings.checkText}</button>{retry&&<button className="sb-refresh" onClick={()=>{pending.current=null;begin()}}>جدّد التدريب</button>}</div>
   </>}
  </section>
 </div>;
}
