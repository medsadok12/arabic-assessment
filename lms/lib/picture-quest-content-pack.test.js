import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {freshQuestBank,validateQuestBank,stageReadiness,bankKey,bankQuestion,mixedFinalWords,stageWords,bankWordReady} from './picture-quest-bank';
import {freshPictureQuest,QUEST_SOUNDS} from './picture-quest';
import {completeQuestWorlds} from './picture-quest-content-pack';
import {QUEST_WORLD_CONTENT,contentImage} from './picture-quest-content-data';
import {QUEST_CURRICULUM,installQuestCurriculum} from './picture-quest-curriculum';
import {bankCatalog} from './picture-quest-bank-server';
const active=b=>b.words.filter(w=>!w.curriculumExcluded);
const find=(b,id)=>b.words.find(w=>w.id===id);

describe('reviewed twenty-world curriculum',()=>{
 it('installs the document order and exactly 600 ordinary and 60 enrichment slots, all playable with scoped home choice progression',()=>{
  const bank=completeQuestWorlds(freshQuestBank(),freshPictureQuest());
  expect(validateQuestBank(bank).error).toBeUndefined();
  expect(bank.topics.map(t=>t.id)).toEqual(['school','home','toys','body','clothes','food','fruit','vegetables','family','animals','birds','garden','sea','transport','city','jobs','sports','weather','shapes','space']);
  expect(active(bank).filter(w=>w.stage!==4)).toHaveLength(600);expect(active(bank).filter(w=>w.stage===4)).toHaveLength(60);
  const reserved=new Set(active(bank).filter(w=>w.stage===4).map(w=>bankKey(w.label)));
  for(const topic of bank.topics)for(const [stage,count]of[[1,5],[2,10],[3,15],[4,3]]){
   expect(stageReadiness(bank,topic.id,stage)).toMatchObject({ready:true,count,target:count});
   const words=stageWords(bank,topic.id,stage,'test');expect(words.map(w=>w.curriculumOrder)).toEqual(words.map(w=>w.curriculumOrder).sort((a,b)=>a-b));
   for(const w of words){const q=bankQuestion(bank,w,w.level);const choices=stage<4?stage+1:2;expect(q.options).toHaveLength(choices);expect(new Set(q.options.map(o=>bankKey(o.label))).size).toBe(choices);if(stage!==4)expect(q.options.some(o=>reserved.has(bankKey(o.label)))).toBe(false);}
  }
  expect(mixedFinalWords(bank,bank.topics.map(t=>t.id),'test')).toHaveLength(60);
 });
 it('bundles a specific SVG for every curriculum entry and keeps all legacy packaged pictures',()=>{
  for(const row of Object.values(QUEST_WORLD_CONTENT).flat())expect(existsSync(new URL('../public'+contentImage(row),import.meta.url))).toBe(true);
  for(const world of QUEST_CURRICULUM)for(const row of world.words){const text=readFileSync(new URL('../public'+row.image_url,import.meta.url),'utf8');expect(text).toContain('<svg');expect(text).not.toMatch(/<script|<foreignObject|<image|https?:\/\/(?!www\.w3\.org)/);expect(text).not.toContain(row.label);}
 });
 it('retains IDs, uploads, independent off switches, points settings and epoch, and archives superseded words without deleting them',()=>{
  const bank=freshQuestBank();bank.epoch=17;const old=bank.words[0];old.image_url='/picture-quest/custom-cat.svg';old.answer_audio='https://example.supabase.co/cat.mp3';old.enabled=false;old.mediaEnabled.image_url=false;
  bank.topics[0].stageEnabled={2:false};bank.settings.sound=false;const result=completeQuestWorlds(bank,freshPictureQuest()),cat=find(result,old.id);
  for(const k of['id','image_url','answer_audio','enabled','mediaEnabled'])expect(cat[k]).toEqual(old[k]);expect(result.epoch).toBe(17);expect(result.settings).toEqual(bank.settings);expect(stageReadiness(result,'animals',1).ready).toBe(false);expect(stageReadiness(result,'animals',2).ready).toBe(false);
  expect(result.words.filter(w=>w.curriculumExcluded).length).toBeGreaterThan(0);for(const w of bank.words)expect(find(result,w.id)).toBeTruthy();expect(bank.words).toHaveLength(56);
 });
 it('copies original event recordings once and never routes wrong-answer encouragement to the timeout',()=>{
  const original=freshPictureQuest();for(const role of QUEST_SOUNDS)original.settings.sounds[role]='/picture-quest/'+role+'.mp3';original.settings.soundEnabled.hint=false;
  const bank=freshQuestBank();bank.settings.sounds.success='/picture-quest/custom-win.mp3';bank.settings.soundEnabled.wrong=false;bank.settings.sounds.wrong=original.settings.sounds.wrong;bank.settings.sounds.timeout=original.settings.sounds.wrong;
  const result=completeQuestWorlds(bank,original);for(const role of QUEST_SOUNDS.filter(r=>r!=='success'))expect(result.settings.sounds[role]).toBe(original.settings.sounds[role]);expect(result.settings.sounds.success).toBe('/picture-quest/custom-win.mp3');expect(result.settings.soundEnabled.wrong).toBe(false);expect(result.settings.soundEnabled.hint).toBe(false);
 });
 it('retains uploaded correct-word media and never replaces a teacher recording',()=>{
  const original=freshPictureQuest(),cat=original.questions[0];cat.image_url='https://example.supabase.co/cat.png';cat.answer_audio='https://example.supabase.co/cat.mp3';cat.mediaEnabled.answer_audio=false;
  const bank=freshQuestBank();let result=completeQuestWorlds(bank,original);expect(find(result,'animals-cat').answer_audio).toBe(cat.answer_audio);expect(find(result,'animals-cat').mediaEnabled.answer_audio).toBe(false);
  bank.words[0].answer_audio='https://example.supabase.co/custom.mp3';expect(find(completeQuestWorlds(bank,original),'animals-cat').answer_audio).toBe(bank.words[0].answer_audio);
 });
 it('never resurrects deleted words, re-enables worlds, rewrites ordering or removed media after installation is saved',()=>{
  const bank=validateQuestBank(completeQuestWorlds(freshQuestBank(),freshPictureQuest())).config;bank.words=bank.words.filter(w=>w.id!=='animals-cat');bank.topics[0].enabled=false;bank.topics.reverse();bank.settings.sounds.wrong='';
  expect(completeQuestWorlds(bank,freshPictureQuest())).toEqual(bank);expect(installQuestCurriculum(bank)).toBe(bank);
 });
 it('allows repeated vocabulary in different worlds but rejects duplicates within a world and carries curriculum metadata through publish validation',()=>{
  const bank=completeQuestWorlds(freshQuestBank(),freshPictureQuest());expect(active(bank).filter(w=>bankKey(w.label)===bankKey('كُرْسِيّ'))).toHaveLength(2);const checked=validateQuestBank(bank);expect(checked.error).toBeUndefined();expect(checked.config.curriculumVersion).toBe(1);expect(find(checked.config,'home-chair').reviewOf).toBeTruthy();expect(checked.config.topics[0].curriculumScope).toBeTruthy();bank.words.push({...active(bank)[0],id:'bad-copy'});expect(validateQuestBank(bank).error).toContain('مكررة');
 });
 it('uses explicit colour, shape, action and relationship prompts and retains earned access/completions after reorder',()=>{
  const bank=completeQuestWorlds(freshQuestBank(),freshPictureQuest()),word=(id,no)=>active(bank).find(w=>w.topicId===id&&w.curriculumOrder===no);
  expect(bankQuestion(bank,word('shapes',6)).prompt).toBe('ما اللون؟');expect(bankQuestion(bank,word('shapes',1)).prompt).toBe('ما الشكل؟');expect(bankQuestion(bank,word('family',11)).prompt).toContain('أنا');expect(bankQuestion(bank,word('sports',1)).prompt).toBe('ما النشاط؟');
  const old={completions:{'animals:1':{done:true}},attempts:{'fruit:2':{index:3,questions:[1,2,3,4]}},worldAccess:{animals:true,fruit:true}};const copy=structuredClone(old),catalog=bankCatalog(bank,old);expect(catalog.topics.find(t=>t.id==='animals').unlocked).toBe(true);expect(catalog.topics.find(t=>t.id==='animals').stages[0].completed).toBe(true);expect(catalog.topics.find(t=>t.id==='fruit').unlocked).toBe(true);expect(old).toEqual(copy);
 });
 it('excludes archived entries from selection and final readiness while keeping their data editable',()=>{
  const bank=completeQuestWorlds(freshQuestBank(),freshPictureQuest());for(const w of bank.words.filter(w=>w.curriculumExcluded))expect(bankWordReady(w)).toBe(false);const c=validateQuestBank(bank).config;expect(c.words.filter(w=>w.curriculumExcluded).length).toBeGreaterThan(0);
 });
});
it('previews an incomplete new world with its own clearly marked examples, never substitutes animals',async()=>{
 const{buildQuestStaffPreview}=await import('./picture-quest-staff-preview');const bank=completeQuestWorlds(freshQuestBank(),freshPictureQuest());bank.words=bank.words.filter(w=>w.topicId!=='weather');const preview=buildQuestStaffPreview(bank,{topicId:'weather',stage:1});expect(preview.demo).toBe(true);expect(preview.config.title).toContain('الطقس');expect(preview.config.questions[0].options.find(o=>o.id==='choice-0').label).toBe('شَمْس');
});

it('starts in document order and honours the teacher shuffle switch without changing stored order',()=>{const b=completeQuestWorlds(freshQuestBank(),freshPictureQuest());expect(b.shuffle).toBe(false);const ordered=stageWords(b,'school',3).map(w=>w.id);b.shuffle=true;expect(stageWords(b,'school',3,'shuffle').map(w=>w.id)).not.toEqual(ordered);b.shuffle=false;expect(stageWords(b,'school',3).map(w=>w.id)).toEqual(ordered)});
