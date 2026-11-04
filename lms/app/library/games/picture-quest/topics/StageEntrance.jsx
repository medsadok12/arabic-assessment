'use client';
import{useEffect,useRef,useState}from'react';
import{Check,LockKeyhole}from'lucide-react';
import{displayNumber}from'../../../../../lib/display-number';
import JourneyArt from'./JourneyArt';
import GateCelebration from'./GateCelebration';
import FruitCelebration from'./FruitCelebration';
import SchoolCelebration,{SchoolBuilding}from'./SchoolCelebration';
import'./journey.css';
import'./entrance.css';

const ROAD='M440 350 C460 330 460 310 440 300 C410 255 160 250 160 180 C160 110 300 130 300 58 L300 0';
export default function StageEntrance({data,topic,active,staff=false,embedded=false,onChoose,onBegin,onPreview,celebrate=false,onCelebrationDone,preparing=false,imagePreparer}){
 useEffect(()=>{imagePreparer?.prepare(active.startImage)},[imagePreparer,active.startImage]);
 const [entering,setEntering]=useState(false),pending=useRef(false),timer=useRef(null);
 const [previewCelebration,setPreviewCelebration]=useState(0),[cheering,setCheering]=useState(false);
 const completed=topic.stages.length===3&&topic.stages.every(s=>s.completed);
 const animalGate=topic.id==='animals'&&topic.mapImageEnabled!==false&&!topic.map_image_url&&(topic.mapArt==null||topic.mapArt===0);
 const fruitGate=topic.id==='fruit'&&topic.mapImageEnabled!==false&&!topic.map_image_url&&(topic.mapArt==null||topic.mapArt===1);
 const schoolGate=topic.id==='school'&&topic.mapImageEnabled!==false&&!topic.map_image_url&&(topic.mapArt==null||topic.mapArt===2);
 const celebrateGate=(animalGate||fruitGate||schoolGate)&&(celebrate&&completed||previewCelebration>0);
 useEffect(()=>{setCheering(celebrateGate)},[celebrateGate]);
 function finishCelebration(){setCheering(false);onCelebrationDone?.();}
 const scenery=data.journeyScenery!==false,path=data.journeyPath!==false,effects=data.journeyEffects!==false&&data.settings.animate!==false;
 useEffect(()=>{pending.current=false;setEntering(false);return()=>{clearTimeout(timer.current);pending.current=false}},[topic.id,active.stage,effects,active.ready,active.unlocked]);
 function begin(){
  if(preparing||pending.current||!active.ready||!active.unlocked)return;
  const selection={topicId:topic.id,stage:active.stage};pending.current=true;
  if(!effects||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){onBegin?.(selection);return;}
  setEntering(true);
  onBegin?.(selection);
 }
 const status=active.completed?'مكتملة ✓':!active.ready?'قيد التجهيز':data.settings.controls?.progress!==false&&active.resume?'وصلت إلى '+displayNumber(active.index)+' من '+displayNumber(active.target):'';
 return <section className={'pqe'+(topic.id==='body'?' pqe-body':'')+(scenery?' pqe-scenery':'')+(entering?' pqe-entering':'')+(preparing?' pqe-preparing':'')+(embedded?' pqe-embedded':'')+(data.hubDepthEnabled===false?' pqe-flat':'')+(cheering?' pqe-celebrating':'')+(fruitGate&&celebrateGate?' pqe-fruit-celebrating':'')+(schoolGate&&celebrateGate?' pqe-school-celebrating':'')} aria-label={'مراحل '+topic.title} aria-busy={entering||preparing}>
  {scenery&&<div className="pqe-landscape" aria-hidden="true"><i className="pqe-land pqe-land-left"/><i className="pqe-land pqe-land-right"/><i className="pqe-land pqe-land-bottom"/>{[[20,'tree-left'],[21,'tree-right'],[22,'flowers-left'],[23,'rocks-right'],[22,'flower-small']].map(([art,place])=><span key={place} className={'pqe-prop pqe-'+place}><JourneyArt index={art}/></span>)}</div>}
  <h2 className="pqe-heading">{topic.title}</h2>
  <div className="pqe-content">
   <div className="pqe-gate">{animalGate?<GateCelebration key={previewCelebration} data={data} completed={completed} celebrate={celebrateGate} onDone={finishCelebration}/>:fruitGate?<FruitCelebration key={previewCelebration} data={data} completed={completed} celebrate={celebrateGate} onDone={finishCelebration}/>:schoolGate?<SchoolBuilding/>:<JourneyArt topic={topic}/>}</div>
   <div className="pqe-route pqf-path" role="group" aria-label={'مراحل '+topic.title}>
    {path&&<svg className="pqe-road" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true"><path d={ROAD} className="pqe-road-shadow" transform="translate(0 4)"/><path d={ROAD} className="pqe-road-fill"/><path d={ROAD} className="pqe-road-dots"/>{schoolGate&&celebrateGate&&data.schoolLightsEnabled!==false&&<path d={ROAD} className="pqs-road-light"/>}</svg>}
    {topic.stages.map(s=><button type="button" key={s.stage} className={'pqe-station pqf-step pqe-station-'+s.stage+(s.stage===active.stage?' current':'')+(s.completed?' completed':'')} disabled={preparing||entering||!staff&&!s.unlocked} aria-pressed={s.stage===active.stage} onClick={()=>onChoose?.(s.stage)} aria-label={'المرحلة '+displayNumber(s.stage)+(s.completed?'، مكتملة':!s.unlocked?'، مقفلة':'')}><b className="pqe-disc" aria-hidden="true">{displayNumber(s.stage)}{s.completed?<span className="pqe-state"><Check/></span>:!staff&&!s.unlocked?<span className="pqe-state"><LockKeyhole/></span>:null}</b></button>)}
   </div>
   {staff&&(animalGate||fruitGate||schoolGate)&&<button type="button" className="pqe-celebration-preview" disabled={preparing} onClick={()=>{setCheering(true);setPreviewCelebration(n=>n+1)}}>{schoolGate?'جرّب احتفال المدرسة':fruitGate?'جرّب احتفال الفواكه':'جرّب احتفال البوابة'}</button>}
   <div className="pqe-action pqf-action"><p className="pqe-status pqf-status" role="status">{status}</p>{staff?<button type="button" className="pqe-go pqf-go" disabled={preparing} onClick={()=>onPreview?onPreview():onBegin?.({topicId:topic.id,stage:active.stage})}>معاينة المرحلة ←</button>:<button type="button" className="pqe-go pqf-go" disabled={preparing||entering||!active.ready||!active.unlocked} onClick={begin}>{preparing?'نجهّز لعبتك…':!active.ready?'قيد التجهيز':active.completed?'راجع ←':active.resume?'واصل ←':'ابدأ ←'}</button>}</div>
  </div>
  {schoolGate&&celebrateGate&&<SchoolCelebration key={previewCelebration} data={data} celebrate onDone={finishCelebration}/>}
 </section>;
}
