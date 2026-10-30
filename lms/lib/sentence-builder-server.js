import {createHash,randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {createClient} from './supabase-server';
import {getRole,isSuspended} from './auth-role';
import {SENTENCE_ID,SENTENCE_STAFF,freshSentences,validateSentences,activeSentences,sentenceStamp,sentenceSlots,sentenceRight,sentenceHint,publicSentence,sentenceUuid} from './sentence-builder';
import {deliverVerifiedEffect,awardVerifiedPoints} from './verified-effects';
export const sentenceJson=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0'}});
export const sentenceFailure=(message,status=503)=>Object.assign(new Error(message),{status});
export async function sentenceUser(staffOnly=false){const {data:{user}}=await createClient().auth.getUser();if(!user||!getRole(user)||isSuspended(user))return{error:sentenceJson({error:'سجّل الدخول لتتابع التدريب.'},401)};const staff=SENTENCE_STAFF.includes(getRole(user));if(staffOnly&&!staff)return{error:sentenceJson({error:'التحرير للمعلمين والإدارة فقط.'},403)};return{user,staff}}
export async function readSentenceRow(admin,key){const {data,error}=await admin.from('game_settings').select('game_id,settings,updated_at').eq('game_id',key).maybeSingle();if(error)throw sentenceFailure('تعذّر فتح التدريب. أعد المحاولة.');return data}
export async function loadSentences(admin){const row=await readSentenceRow(admin,SENTENCE_ID);if(!row)return{config:freshSentences(),version:null};const checked=validateSentences(row.settings);if(checked.error)throw sentenceFailure('تعذّرت قراءة إعدادات التدريب.');return{config:checked.config,version:row.updated_at}}
export async function sentenceBalance(admin,userId){const {data,error}=await admin.from('user_points').select('total').eq('user_id',userId).maybeSingle();if(error)throw sentenceFailure('تعذّر عرض رصيدك. أعد المحاولة.');return data?.total??0}
const progressKey=(userId,epoch)=>`${SENTENCE_ID}:progress:${userId}:${epoch}`;
const hash=value=>createHash('sha256').update(value).digest('hex').slice(0,24);
async function changeProgress(admin,owner,userId,config,mutate){
 for(let i=0;i<6;i++){
  const key=progressKey(userId,config.epoch),row=await readSentenceRow(admin,key);
  const state=row?.settings||{generation:randomUUID(),completed:[],active:null,events:[]};
  const next=mutate(structuredClone(state)),updated_at=new Date(Math.max(Date.now(),(Date.parse(row?.updated_at)||0)+1)).toISOString();
  const value={game_id:key,settings:next,updated_by:owner,updated_at};
  const saved=row?await admin.from('game_settings').update(value).eq('game_id',key).eq('updated_at',row.updated_at).select('game_id').maybeSingle():await admin.from('game_settings').insert(value).select('game_id').single();
  if(saved.error?.code==='23505'||!saved.error&&!saved.data)continue;if(saved.error)throw sentenceFailure('تعذّر حفظ تقدّمك. أعد المحاولة.');return next;
 }throw sentenceFailure('نحفظ محاولة أخرى. أعد المحاولة.',409);
}
const validCompleted=(state,items)=>state.completed.filter(done=>items.some(item=>item.id===done.id&&sentenceStamp(item)===done.stamp));
function assertActive(state,body,config){const active=state.active,item=activeSentences(config).find(x=>x.id===active?.id);if(!active||active.nonce!==body.sessionId||!item||sentenceStamp(item)!==active.stamp||active.expiresAt<Date.now())throw sentenceFailure('جدّد التدريب لمتابعة الجملة الحالية.',409);return item}
async function settleReward(admin,auth,userId,config,state,event){
 const reason=`${SENTENCE_ID}:${config.epoch}:${state.generation}:${hash(event.stamp)}`;
 const reward=await deliverVerifiedEffect(admin,`${SENTENCE_ID}:reward:${userId}:${reason}`,auth.user.id,()=>awardVerifiedPoints(admin,userId,reason,event.amount));
 if(reward.state!=='done')throw sentenceFailure('نؤكّد نقاطك. أعد تأكيد الجملة؛ لن تُحتسب مرتين.',409);return reward;
}
/* replay: «العب مجدداً» بعد إكمال كل الجمل — جولة مراجعة (state.review) بلا نقاط جديدة (نقاط كل جملة تُمنح مرة
   واحدة لكل دورة) ومساعدتها مجانية، والتقدم الأصلي state.completed لا يُمس. جملة جديدة يضيفها المعلم تُنهي المراجعة
   فيعود الطفل للمسار العادي بنقاطه */
export async function startSentenceGame(admin,auth,userId,replay=false){
 const {config}=await loadSentences(admin);if(!config.enabled)throw sentenceFailure('التدريب يستريح الآن. عد لاحقًا.',409);
 const items=activeSentences(config);if(!items.length)throw sentenceFailure('نجهّز جملًا جديدة. عد قريبًا.',409);
 const state=await changeProgress(admin,auth.user.id,userId,config,state=>{
  state.completed=validCompleted(state,items);const fresh=items.find(item=>!state.completed.some(done=>done.id===item.id));
  if(fresh){if(state.review){state.review=null;if(state.active?.review)state.active=null}}
  else if(replay){state.review={completed:[]};state.active=null}
  const review=!fresh&&Boolean(state.review);
  if(review)state.review.completed=validCompleted(state.review,items);
  const done=review?state.review.completed:state.completed,item=items.find(item=>!done.some(d=>d.id===item.id));
  if(!item){state.active=null;return state}
  if(state.active?.id!==item.id||state.active.stamp!==sentenceStamp(item)||state.active.expiresAt<Date.now()||Boolean(state.active.review)!==review)state.active={id:item.id,stamp:sentenceStamp(item),nonce:randomUUID(),expiresAt:Date.now()+86400000,...(review?{review:true}:{})};
  return state;
 });
 // استئناف منح آخر إجابة إن انقطع الاتصال بعد حفظ صحتها وقبل إتمام النقاط (إجابات المراجعة بلا نقاط).
 const lastRight=[...state.events].reverse().find(e=>e.right&&!e.review);
 if(lastRight)await settleReward(admin,auth,userId,config,state,lastRight);
 const item=items.find(item=>item.id===state.active?.id);
 return {finished:!item,review:Boolean(item&&state.active.review),sessionId:state.active?.nonce,question:item?publicSentence(item):null,index:item?items.indexOf(item):items.length,total:items.length,completed:state.completed.length,settings:config.settings,points:await sentenceBalance(admin,userId)};
}
export async function answerSentenceGame(admin,auth,userId,body){
 if(!sentenceUuid(body.requestId)||!sentenceUuid(body.sessionId))throw sentenceFailure('أكمل الجملة من التدريب.',400);
 const {config}=await loadSentences(admin);if(!config.enabled)throw sentenceFailure('التدريب يستريح الآن. عد لاحقًا.',409);
 const trace=JSON.stringify([body.sessionId,body.slots]);let event,item;
 const state=await changeProgress(admin,auth.user.id,userId,config,state=>{
  const previous=state.events.find(e=>e.id===body.requestId);
  if(previous){if(previous.trace!==trace)throw sentenceFailure('هذا التأكيد يخص محاولة أخرى.',409);event=previous;item=config.lessons.find(x=>x.id===event.questionId);if(!item||sentenceStamp(item)!==event.stamp)throw sentenceFailure('تغيّرت الجملة. جدّد التدريب.',409);return state}
  item=assertActive(state,body,config);if(!sentenceSlots(item,body.slots))throw sentenceFailure('اختر كلمات الجملة من الصندوق.',400);
  const review=Boolean(state.active.review);
  event={id:body.requestId,trace,questionId:item.id,stamp:sentenceStamp(item),right:sentenceRight(item,body.slots),amount:review?0:config.settings.reward,...(review?{review:true}:{})};
  state.events=[...state.events.slice(-199),event];
  if(event.right){const mark=list=>[...(list||[]).filter(x=>x.id!==item.id),{id:item.id,stamp:sentenceStamp(item)}];if(review)state.review={completed:mark(state.review?.completed)};else state.completed=mark(state.completed);state.active=null}return state;
 });
 let reward={state:'done',amount:0};
 if(event.right&&!event.review){
  reward=await settleReward(admin,auth,userId,config,state,event);
  if(validCompleted(state,activeSentences(config)).length===activeSentences(config).length){
   await deliverVerifiedEffect(admin,`${SENTENCE_ID}:result:${userId}:${state.generation}:${config.epoch}`,auth.user.id,async()=>{const {error}=await admin.from('game_results').insert({user_id:userId,game_id:SENTENCE_ID,category:config.title,correct:activeSentences(config).length,wrong:state.events.filter(e=>!e.right).length,total:activeSentences(config).length});return{state:error?'pending':'done'}});
  }
 }
 return{right:event.right,review:Boolean(event.review),sentence:event.right?item.words.join(' ')+item.end:null,reward:event.right?(reward.amount??0):0,points:await sentenceBalance(admin,userId)};
}
async function debit(admin,userId,reason,amount){
 const {data:log,error}=await admin.from('points_log').select('id').eq('user_id',userId).eq('reason',reason).maybeSingle();if(error)return{state:'pending'};if(log||amount===0)return{state:'done'};
 for(let i=0;i<4;i++){const before=await sentenceBalance(admin,userId);if(before<amount)return{state:'insufficient'};const write=await admin.from('user_points').update({total:before-amount,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('total',before).select('total').maybeSingle();if(write.error)return{state:'pending'};if(!write.data)continue;const saved=await admin.from('points_log').insert({user_id:userId,reason,delta:-amount});return{state:saved.error?'review':'done'}}return{state:'pending'};
}
export async function hintSentenceGame(admin,auth,userId,body){
 if(!sentenceUuid(body.sessionId))throw sentenceFailure('ابدأ الجملة من التدريب.',400);
 const {config}=await loadSentences(admin);if(!config.enabled)throw sentenceFailure('التدريب يستريح الآن. عد لاحقًا.',409);
 const row=await readSentenceRow(admin,progressKey(userId,config.epoch));if(!row)throw sentenceFailure('هذه الجولة غير متاحة لهذا الحساب.',404);
 const item=assertActive(row.settings,body,config),hint=sentenceHint(item,body.slots,config.settings.hintMode);if(!hint)throw sentenceFailure('جرّب ترتيب الجملة ثم اضغط تحقّق.',400);
 if(row.settings.active.review)return{state:'done',slots:hint.slots,cost:0,points:await sentenceBalance(admin,userId)};
 const cost=config.settings.helpCost;if(body.expectedCost!==cost)return{state:'cost_changed',cost,points:await sentenceBalance(admin,userId)};
 const key=`${SENTENCE_ID}:hint:${body.sessionId}:${hint.position}`;
 const result=await deliverVerifiedEffect(admin,key,auth.user.id,async()=>({...await debit(admin,userId,key,cost),cost}));
 if(result.state==='insufficient'){await admin.from('game_settings').delete().eq('game_id',key).eq('settings->>state','insufficient');return{state:'insufficient',cost,points:await sentenceBalance(admin,userId)}}
 if(result.state!=='done')throw sentenceFailure('نؤكّد المساعدة. أعد الضغط؛ لن تُخصم مرتين.',409);
 return{state:'done',slots:hint.slots,cost:result.cost??cost,points:await sentenceBalance(admin,userId)};
}
export async function resetSentenceStudent(admin,auth,userId){if(!sentenceUuid(userId))throw sentenceFailure('أدخل معرّف الطالب الصحيح.',400);const {config}=await loadSentences(admin);await changeProgress(admin,auth.user.id,userId,config,()=>({generation:randomUUID(),completed:[],active:null,events:[]}));return{reset:true}}
