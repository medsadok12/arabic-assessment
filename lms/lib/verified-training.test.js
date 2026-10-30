import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { applyTrainingEvent, trainingSummary, verifyWheelTrace } from './verified-training';
import { challengeOutcome } from './challenge-verified';
const db=vi.hoisted(()=>({tables:{},user:null,child:null,fail:null,seq:0}));
vi.mock('next/headers',()=>({cookies:()=>({get:()=>undefined})}));
vi.mock('./supabase-server',()=>({createClient:()=>({auth:{getUser:async()=>({data:{user:db.user}})}})}));
vi.mock('./active-child',()=>({resolveActiveIdentity:async u=>({effectiveUserId:db.child||u.id})}));
vi.mock('./supabase-admin',()=>{
 class Q{
  constructor(t){this.t=t;this.f=[];this.op='read';this.one=false;}
  select(){return this;}eq(k,v){this.f.push(r=>String(r[k])===String(v));return this;}is(k,v){this.f.push(r=>(r[k]??null)===v);return this;}in(k,vs){this.f.push(r=>vs.includes(r[k]));return this;}
  like(k,v){const p=v.slice(0,-1);this.f.push(r=>r[k]?.startsWith(p));return this;}order(k){this.sort=k;return this;}range(a,b){this.slice=[a,b+1];return this;}limit(n){this.max=n;return this;}
  maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}insert(p){this.op='insert';this.p=p;return this;}update(p){this.op='update';this.p=p;return this;}upsert(p){this.op='upsert';this.p=p;return this;}
  then(ok,fail){return Promise.resolve().then(()=>{
   if(db.fail===`${this.t}:${this.op}`)return{data:null,error:{code:'FAILED'}};
   const rows=db.tables[this.t]||=[];let m=rows.filter(r=>this.f.every(f=>f(r)));
   if(this.op==='insert'){const k=this.t==='game_settings'?'game_id':this.t==='user_points'?'user_id':null;if(k&&rows.some(r=>r[k]===this.p[k]))return{data:null,error:{code:'23505'}};const r={id:String(++db.seq),...structuredClone(this.p)};rows.push(r);m=[r];}
   else if(this.op==='update')m.forEach(r=>Object.assign(r,structuredClone(this.p)));
   else if(this.op==='upsert'){const old=rows.find(r=>r.user_id===this.p.user_id&&r.word_id===this.p.word_id);if(old)Object.assign(old,structuredClone(this.p));else rows.push(structuredClone(this.p));m=[old||this.p];}
   else{if(this.sort)m=m.toSorted((a,b)=>String(a[this.sort]).localeCompare(String(b[this.sort])));if(this.slice)m=m.slice(...this.slice);if(this.max)m=m.slice(0,this.max);}
   return{data:structuredClone(this.one?m[0]||null:m),error:null};
  }).then(ok,fail);}
 }
 return{createAdminClient:()=>({from:t=>new Q(t)})};
});
const api=await import('../app/api/games/verified/route');
const flash=await import('../app/api/flashcards/review/route');
const view=await import('../app/api/huroof/view/route');
const chAnswer=await import('../app/api/challenge/answer/route');
const chAdvance=await import('../app/api/challenge/advance/route');
const chResult=await import('../app/api/challenge/result/route');
const huroof=await import('../app/api/huroof/progress/route');
const points=await import('../app/api/points/route');
const results=await import('../app/api/game-results/route');
const req=b=>new Request('https://www.aarem.net/api/test',{method:'POST',body:JSON.stringify(b)});
const call=async(b,route=api)=>{const r=await route.POST(req(b));return{status:r.status,body:await r.json(),headers:r.headers};};
const start=async(game,ids,category='عام',extra={})=>{const r=await call({action:'start',game,roundId:randomUUID(),ids,category,filters:{},...extra});expect(r.status).toBe(200);return r.body;};
const answer=(s,index,value,extra={})=>({action:'answer',game:s.game,roundId:s.roundId,eventId:randomUUID(),index,value,...extra});
const row=s=>db.tables.game_settings.find(r=>r.game_id===`verified:round:${s.game}:${s.roundId}`);
beforeEach(()=>{
 db.user={id:'student',app_metadata:{role:'student'},user_metadata:{}};db.child=null;db.fail=null;db.seq=0;
 db.tables={game_settings:[],points_log:[],user_points:[{user_id:'student',total:100}],game_results:[],
  letter_catcher_words:[{id:'lc',word:'قلم',missing_letter:'ق',options:['ق','ك','م'],category:'المدرسة'}],
  vowel_balloon_games:[{id:'vb',target_text:'بَ',correct_option:'فتحة',wrong_option_1:'ضمة',wrong_option_2:'كسرة',rule_text:'الفتحة'}],
  syllable_games:[{id:'sm',word_text:'قلم',correct_segments:['قَ','لَم'],wrong_options:[['قل','م'],['ق','لم']],rule_text:'مقاطع'}],
  word_image_matches:[{id:'one',word_text:'بيت',image_url:'/house.png',topic:'عام'},{id:'two',word_text:'قلم',image_url:'/pen.png',topic:'عام'}],
  word_wheel_configs:[{id:'wheel',name:'المكتب',mode:'picture',center_letter:'ك',outer_letters:['ت','ب'],valid_words:['كتب'],is_active:true,settings:{shuffle_words:false,show_card:false,max_attempts:2,hints_enabled:true,hints_limit:2,instant_check:true}}],word_wheel_words:[],lexicon_words:[{id:'w',word:'قلم'}],flashcard_progress:[],
  challenge_rooms:[{id:'room',player1_id:'student',player2_id:'friend',player1_score:0,player2_score:0,questions:[{correct_option:'فتحة'},{correct_option:'ضمة'}],status:'playing',cur_q_index:0,round_winner:null}],
 };
});
describe('تعميم تصحيح التدريبات — الإجابة والخادم',()=>{
 it.each(['letter_catcher','vowel_balloon','word_smash','word_image_match','word_wheel'])('معاينة %s لا تغيّر بيانات أو نقاطًا',async game=>{
  db.user.app_metadata.role='teacher';const before=structuredClone(db.tables);
  const ids={letter_catcher:['lc'],vowel_balloon:['vb'],word_smash:['sm'],word_image_match:['one','two']};
  const s=await start(game,ids[game]||[],game==='letter_catcher'?'__all__':'عام',{wheelId:'wheel'});expect(s.preview).toBe(true);expect(db.tables).toEqual(before);
  expect((await call(answer(s,0,'خداع'))).status).toBe(403);
 });
 it('المعلّق والضيف والدور المزور لا يبدؤون تدريبًا',async()=>{
  db.user=null;expect((await call({})).status).toBe(401);db.user={id:'s',app_metadata:{role:'student',status:'suspended'}};expect((await call({})).status).toBe(401);
  db.user.app_metadata={};db.user.user_metadata={role:'admin'};expect((await call({})).status).toBe(401);
 });
 it('الحركات: الخطأ ثم التصحيح إكمال صحيح، دون درجة أول محاولة كاذبة',async()=>{
  const s=await start('vowel_balloon',['vb']);expect((await call(answer(s,0,'كسرة'))).body).toMatchObject({right:false,questionDone:false});
  const b=answer(s,0,'فتحة'),r=await call({...b,correct:999,points:999});expect(r.body).toMatchObject({right:true,summary:{correct:0,wrong:1,complete:true},awarded:5});
  await call(b);expect(db.tables.game_results).toHaveLength(1);expect(db.tables.user_points[0].total).toBe(105);
 });
 it('صياد الحروف: محاولتان، والتصحيح بعد الخطأ لا يكسب نقاط أول محاولة',async()=>{
  const s=await start('letter_catcher',['lc'],'__all__');await call(answer(s,0,'ك'));const r=await call(answer(s,0,'ق'));expect(r.body).toMatchObject({right:true,awarded:0,summary:{correct:0,complete:true}});expect(db.tables.user_points[0].total).toBe(100);
  const t=await start('letter_catcher',['lc'],'__all__');await call(answer(t,0,'ك'));expect((await call(answer(t,0,'م'))).body).toMatchObject({right:false,questionDone:true,summary:{complete:true}});
 });
 it('التفكيك يقارن المقاطع كاملةً، لا وجود جزء صحيح فيها',async()=>{
  const s=await start('word_smash',['sm']);const r=await call(answer(s,0,['قَ','خطأ']));expect(r.body).toMatchObject({right:false,questionDone:true,summary:{correct:0,complete:true}});expect(db.tables.points_log).toHaveLength(0);
 });
 it('المطابقة تُقبل بأي ترتيب، لكن صورة من خارج الجولة أو تكرار الزوج لا ينجح',async()=>{
  const s=await start('word_image_match',['one','two']);expect((await call(answer(s,0,'outsider'))).status).toBe(400);
  await call(answer(s,1,'one'));await call(answer(s,1,'two'));const b=answer(s,0,'one');await call(b);await call(b);
  expect((await call(answer(s,0,'one'))).status).toBe(409);expect(db.tables.game_results).toMatchObject([{correct:1,wrong:1,total:2}]);expect(db.tables.points_log).toHaveLength(2);
 });
 it('ترتيب الحروف والمقاطع يتبع اللقطة، حتى بعد تعديل المعلم وحذفه',async()=>{
  const s=await start('word_smash',['sm']);db.tables.syllable_games=[];const b=answer(s,0,['قَ','لَم']);expect((await call(b)).body.right).toBe(true);
  const restored=await call({action:'resume',game:s.game,roundId:s.roundId});expect(restored.body.summary.complete).toBe(true);expect(restored.body.items[0].word_text).toBe('قلم');
 });
 it('التزامن لا يضاعف المكافأة أو النتيجة، والتكرار بقيمة مختلفة يُرفض',async()=>{
  const s=await start('vowel_balloon',['vb']),b=answer(s,0,'فتحة');await Promise.all([call(b),call(b),call(b)]);
  expect(db.tables.user_points[0].total).toBe(105);expect(db.tables.game_results).toHaveLength(1);expect(row(s).settings.events).toHaveLength(1);
  expect((await call({...b,value:'كسرة'})).status).toBe(409);
 });
 it('لا هوية من جسم الطلب تتجاوز الطفل الحقيقي أو ملكية الجولة',async()=>{
  db.child='child-a';const s=await start('vowel_balloon',['vb']);db.child='child-b';expect((await call({...answer(s,0,'فتحة'),userId:'child-a'})).status).toBe(404);
  expect((await call({action:'resume',game:s.game,roundId:s.roundId})).status).toBe(404);db.child='child-a';expect((await call(answer(s,0,'فتحة'))).body.right).toBe(true);
  expect(db.tables.points_log[0].user_id).toBe('child-a');
 });
 it('خطأ حفظ الإجابة لا ينشئ مكافأة؛ فشل التقرير يصلح بإعادة التأكيد',async()=>{
  const s=await start('vowel_balloon',['vb']),b=answer(s,0,'فتحة');db.fail='game_settings:update';expect((await call(b)).status).toBe(503);expect(db.tables.points_log).toHaveLength(0);
  db.fail='game_results:insert';expect((await call(b)).body.result).toBe('pending');db.fail=null;expect((await call(b)).body.result).toBe('done');expect(db.tables.points_log).toHaveLength(1);expect(db.tables.game_results).toHaveLength(1);
 });
 it('الأسئلة والأعداد من القاعدة؛ لا قبول لأسئلة وهمية أو جولة ناقصة',async()=>{
  expect((await call({action:'start',game:'word_image_match',roundId:randomUUID(),ids:['one'],category:'عام'})).status).toBe(409);
  expect((await call({action:'start',game:'vowel_balloon',roundId:randomUUID(),ids:['fake'],category:'عام'})).status).toBe(409);
 });
 it('العجلة: أثر الحروف والتلميحات والكشف يُراجع، ومكافأتها من إعدادات المعلم',async()=>{
  db.tables.game_settings.push({game_id:'word-wheel',settings:{points_per_word:7,win_points:11},updated_at:'2026-01-01'});
  const s=await start('word_wheel',[],'عام',{wheelId:'wheel'});
  expect((await call(answer(s,0,undefined,{trace:[{type:'letter',letter:'ك'}]}))).status).toBe(400);
  const r=await call(answer(s,0,undefined,{trace:[...'كتب'].map(letter=>({type:'letter',letter}))}));expect(r.body).toMatchObject({right:true,awarded:7,summary:{solved:1,complete:true}});expect(db.tables.user_points[0].total).toBe(118);
 });
 it('الكلمة المكشوفة لا تكسب مكافأة، والتلميح لا يُقبل إذا عطّله المعلم',async()=>{
  const s=await start('word_wheel',[],'عام',{wheelId:'wheel'});
  const r=await call(answer(s,0,undefined,{trace:[{type:'letter',letter:'ب'},{type:'letter',letter:'ب'}]}));expect(r.body).toMatchObject({right:false,outcome:'revealed',awarded:0,summary:{solved:0}});
  const w={...s.wheel,settings:{...s.wheel.settings,hints_enabled:false}};expect(()=>verifyWheelTrace('كتب',w,[{type:'hint'}])).toThrow();
 });
 it('الحرف الناقص العشوائي جزء ثابت من لقطة الجولة، فلا يختلف بين الشاشة والتصحيح',async()=>{
  db.tables.word_wheel_configs[0].mode='complete';db.tables.word_wheel_configs[0].settings.complete_style='missing';
  for(let n=0;n<4;n++){const s=await start('word_wheel',[],'عام',{wheelId:'wheel'});const hidden=s.wheel.missingIndices['كتب'];
   const r=await call(answer(s,0,undefined,{trace:[{type:'letter',letter:'كتب'[hidden]}]}));expect(r.body.right).toBe(true);
   const resume=await call({action:'resume',game:s.game,roundId:s.roundId});expect(resume.body.wheel.missingIndices['كتب']).toBe(hidden);
  }
 });
 it('خطأ قاعدة العجلات لا يستبدل إعدادات المعلم بمحتوى افتراضي يمنح نقاطًا',async()=>{
  db.fail='word_wheel_configs:read';expect((await call({action:'start',game:'word_wheel',roundId:randomUUID(),wheelId:'wheel'})).status).toBe(503);expect(db.tables.game_settings).toHaveLength(0);
 });
 it('توقيت التحدي المفتوح من الخادم، والبطاقة المفتوحة توقفه دون تمديد اصطناعي',()=>{
  const r={game:'word_wheel',wheel:{mode:'challenge',time:10,center:'م',letters:['ل','ق'],settings:{show_card:true,hints_enabled:true,hints_limit:1}},questions:[{expected:'قلم',id:'قلم'}],answers:[{done:false,right:false,wrong:0,hints:0}],events:[],revision:0,points:10,closed:false,hints:0,clock:{started:false,running:false,left:10000,at:0}};
  const send=(round,action,at,extra={})=>applyTrainingEvent(round,{action,eventId:randomUUID(),...extra},at).round;
  const begun=send(r,'begin',1000);const expired=send(begun,'answer',12000,{value:'قلم'});expect(trainingSummary(expired)).toMatchObject({solved:0,complete:true});
  const valid=send(begun,'answer',2000,{value:'قلم'});expect(valid.answers[0].right).toBe(true);expect(valid.clock.running).toBe(false);
 });
 it('بطاقة شرح مفتوحة توقف الزمن؛ الاستئناف لا يعيد الوقت الأصلي',()=>{
  const r={game:'word_wheel',wheel:{mode:'challenge',time:10,center:'م',letters:['ل','ق','ح'],settings:{show_card:true,hints_enabled:true,hints_limit:1}},questions:[{expected:'قلم',id:'قلم'},{expected:'حلم',id:'حلم'}],answers:[0,1].map(()=>({done:false,right:false,wrong:0,hints:0})),events:[],revision:0,points:10,closed:false,hints:0,clock:{started:false,running:false,left:10000,at:0}};
  const send=(x,action,now,extra={})=>applyTrainingEvent(x,{action,eventId:randomUUID(),...extra},now).round;
  const begun=send(r,'begin',1000),found=send(begun,'answer',2000,{value:'قلم'});expect(found.clock).toMatchObject({running:false,left:9000});
  const resumed=send(found,'continue',50000);expect(resumed.clock.left).toBe(9000);
  const late=send(resumed,'answer',60000,{value:'حلم'});expect(trainingSummary(late)).toMatchObject({solved:1,complete:true});
 });
 it.each(['letter_catcher','vowel_balloon','word_smash','word_image_match','word_wheel','word_wheel_win','fc:w','huroof_letter:0','huroof_all_complete','challenge_win:room'])('لا مكافأة مباشرة بـ%s',async reason=>{expect((await call({reason},points)).status).toBe(409);});
 it.each(['letter_catcher','vowel_balloon','word_smash','word_image_match','word_wheel','discover_objects','huroof','challenge'])('لا درجة مباشرة لـ%s',async game_id=>{expect((await call({game_id,category:'عام',correct:999,total:999},results)).status).toBe(409);});
 it('اسم لعبة مجهول لا يفتح منفذ درجات جديدًا؛ وكلمة اليوم لا تقبل تاريخًا أو سببًا مختلقًا',async()=>{
  expect((await call({game_id:'invented',correct:999,total:999},results)).status).toBe(409);
  for(const reason of ['daily_login:fake','story:fake','homework_done:fake','daily_word:2000-01-01'])expect((await call({reason},points)).status).toBe(409);
  const b={reason:`daily_word:${new Date().toISOString().slice(0,10)}`};await call(b,points);await call(b,points);expect(db.tables.user_points[0].total).toBe(103);
 });
});
describe('التحدّي الجماعي والمراجعة والاستكشاف',()=>{
 it('غير المشارك لا يربح ولا ينقل غرفة الآخرين، ولا يقفز المشارك عن سؤال مفتوح',async()=>{
  db.child='outsider';expect((await call({room_id:'room',q_index:0,picked_option:'فتحة'},chAnswer)).status).toBe(403);expect((await call({room_id:'room',from_q_index:0},chAdvance)).status).toBe(403);
  db.child=null;expect((await call({room_id:'room',from_q_index:0},chAdvance)).body.advanced).toBe(false);
  expect((await call({room_id:'room',q_index:1,picked_option:'ضمة'},chAnswer)).body.won).toBe(false);
 });
 it('التحدي يصحح ويثبت الفائز مرة واحدة؛ النقاط من الغرفة بعد نهايتها',async()=>{
  const a={room_id:'room',q_index:0,picked_option:'فتحة'};await call(a,chAnswer);expect((await call(a,chAnswer)).body.won).toBe(false);
  expect((await call({room_id:'room',from_q_index:0},chAdvance)).body.advanced).toBe(true);
  await call({room_id:'room',q_index:1,picked_option:'ضمة'},chAnswer);await call({room_id:'room',from_q_index:1},chAdvance);
  const r=await call({room_id:'room',amount:999,tag:'win'},chResult);expect(r.body).toMatchObject({verified:true,amount:15,mine:2,other:0});await call({room_id:'room'},chResult);expect(db.tables.user_points[0].total).toBe(115);
 });
 it('المراجعة الذاتية لا تدعي إتقانًا، وتكرار نفس الطلب لا يرفع المستوى مرتين',async()=>{
  const b={word_id:'w',difficulty:'easy',review_id:randomUUID()};const r=await call(b,flash);expect(r.body).toMatchObject({ok:true,self_assessment:true,new_level:1,awarded:3});await call(b,flash);expect(db.tables.flashcard_progress[0].level).toBe(1);expect(db.tables.user_points[0].total).toBe(103);
  await call({...b,review_id:randomUUID()},flash);expect(db.tables.flashcard_progress[0].level).toBe(1);expect(db.tables.user_points[0].total).toBe(103);
  expect((await call({...b,difficulty:'forgot'},flash)).status).toBe(409);
 });
 it('بطاقة غير موجودة أو تقييم غير صالح لا يكتب مراجعة',async()=>{
  expect((await call({word_id:'fake',difficulty:'easy',review_id:randomUUID()},flash)).status).toBe(404);expect((await call({word_id:'w',difficulty:'perfect',review_id:randomUUID()},flash)).status).toBe(400);
  db.user.app_metadata.role='teacher';const before=structuredClone(db.tables);expect((await call({word_id:'w',difficulty:'easy',review_id:randomUUID()},flash)).body.preview).toBe(true);expect(db.tables).toEqual(before);
 });
 it('الاستكشاف لا يزعم حل اللغز، ويحترم وضع المعلم والمكافآت السابقة',async()=>{
  expect((await call({idx:0},view)).status).toBe(409);db.tables.game_settings.push({game_id:'huroof',settings:{mode:'explore'}});
  expect((await call({idx:0},view)).body).toMatchObject({viewed:true,mastery:false});await call({idx:0},view);expect(db.tables.user_points[0].total).toBe(102);
  expect((await call({idx:99},view)).status).toBe(400);
 });
 it.each(['teacher','admin','super_admin','supervisor'])('معاينة الحروف للدور %s لا تسجّل حل طفل أو مكافأة',async role=>{
  db.user.app_metadata.role=role;db.child='real-student';const r=await call({idx:0,answer:'أسد'},huroof);expect(r.body.preview).toBe(true);expect(db.tables.huroof_progress||[]).toHaveLength(0);expect(db.tables.points_log).toHaveLength(0);
 });
 it('النتيجة الجماعية ليست مبلغًا أو فوزًا يرسله العميل',()=>{expect(challengeOutcome({status:'playing'},'x')).toBeNull();expect(challengeOutcome({status:'finished',player1_id:'a',player2_id:'b',player1_score:100,questions:[]},'a')).toBeNull();});
});
