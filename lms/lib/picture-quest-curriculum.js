import data from './picture-quest-curriculum-data.json';
import {bankKey} from './picture-quest-bank';
export const QUEST_CURRICULUM_VERSION=data.version;
export const QUEST_CURRICULUM=data.worlds;
const mediaFlags=()=>({image_url:true,audio_url:true,answer_audio:true,hint_audio:true});
const alias={fruit:{'جوزالهند':'جوزهند'}};
const defaultImage=url=>/^\/picture-quest\/(?:cat|apple|book|fish|car|bank-[a-z0-9_-]+|content-[a-z0-9_-]+)\.svg$/i.test(url)||url?.startsWith('/picture-quest/curriculum-v1/');
const seedPlaceholder=new Set(['home-table','clothes-skirt','body-head','body-hair']);
const equivalent=(a,b,topic)=>bankKey(a)===bankKey(b)||alias[topic]?.[bankKey(a)]===bankKey(b);
// One explicit curriculum installation. Subsequent teacher edits remain authoritative.
// IDs/recordings/progress epoch are retained; superseded entries remain editable,
// excluded from the curriculum rather than deleted or reset.
export function installQuestCurriculum(input){
 if((input.curriculumVersion||0)>=QUEST_CURRICULUM_VERSION)return input;
 const bank=structuredClone(input),usedIds=new Set(bank.words.map(w=>w.id)),chosen=new Set(),words=[],topics=[];
 for(const world of QUEST_CURRICULUM){
  const oldTopic=bank.topics.find(t=>t.id===world.id);
  topics.push({...oldTopic,id:world.id,title:world.title,emoji:oldTopic?.emoji||world.emoji,enabled:true,stageEnabled:{1:true,2:true,3:true,4:true,...oldTopic?.stageEnabled},curriculumScope:world.scope});
  for(const row of world.words){
   const old=bank.words.find(w=>w.topicId===world.id&&!chosen.has(w.id)&&equivalent(row.label,w.label,world.id));
   let id=old?.id||`${world.id}-academic-${row.key}`;
   if(!old){let n=1;while(usedIds.has(id))id=`${world.id}-academic-${row.key}-${n++}`;}
   usedIds.add(id);if(old)chosen.add(old.id);
   const sameGroup=world.words.filter(r=>r.stage!==4&&bankKey(r.label)!==bankKey(row.label));
   const candidate=(world.id==='shapes'?sameGroup.filter(r=>r.prompt===row.prompt):sameGroup).find(r=>r.order<=Math.max(5,row.order-1)&&!r.label.startsWith(row.label+' ')&&!row.label.startsWith(r.label+' '));
   words.push({id,topicId:world.id,label:row.label,gender:row.gender,emoji:old?.emoji||'',stage:row.stage,level:Math.min(row.stage,3),enabled:old?.enabled!==false,image_url:row.image_url,audio_url:'',answer_audio:'',hint_audio:'',mediaEnabled:mediaFlags(),hint:'انظر إلى الصورة، ثم اختر الكلمة.',distractors:candidate?[candidate.label]:[],...old,
    // Preserve uploads and feature switches; move only the curriculum membership.
    label:row.label,gender:row.gender,enabled:old?.enabled!==false||oldTopic?.enabled===false&&seedPlaceholder.has(old.id)&&!old.image_url&&!old.emoji,stage:row.stage,curriculumExcluded:false,academicId:row.academicId,curriculumOrder:row.order,reviewOf:row.reviewOf||'',prompt:row.prompt,
    image_url:old?.image_url&&!defaultImage(old.image_url)?old.image_url:row.image_url,
    // Teacher-supplied alternatives remain authoritative; defaults are curated within this world.
    distractors:old?.distractors?.length?old.distractors:candidate?[candidate.label]:[]});
  }
 }
 for(const old of bank.words)if(!chosen.has(old.id))words.push({...old,curriculumExcluded:QUEST_CURRICULUM.some(t=>t.id===old.topicId)||old.curriculumExcluded===true});
 for(const old of bank.topics)if(!topics.some(t=>t.id===old.id))topics.push(old);
 return {...bank,topics,words,curriculumVersion:QUEST_CURRICULUM_VERSION,choiceCount:2,shuffle:false};
}
