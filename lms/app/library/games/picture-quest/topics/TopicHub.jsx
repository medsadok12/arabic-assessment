'use client';
import{useCallback,useEffect,useRef,useState}from'react';
import Link from'next/link';
import{childFetch,getActiveChildTab}from'../../../../../lib/child-fetch';
import{displayNumber}from'../../../../../lib/display-number';
import TopicPlay from'./TopicPlay';
import WorldCard,{worldStyle,currentStage}from'./WorldCard';
import'./topics.css';
import'./worlds.css';


export default function TopicHub({staff}){
 const[data,setData]=useState(null),[error,setError]=useState(''),[selection,setSelection]=useState(null),[tick,setTick]=useState(0),[child,setChild]=useState(()=>getActiveChildTab()),[topicId,setTopicId]=useState(null),[stageId,setStageId]=useState(null);
 const selectionChild=useRef(child),heading=useRef(null),worldButtons=useRef(new Map()),focusDetail=useRef(false),restoreTopic=useRef(null);
 useEffect(()=>{const focus=()=>setChild(getActiveChildTab());window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus)},[]);
 useEffect(()=>{let live=true;setError('');setData(null);childFetch('/api/games/picture-quest/topics',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(live)setData(d)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[tick,child]);
 useEffect(()=>{setSelection(null);setTopicId(null);setStageId(null)},[child]);
 useEffect(()=>{if(selection)return;if(focusDetail.current&&topicId){heading.current?.focus({preventScroll:true});focusDetail.current=false;}else if(!topicId&&restoreTopic.current){worldButtons.current.get(restoreTopic.current)?.focus({preventScroll:true});restoreTopic.current=null;}},[topicId,data,selection]);
 const exit=useCallback(()=>{setSelection(null);setStageId(null);setTick(x=>x+1)},[]);
 function openTopic(id,stage=null){focusDetail.current=true;setTopicId(id);setStageId(stage);}
 function closeTopic(){restoreTopic.current=topicId;setTopicId(null);setStageId(null);}
 function beginStage(next){selectionChild.current=child;setSelection(next);}
 if(selection&&data&&selectionChild.current===child)return <TopicPlay key={child} selection={selection} settings={data.settings} onExit={exit}/>;
 const topic=data?.topics.find(t=>t.id===topicId),active=topic&&(topic.stages.find(s=>s.stage===stageId)||currentStage(topic));
 const showProgress=data?.settings.controls?.progress!==false,showScore=data?.settings.controls?.score!==false;
 const resumeTopic=data?.topics.find(t=>t.id===data.resume?.topicId&&t.stages.some(s=>s.stage===data.resume.stage&&s.resume))||data?.topics.find(t=>t.stages.some(s=>s.resume));
 const resumeStage=resumeTopic&&(resumeTopic.stages.find(s=>s.stage===data.resume?.stage&&s.resume)||resumeTopic.stages.find(s=>s.resume));
 const resumeFinal=!resumeTopic&&data?.final.resume&&data.final.ready&&data.final.unlocked;
 const final=data?.final,canFinal=!!final?.unlocked&&!!final?.ready;
 function finalCaption(){return !final.unlocked?'أكمل العوالم لفتحه':!final.ready?'كلمات التحدّي قيد التجهيز':final.completed?'أكملت التحدّي ✓':final.resume?'مغامرتك بانتظارك':'التحدّي جاهز لك!';}
 return <div className={'pqb pqw'+(data?.hubDepthEnabled===false?' pqw-flat':'')+(data?.settings.animate===false?' pqw-no-motion':'')} dir="rtl">
  <nav className="pqb-links pqw-tools"><Link href="/library">← المكتبة</Link><Link href="/library/games/picture-quest?classic=1">التدريب الأصلي</Link>{staff&&<Link href="/library/games/picture-quest/topics/manage">✎ بنك الكلمات والموضوعات</Link>}</nav>
  <div className="pqw-window"><header className="pqw-header"><div className="pqw-brand"><span className="pqw-logo" aria-hidden="true">ع</span><div><h1>{data?.title||'مغامرات الكلمات'}</h1><small>اكتشف الصورة</small></div></div>{data&&!staff&&showScore&&Number.isFinite(data.points)&&<span className="pqw-score">⭐ {displayNumber(data.points)} نقطة</span>}{staff&&<span className="pqw-staff">معاينة المعلّم</span>}</header>
  <div className={'pqw-main'+(topic?' pqw-detail':'')}>
   {error&&<p className="pqb-notice" role="alert">{error}<button type="button" onClick={()=>setTick(x=>x+1)}>أعد المحاولة</button></p>}
   {!data&&!error&&<p role="status">نجهّز العوالم…</p>}
   {data&&!data.enabled&&<p className="pqb-notice">مغامرات الكلمات متوقفة حاليًا. يمكنك متابعة التدريب الأصلي.</p>}
   {data?.enabled&&(topic&&active?<>
    <button ref={heading} type="button" className="pqw-back" onClick={closeTopic}>→ كل العوالم</button>
    <div className="pqw-detail-heading" style={worldStyle(topic.id)}><span className="pqw-icon" aria-hidden="true">{topic.emoji||'✦'}</span><div><h2>{topic.title}</h2><p>30 كلمة · 3 مراحل</p></div></div>
    <div className="pqw-path" role="group" aria-label={'مراحل '+topic.title}>{topic.stages.map(s=><button type="button" key={s.stage} className={'pqw-step'+(s.completed?' completed':'')} disabled={!staff&&!s.unlocked} aria-pressed={s.stage===active.stage} onClick={()=>setStageId(s.stage)} aria-label={'المرحلة '+displayNumber(s.stage)+'، '+displayNumber(s.target)+' كلمات'+(s.completed?'، مكتملة':!s.unlocked?'، مقفلة':'')}><b aria-hidden="true">{s.completed?'✓':s.unlocked||staff?displayNumber(s.stage):'🔒'}</b><strong>المرحلة {displayNumber(s.stage)}</strong><small>{displayNumber(s.target)} كلمات</small></button>)}</div>
    <section className="pqw-current" aria-label="المرحلة المختارة"><span className="pqw-current-label">{active.completed?'✓ مرحلة أنجزتها':'✦ محطّتك الحالية'}</span><h3>{active.completed?'أحسنت! يمكنك مراجعتها':!active.ready?'المغامرة قيد التجهيز':active.resume?'لنُكمل ما بدأناه':'جاهز لاكتشاف كلمات جديدة؟'}</h3><p>{active.completed?'أعد هذه المرحلة للمراجعة، بلا نقاط إضافية.':!active.ready?'ستتاح هذه المرحلة بعد اكتمال كلماتها وصورها.':'المرحلة '+displayNumber(active.stage)+' · '+displayNumber(active.target)+' كلمات من عالم '+topic.title}</p>
     {showProgress&&<div className="pqw-current-progress"><div className="pqw-meter" role="progressbar" aria-label="تقدّم المرحلة" aria-valuemin={0} aria-valuemax={active.target} aria-valuenow={active.completed?active.target:active.index}><i style={{width:Math.min(100,(active.completed?1:active.index/active.target)*100)+'%'}}/></div><span>{displayNumber(active.completed?active.target:active.index)} / {displayNumber(active.target)}</span></div>}
     {staff?<Link className="pqw-primary" href={'/library/games/picture-quest/topics/manage?topic='+topic.id+'&stage='+active.stage}>معاينة وإعداد المرحلة ←</Link>:<button type="button" className="pqw-primary" disabled={!active.ready||!active.unlocked} onClick={()=>beginStage({topicId:topic.id,stage:active.stage})}>{!active.ready?'قيد التجهيز':active.completed?'راجع المرحلة ←':active.resume?'واصل المغامرة ←':'ابدأ المغامرة ←'}</button>}
    </section><p className="pqw-note">تُفتح كل مرحلة بعد إكمال المرحلة السابقة.<br/>المراحل المكتملة تبقى محفوظة.</p>
   </>:<>
    <div className="pqw-intro"><h2>عالم جديد بانتظارك!</h2><p>اختر موضوعًا، واكتشف كلماته بالصور.</p></div>
    {!staff&&(resumeTopic&&resumeStage||resumeFinal)&&<div className="pqw-resume"><span className="pqw-resume-icon" aria-hidden="true">{resumeTopic?.emoji||'🏆'}</span><div><strong>{resumeFinal?'نكمل تحدّي الأذكياء؟':'نكمل مغامرة '+resumeTopic.title+'؟'}</strong><small>{resumeFinal?'وصلت إلى '+displayNumber(final.index)+' من '+displayNumber(final.total):'المرحلة '+displayNumber(resumeStage.stage)+' · أنجزت '+displayNumber(resumeStage.index)+' من '+displayNumber(resumeStage.target)}</small></div><button type="button" className="pqw-primary" onClick={()=>resumeFinal?beginStage({topicId:'final',stage:4}):openTopic(resumeTopic.id,resumeStage.stage)}>واصل ←</button></div>}
    <div className="pqw-section-label"><h3>اختر عالمك</h3><span>3 مراحل في كل عالم</span></div>
    <div className="pqw-grid">{data.topics.map(t=><WorldCard key={t.id} topic={t} showProgress={showProgress} onOpen={openTopic} ref={el=>{if(el)worldButtons.current.set(t.id,el);else worldButtons.current.delete(t.id)}}/>)}
     {final?.enabled&&(staff?<Link className="pqw-world pqw-challenge" style={worldStyle('final')} href="/library/games/picture-quest/topics/manage"><span className="pqw-world-top"><span className="pqw-icon" aria-hidden="true">🏆</span><strong>تحدّي الأذكياء</strong></span><small>3 كلمات جديدة من كل عالم</small><span className="pqw-final-caption">معاينة وإعداد التحدّي ←</span></Link>:<button type="button" className="pqw-world pqw-challenge" style={worldStyle('final')} disabled={!canFinal} onClick={()=>beginStage({topicId:'final',stage:4})} aria-label={'تحدّي الأذكياء، '+finalCaption()}><span className="pqw-world-top"><span className="pqw-icon" aria-hidden="true">🏆</span><strong>تحدّي الأذكياء</strong></span><small>3 كلمات جديدة من كل عالم</small><span className="pqw-final-caption">{canFinal?'✦':'🔒'} {finalCaption()}</span></button>)}
    </div>
    {!data.topics.length&&<p className="pqw-note">العوالم قيد التجهيز. عد قريبًا لمغامرة جديدة.</p>}
    {data.reviewEnabled&&<section className="pqw-review"><div><strong>✦ رحلة المراجعة</strong><p>كلمات تعلّمتها، بلا نقاط جديدة.</p></div><button type="button" disabled={staff||!data.reviewCount} onClick={()=>beginStage({topicId:'review',stage:1})}>راجع كلماتي ←</button></section>}
   </>)}
  </div></div>
 </div>;
}
