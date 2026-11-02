import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {freshQuestBank,validateQuestBank,stageReadiness,bankKey,bankQuestion,mixedFinalWords} from './picture-quest-bank';
import {freshPictureQuest,QUEST_SOUNDS} from './picture-quest';
import {completeQuestWorlds} from './picture-quest-content-pack';
import {QUEST_WORLD_CONTENT,contentImage} from './picture-quest-content-data';

describe('complete published worlds without replacing administration choices',()=>{
 it('provides 30 learning and 3 unseen final words in each of the three visible worlds',()=>{
  const bank=completeQuestWorlds(freshQuestBank(),freshPictureQuest());
  expect(validateQuestBank(bank).error).toBeUndefined();
  for(const id of ['animals','fruit','school']){
   expect(bank.words.filter(w=>w.topicId===id)).toHaveLength(33);
   for(const [stage,count]of [[1,5],[2,10],[3,15],[4,3]])expect(stageReadiness(bank,id,stage)).toMatchObject({ready:true,count,target:count});
  }
  expect(new Set(bank.words.map(w=>bankKey(w.label))).size).toBe(bank.words.length);
  const final=mixedFinalWords(bank,['animals','fruit','school'],'test');expect(final).toHaveLength(9);
  const reserved=new Set(final.map(w=>bankKey(w.label)));
  for(const w of bank.words.filter(w=>w.stage!==4&&['animals','fruit','school'].includes(w.topicId)))expect(bankQuestion(bank,w,3).options.some(o=>reserved.has(bankKey(o.label)))).toBe(false);
 });
 it('bundles a real SVG for every candidate including reserved words and spare candidates',()=>{
  for(const row of Object.values(QUEST_WORLD_CONTENT).flat()){
   const path=new URL('../public'+contentImage(row),import.meta.url);
   expect(existsSync(path),row[1]).toBe(true);expect(readFileSync(path,'utf8')).toContain('<svg');
  }
 });
 it('preserves IDs, custom uploads, disabled words and stages, settings and hidden worlds',()=>{
  const bank=freshQuestBank();bank.words[0].image_url='/picture-quest/custom.svg';bank.words[0].answer_audio='/picture-quest/custom.mp3';bank.words[0].enabled=false;bank.words[0].mediaEnabled.image_url=false;
  bank.topics[0].stageEnabled={2:false};bank.settings.sound=false;
  const result=completeQuestWorlds(bank,freshPictureQuest());
  expect(result.words[0]).toEqual(bank.words[0]);expect(result.topics).toEqual(bank.topics);expect(result.settings.sound).toBe(false);
  expect(result.words.filter(w=>w.topicId==='home')).toEqual(bank.words.filter(w=>w.topicId==='home'));
  expect(stageReadiness(result,'animals',1).ready).toBe(false);expect(stageReadiness(result,'animals',2).ready).toBe(false);
  expect(bank.words).toHaveLength(56);
 });
 it('copies each original recording to the same event only and preserves independent off switches',()=>{
  const original=freshPictureQuest();for(const role of QUEST_SOUNDS)original.settings.sounds[role]='/picture-quest/'+role+'.mp3';
  original.settings.soundEnabled.hint=false;
  const bank=freshQuestBank();bank.settings.sounds.success='/picture-quest/custom-win.mp3';bank.settings.soundEnabled.wrong=false;
  bank.settings.sounds.wrong=original.settings.sounds.wrong;bank.settings.sounds.timeout=original.settings.sounds.wrong;
  const result=completeQuestWorlds(bank,original);
  for(const role of QUEST_SOUNDS.filter(r=>r!=='success'))expect(result.settings.sounds[role]).toBe(original.settings.sounds[role]);
  expect(result.settings.sounds.success).toBe('/picture-quest/custom-win.mp3');expect(result.settings.soundEnabled.wrong).toBe(false);expect(result.settings.soundEnabled.hint).toBe(false);
  expect(original.questions[0].answer_audio).toBe('');
 });
 it('carries uploaded word media by correct word label without replacing custom recordings',()=>{
  const original=freshPictureQuest();const cat=original.questions[0];cat.image_url='https://example.supabase.co/cat.png';cat.answer_audio='https://example.supabase.co/cat.mp3';cat.mediaEnabled.answer_audio=false;
  const bank=freshQuestBank();const result=completeQuestWorlds(bank,original);const word=result.words.find(w=>w.id==='animals-cat');
  expect(word.image_url).toBe(cat.image_url);expect(word.answer_audio).toBe(cat.answer_audio);expect(word.mediaEnabled.answer_audio).toBe(false);
  bank.words[0].answer_audio='https://example.supabase.co/custom.mp3';expect(completeQuestWorlds(bank,original).words[0].answer_audio).toBe(bank.words[0].answer_audio);
 });
 it('never resurrects content or removed recordings after the administrator saves the pack',()=>{
  const first=completeQuestWorlds(freshQuestBank(),freshPictureQuest());const bank=validateQuestBank(first).config;
  bank.words=bank.words.filter(w=>w.id!==first.words[0].id);bank.settings.sounds.wrong='';
  const original=freshPictureQuest();original.settings.sounds.wrong='/picture-quest/wrong.mp3';
  expect(completeQuestWorlds(bank,original)).toEqual(bank);
 });
 it('does not reclassify custom words, reuse a final word already taught or duplicate labels',()=>{
  const bank=freshQuestBank();bank.words[0].label='غَزَالٌ';const result=completeQuestWorlds(bank,freshPictureQuest());
  expect(result.words[0].stage).toBe(1);expect(result.words.filter(w=>bankKey(w.label)===bankKey('غَزَالٌ'))).toHaveLength(1);
  expect(result.words.filter(w=>w.topicId==='animals'&&w.stage===4)).toHaveLength(3);
 });
});
