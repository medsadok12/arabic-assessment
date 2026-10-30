export const SENTENCE_ID='sentence-builder';
export const SENTENCE_STAFF=['teacher','admin','super_admin'];
export const sentenceUuid=value=>typeof value==='string'&&/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value);
export function sentenceRequestId(){if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();const bytes=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);else bytes.forEach((_,i)=>{bytes[i]=Math.floor(Math.random()*256)});bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`}
export function freshSentences(){
 const entries=[
  ['book','📘','كتاب أزرق',['هٰذَا','كِتَابِي'],['بَيْتِي','هٰذَا','كِتَابِي','هٰذِهِ'],'.',1],
  ['cat','🐈','قطة',['هٰذِهِ','قِطَّةٌ'],['قِطَّةٌ','هٰذَا','بَيْتٌ','هٰذِهِ'],'.',1],
  ['read','📖','كتاب مفتوح للقراءة',['أَقْرَأُ','كِتَابًا'],['كِتَابًا','أَلْعَبُ','أَقْرَأُ','كُرَةً'],'.',2],
  ['garden','🌳','شجرة في الحديقة',['أَلْعَبُ','فِي','الْحَدِيقَةِ'],['الْحَدِيقَةِ','أَقْرَأُ','فِي','أَلْعَبُ','الْبَيْتِ'],'.',2],
  ['question-book','📕','كتاب أحمر',['هَلْ','هٰذَا','كِتَابُكَ'],['كِتَابُكَ','أَيْنَ','هٰذَا','هَلْ','بَيْتِي'],'؟',3],
  ['question-house','🏠','بيت',['أَيْنَ','بَيْتِي'],['هَلْ','بَيْتِي','أَيْنَ','كِتَابِي'],'؟',3],
 ];
 return {title:'استمع ورتّب الكلمات',subtitle:'',enabled:true,epoch:0,settings:{reward:3,helpCost:5,hintMode:'word',speed:1,sound:true,animate:true,pictureSize:120,wordSize:24,background:'#fffdf7',ink:'#1a2b4a',gold:'#f4d78f',selected:'#eee8f8',success:'#f8e6b7',successText:'أحسنت، جملة صحيحة!',retryText:'حاول ترتيبًا آخر',helpText:'ساعدني',nextText:'المتابعة',checkText:'تحقّق',finishText:'أكملتَ التدريب!'},lessons:entries.map(([id,emoji,alt,words,bank,end,level])=>({id,enabled:true,topic:level===1?'البدايات':level===2?'ماذا أفعل؟':'نسأل ونتعلّم',level,emoji,alt,words,bank,end,image_url:'',audio_url:''}))};
}
const text=(v,max,empty=false)=>typeof v==='string'&&v.length<=max&&(empty||v.trim().length>0)&&!/[\u0000-\u0008<>]/.test(v);
function media(v){if(v==='')return true;if(typeof v!=='string'||v.length>1500||v.includes('..')||/[\s\\]/.test(v))return false;if(/^\/(?!\/)[a-z\d/_\-.]+$/i.test(v))return true;try{const url=new URL(v),base=process.env.NEXT_PUBLIC_SUPABASE_URL;return Boolean(base)&&url.origin===new URL(base).origin&&url.pathname.startsWith('/storage/v1/object/public/media/')}catch{return false}}
export function validateSentences(input){
 const bad=error=>({error});
 if(!input||!text(input.title,80)||!text(input.subtitle,160,true)||typeof input.enabled!=='boolean'||!Number.isInteger(input.epoch)||input.epoch<0||input.epoch>100000)return bad('راجع عنوان التدريب وإتاحته.');
 const s=input.settings;if(!s||!['word','first','off'].includes(s.hintMode)||typeof s.sound!=='boolean'||typeof s.animate!=='boolean')return bad('راجع إعدادات المساعدة والصوت.');
 for(const [key,min,max] of [['reward',0,50],['helpCost',0,1000],['pictureSize',70,160],['wordSize',18,36]])if(!Number.isInteger(s[key])||s[key]<min||s[key]>max)return bad('راجع النقاط وأحجام العناصر.');
 if(![.8,1,1.3].includes(s.speed))return bad('اختر سرعة الحركة.');
 for(const key of ['background','ink','gold','selected','success'])if(typeof s[key]!=='string'||!/^#[\da-f]{6}$/i.test(s[key]))return bad('اختر لونًا صالحًا.');
 for(const key of ['successText','retryText','helpText','nextText','checkText','finishText'])if(!text(s[key],100))return bad('أكمل نصوص التدريب.');
 if(!Array.isArray(input.lessons)||!input.lessons.length||input.lessons.length>200)return bad('أضف من 1 إلى 200 جملة.');
 const ids=new Set(),lessons=[];
 for(const item of input.lessons){
  if(!item||!text(item.id,80)||!/^[a-z\d_-]+$/i.test(item.id)||ids.has(item.id)||typeof item.enabled!=='boolean'||!text(item.topic,60)||!text(item.emoji,16)||!text(item.alt,100)||!Number.isInteger(item.level)||item.level<1||item.level>100)return bad('راجع بيانات الجملة ومستواها.');
  ids.add(item.id);
  if(!['.','؟','!'].includes(item.end)||!Array.isArray(item.words)||!item.words.length||item.words.length>8||!item.words.every(w=>text(w,50)&&!/[\s.؟!?]/.test(w))||!Array.isArray(item.bank)||item.bank.length>16||!item.bank.every(w=>text(w,50)&&!/[\s.؟!?]/.test(w)))return bad('اكتب كلمات منفصلة دون علامات ترقيم؛ الجملة من 1 إلى 8 كلمات.');
  const bank=[...item.bank];for(const word of item.words){const at=bank.indexOf(word);if(at<0)return bad('كل كلمة صحيحة يجب أن تظهر في صندوق الاختيار، مع تكرارها إن تكررت في الجملة.');bank.splice(at,1)}
  if(!media(item.image_url)||!media(item.audio_url))return bad('استخدم الملفات المرفوعة إلى المنصة.');
  lessons.push({id:item.id,enabled:item.enabled,topic:item.topic.trim(),level:item.level,emoji:item.emoji,alt:item.alt.trim(),words:item.words.map(w=>w.trim()),bank:item.bank.map(w=>w.trim()),end:item.end,image_url:item.image_url,audio_url:item.audio_url});
 }
 const keys=Object.keys(freshSentences().settings),settings=Object.fromEntries(keys.map(k=>[k,s[k]]));
 return {config:{title:input.title.trim(),subtitle:input.subtitle.trim(),enabled:input.enabled,epoch:input.epoch,settings,lessons}};
}
export const activeSentences=config=>config.lessons.filter(item=>item.enabled);
export function sentenceStamp(item){return JSON.stringify([item.id,item.words,item.bank,item.end])}
export function sentenceSlots(item,slots,complete=true){return Array.isArray(slots)&&(!complete||slots.length===item.words.length)&&slots.length<=item.words.length&&new Set(slots).size===slots.length&&slots.every(i=>Number.isInteger(i)&&i>=0&&i<item.bank.length)}
export const sentenceRight=(item,slots)=>sentenceSlots(item,slots)&&item.words.every((w,i)=>item.bank[slots[i]]===w);
export function sentenceHint(item,slots,mode='word'){
 if(!sentenceSlots(item,slots,false)||mode==='off')return null;
 let prefix=0;while(prefix<slots.length&&item.bank[slots[prefix]]===item.words[prefix])prefix++;
 if(mode==='first'&&prefix>0||prefix===item.words.length)return null;
 if(mode==='first')prefix=0;
 const keep=slots.slice(0,prefix),slot=item.bank.findIndex((w,i)=>w===item.words[prefix]&&!keep.includes(i));
 return {position:prefix,slots:[...keep,slot]};
}
export function publicSentence(item){const {words,...safe}=item;return {...safe,length:words.length}}
export function publicSentences(config){const {lessons,...safe}=config;return {...safe,total:activeSentences(config).length}}
