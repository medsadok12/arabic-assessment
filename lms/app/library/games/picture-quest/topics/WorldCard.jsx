'use client';
import{forwardRef}from'react';
import{displayNumber}from'../../../../../lib/display-number';
const tones={
 animals:['#FCE5B7','#FFF4DB','#D6AC60'],fruit:['#F4C6CD','#FFF0F1','#CE929E'],school:['#C4DAF8','#F0F6FF','#8DAED8'],home:['#DBCDF6','#F7F0FF','#B0A0CD'],transport:['#BFE4D9','#ECFAF5','#87B8AA'],clothes:['#C2E2ED','#EFFAFF','#88B2C4'],body:['#F6D3B9','#FFF4E9','#CDAC8E'],final:['#F8D881','#FFF6D7','#D0AD51']
};
export function worldStyle(id){const [tone,light,base]=tones[id]||tones.school;return{'--pqw-tone':tone,'--pqw-light':light,'--pqw-base':base};}
export const currentStage=t=>t.stages.find(s=>!s.completed&&s.unlocked)||t.stages.at(-1);
function StageProgress({topic}){return <span className="pqw-mini" aria-hidden="true">{topic.stages.map(s=><i key={s.stage} className={s.completed?'done':s.unlocked?'current':''}/>)}</span>;}

const WorldCard=forwardRef(function WorldCard({topic,showProgress=true,onOpen,compact=false},ref){const done=topic.stages.filter(s=>s.completed).length,s=topic.stages.find(s=>s.resume)||currentStage(topic);return <button type="button" className={'pqw-world'+(compact?' pqf-world':'')} style={worldStyle(topic.id)} ref={ref} onClick={()=>onOpen?.(topic.id)} aria-label={topic.title+'، '+displayNumber(done)+' من 3 مراحل مكتملة'}>{compact?<><span className="pqw-icon" aria-hidden="true">{topic.emoji||'✦'}</span><strong>{topic.title}</strong></>:<><span className="pqw-world-top"><span className="pqw-icon" aria-hidden="true">{topic.emoji||'✦'}</span><strong>{topic.title}</strong></span><small>{done?displayNumber(done)+' من 3 مراحل مكتملة ✓':s?.resume?'المرحلة '+displayNumber(s.stage)+' · '+displayNumber(s.index)+' من '+displayNumber(s.target):s?.ready?'ابدأ الاكتشاف':'قيد التجهيز'}</small>{showProgress&&<StageProgress topic={topic}/>}</>}</button>});
export default WorldCard;
