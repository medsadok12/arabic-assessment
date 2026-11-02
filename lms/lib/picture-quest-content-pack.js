import {bankKey,migrateQuestBank} from './picture-quest-bank';
import {QUEST_SOUNDS} from './picture-quest';
import {QUEST_WORLD_CONTENT,contentImage} from './picture-quest-content-data';

export const QUEST_CONTENT_PACK_VERSION=1;
const mediaKeys=['image_url','audio_url','answer_audio','hint_audio'];
const flags=()=>Object.fromEntries(mediaKeys.map(k=>[k,true]));
const uploaded=url=>typeof url==='string'&&/^https:\/\//.test(url);

// An additive, versioned default. Saving this version makes later administrative
// deletions and removals authoritative; reads never mutate the published row.
export function completeQuestWorlds(input,original){
 const bank=migrateQuestBank(input);
 if((bank.contentPackVersion||0)>=QUEST_CONTENT_PACK_VERSION)return bank;
 const used=new Set(bank.words.map(w=>bankKey(w.label))),ids=new Set(bank.words.map(w=>w.id));
 for(const [topicId,rows]of Object.entries(QUEST_WORLD_CONTENT)){
  if(!bank.topics.some(t=>t.id===topicId))continue;
  for(const word of bank.words.filter(w=>w.topicId===topicId)){
   const row=rows.find(r=>bankKey(r[1])===bankKey(word.label));
   if(row&&!word.image_url)word.image_url=contentImage(row);
  }
  for(const [stage,target]of [[1,5],[2,10],[3,15],[4,3]]){
   // Disabled entries retain their place; filling must not override an off switch.
   let missing=target-bank.words.filter(w=>w.topicId===topicId&&w.stage===stage).length;
   const preferred=stage===4?rows.slice(30):[...rows.slice(stage===1?0:stage===2?5:15,stage===1?5:stage===2?15:30),...rows.slice(0,30),...rows.slice(33)];
   for(const row of preferred){
    if(missing<=0||bank.words.length>=1400)break;if(used.has(bankKey(row[1])))continue;
    const base=`${topicId}-pack-${row[0]}`;let id=base,n=1;while(ids.has(id))id=base+'-'+n++;
    bank.words.push({id,topicId,label:row[1],gender:row[2],emoji:row[3],stage,level:Math.min(stage,3),enabled:true,image_url:contentImage(row),audio_url:'',answer_audio:'',hint_audio:'',mediaEnabled:flags(),hint:'',distractors:[]});
    used.add(bankKey(row[1]));ids.add(id);missing--;
   }
  }
 }
 if(original){
  for(const role of QUEST_SOUNDS){
   const source=original.settings.sounds[role],current=bank.settings.sounds[role];
   // A timeout has its own recording, never the wrong-answer encouragement.
   const mistakenTimeout=role==='timeout'&&current&&current===bank.settings.sounds.wrong&&source&&source!==original.settings.sounds.wrong;
   if(source&&(!current||mistakenTimeout)){
    bank.settings.sounds[role]=source;
    bank.settings.soundEnabled[role]=bank.settings.soundEnabled[role]!==false&&original.settings.soundEnabled[role]!==false;
   }
  }
  for(const question of original.questions){
   const label=question.options.find(o=>o.id===question.correctId)?.label;
   const word=bank.words.find(w=>bankKey(w.label)===bankKey(label));if(!word)continue;
   for(const key of mediaKeys){
    if(uploaded(question[key])&&!uploaded(word[key])){
     word[key]=question[key];word.mediaEnabled??=flags();
     word.mediaEnabled[key]=word.mediaEnabled[key]!==false&&question.mediaEnabled?.[key]!==false;
    }
   }
  }
 }
 bank.contentPackVersion=QUEST_CONTENT_PACK_VERSION;
 return bank;
}
