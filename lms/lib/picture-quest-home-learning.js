// Home-only teaching policy. Other worlds and saved attempt snapshots keep their rules.
export const HOME_CHOICE_FLAG='homeChoiceProgressionEnabled';
export const HOME_LEARNING_ART='/picture-quest/home-learning-v2/';
export function homeWordOrder(word){
 if(word.topicId!=='home')return 0;
 return Number(word.academicId?.match(/^W02-S\d-(\d+)$/)?.[1])||Number(word.image_url?.match(/\/(?:home-|home-learning-v2\/)(\d+)\.svg$/)?.[1])||word.curriculumOrder||0;
}
export function upgradeHomeLearningWord(word){
 if(word.topicId!=='home')return;
 const match=word.image_url?.match(/^\/picture-quest\/curriculum-v1\/home-(\d+)\.svg$/);
 if(!match)return; // Uploaded/local custom pictures, removals and switches are authoritative.
 const order=Number(match[1]);if(order<1||order>33)return;
 word.image_url=HOME_LEARNING_ART+String(order).padStart(2,'0')+'.svg';
 if(!word.prompt||word.prompt==='ما الكلمة المناسبة؟')word.prompt=homeLearningPrompt(order);
}
export function homeLearningPrompt(order){return[16,17,8,9].includes(order)?'ما اسم هذه الغرفة؟':[21,22,23,31,32].includes(order)?'إلى ماذا يشير السهم؟':order===7?'ماذا يُظهر المشهد كاملًا؟':'ما الكلمة المناسبة؟';}
const rooms=new Set([8,9,16,17]);
const preferred={
 1:[2,4,3,5],2:[1,5,3,4],3:[4,5,1,2],4:[3,5,2,1],5:[3,4,1,2],
 6:[3,4,5,11],7:[6,8,9,11],8:[9,6,17,16],9:[8,6,17,16],
 10:[3,4,5,11],11:[10,3,5,13],12:[13,11,10,5],13:[12,11,5,10],14:[15,13,10,5],15:[14,13,11,10],
 16:[17,8,9],17:[16,8,9],18:[19,6,8,9],19:[18,6,8,9],20:[21,22,23,11],21:[22,23,20,11],22:[21,23,20,11],23:[21,22,20,11],
 24:[13,12,30,25],25:[26,14,30,15],26:[25,14,30,15],27:[28,29,11,10],28:[27,29,11,10],29:[28,27,12,13],30:[25,26,14,15],31:[6,20,21],32:[24,13,12],33:[14,25,26]
};
// Avoid part/whole distractors even when a former automatic pair chose a visible prop.
export function homeChoices(bank,word,key){
 const order=homeWordOrder(word),eligible=bank.words.filter(w=>w.topicId==='home'&&w.id!==word.id&&w.enabled&&!w.curriculumExcluded&&w.stage!==4&&w.stage<=word.stage),byOrder=new Map(eligible.map(w=>[homeWordOrder(w),w]));
 const compatible=other=>{
  const n=homeWordOrder(other);if(rooms.has(order))return rooms.has(n)||n===6;
  if(order===7)return[6,8,9].includes(n);
  if(order===6)return[3,4,5,10,11,12,13,14,24,25,26,27,28,29,30].includes(n);
  if((order===15&&n===2)||(order===2&&n===15)||(order===11&&n===1)||(order===27&&n===1)||(order===28&&n===1))return false;
  if(order===18||order===19)return[6,8,9,16,17,18,19].includes(n);
  return ![6,7,8,9,16,17,18,19].includes(n);
 };
 const result=[],seen=new Set([key(word.label)]),add=label=>{if(!seen.has(key(label))){seen.add(key(label));result.push(label)}};
 // Prioritize reviewed alternatives for built-in scenes; keep teacher alternatives for custom art.
 const builtIn=word.image_url?.startsWith(HOME_LEARNING_ART)||/^\/picture-quest\/curriculum-v1\/home-\d+\.svg$/.test(word.image_url||'');
 const manual=()=>{for(const label of word.distractors||[]){const known=bank.words.find(w=>w.topicId==='home'&&key(w.label)===key(label));if(known?eligible.includes(known)&&compatible(known):!builtIn)add(label)}};
 const curated=()=>{for(const n of preferred[order]||[]){const other=byOrder.get(n);if(other&&compatible(other))add(other.label)}for(const other of eligible)if(compatible(other))add(other.label)};
 const formerDefault=builtIn&&word.distractors?.length===1&&eligible.some(w=>homeWordOrder(w)===1&&key(w.label)===key(word.distractors[0]));
 if(formerDefault&&bank.autoChoices){curated();manual()}else{manual();if(bank.autoChoices)curated()}
 return result;
}
