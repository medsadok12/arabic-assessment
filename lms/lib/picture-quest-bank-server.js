import {completeQuestWorlds} from './picture-quest-content-pack';
import {randomUUID} from 'node:crypto';
import {QUEST_BANK_ID,freshQuestBank,validateQuestBank,bankReadiness,bankQuestion,selectBankWords,bankWordReady,stageReadiness,stageWords,mixedFinalWords} from './picture-quest-bank';
import {questRow,questBalance,questFailure,loadPictureQuest} from './picture-quest-server';
import {publicQuestQuestion,questRecording,questUuid,questEnabled} from './picture-quest';
import {deliverVerifiedEffect,awardVerifiedPoints} from './verified-effects';
export async function prepareQuestBankContent(admin,config){
 if(config.contentPackVersion>=1)return config;
 const original=await loadPictureQuest(admin);
 return completeQuestWorlds(config,original.config);
}
export async function loadQuestBank(admin){
 const row=await questRow(admin,QUEST_BANK_ID);
 if(!row){const original=await loadPictureQuest(admin);return{config:completeQuestWorlds(freshQuestBank(original.config.settings),original.config),version:null,signature:'starter:'+String(original.version)}}
 const checked=validateQuestBank(row.settings);if(checked.error)throw questFailure('تعذّرت قراءة بنك الكلمات.');
 return{config:await prepareQuestBankContent(admin,checked.config),version:row.updated_at,signature:row.updated_at};
}
export async function writeQuestBank(admin,auth,body){if(!['draft','publish'].includes(body.action)||(body.version!==null&&typeof body.version!=='string')||(body.draftVersion!==null&&typeof body.draftVersion!=='string'))throw questFailure('أعد تحميل بنك الكلمات.',400);const checked=validateQuestBank(body.config);if(checked.error)throw questFailure(checked.error,400);checked.config=await prepareQuestBankContent(admin,checked.config);if(body.action==='publish'&&checked.config.enabled&&bankReadiness(checked.config).some(w=>w.blocking))throw questFailure('أكمل الصور أو الرموز والخيارات للكلمات المتاحة، أو أوقف الكلمات الناقصة قبل النشر.',400);const draft=body.action==='draft',id=draft?`${QUEST_BANK_ID}:draft:${auth.user.id}`:QUEST_BANK_ID,old=draft?body.draftVersion:body.version,updated_at=new Date(Math.max(Date.now(),(Date.parse(old)||0)+1)).toISOString(),row={game_id:id,settings:draft?{config:checked.config,baseVersion:body.version}:checked.config,updated_by:auth.user.id,updated_at};const r=old===null?await admin.from('game_settings').insert(row).select('updated_at').single():await admin.from('game_settings').update(row).eq('game_id',id).eq('updated_at',old).select('updated_at').maybeSingle();if(r.error?.code==='23505'||!r.error&&!r.data)throw questFailure('تغيّر البنك أثناء التحرير. احتفظ بنسختك وأعد التحميل.',409);if(r.error)throw questFailure('تعذّر حفظ البنك.');if(!draft&&body.draftVersion)await admin.from('game_settings').delete().eq('game_id',`${QUEST_BANK_ID}:draft:${auth.user.id}`).eq('updated_at',body.draftVersion);return{config:checked.config,version:draft?body.version:updated_at,draftVersion:draft?updated_at:null}}
export const bankProgressKey=(userId,epoch)=>`${QUEST_BANK_ID}:progress:${userId}:${epoch}`;
const stageKey=s=>`${s.topicId}:${s.stage}`;
function prepare(state,bank){
 state.mastery??={};state.events??=[];state.attempts??={};state.completions??={};
 if(state.round&&!state.round.key)state.legacyRound??=state.round;
 if(!state.finalAccess){const ids=bank.topics.filter(t=>t.enabled).map(t=>t.id);if(ids.length&&ids.every(id=>[1,2,3].every(stage=>state.completions[`${id}:${stage}`])))state.finalAccess={topicIds:ids,unlockedAt:Date.now()};}
 return state;
}
async function mutateProgress(admin,owner,userId,bank,fn){
 for(let retry=0;retry<6;retry++){
  const id=bankProgressKey(userId,bank.epoch),old=await questRow(admin,id),state=prepare(structuredClone(old?.settings||{}),bank),next=prepare(fn(state),bank);
  if(next.round?.key)next.attempts[next.round.key]=structuredClone(next.round);
  const updated_at=new Date(Math.max(Date.now(),(Date.parse(old?.updated_at)||0)+1)).toISOString(),row={game_id:id,settings:next,updated_by:owner,updated_at};
  const r=old?await admin.from('game_settings').update(row).eq('game_id',id).eq('updated_at',old.updated_at).select('game_id').maybeSingle():await admin.from('game_settings').insert(row).select('game_id').single();
  if(r.error?.code==='23505'||!r.error&&!r.data)continue;if(r.error)throw questFailure('تعذّر حفظ المرحلة.');return next;
 }
 throw questFailure('هناك إجابة قيد الحفظ. أعد المحاولة.',409);
}
export function bankCatalog(bank,state={}){
 state=prepare(structuredClone(state),bank);
 const ready=bank.words.filter(w=>w.stage!==4&&bankWordReady(w));
 const finalTopics=state.finalAccess?.topicIds||bank.topics.filter(t=>t.enabled).map(t=>t.id);
 const finalReady=!!finalTopics.length&&finalTopics.every(id=>stageReadiness(bank,id,4).ready)&& (!!state.completions['final:4']||!bank.words.some(w=>finalTopics.includes(w.topicId)&&w.stage===4&&state.mastery[w.id]?.seen));
 return{title:bank.title,settings:bank.settings,enabled:bank.enabled,hubDepthEnabled:bank.hubDepthEnabled!==false,resume:state.round?.key&&!state.round.review&&state.round.index<state.round.questions.length?state.round.selection:null,reviewEnabled:bank.reviewEnabled,reviewCount:ready.filter(w=>state.mastery[w.id]?.seen).length,
  topics:bank.topics.filter(t=>t.enabled).map(t=>({...t,stages:[1,2,3].map(stage=>{const key=`${t.id}:${stage}`,completed=!!state.completions[key],attempt=state.attempts[key],unlocked=stage===1||!!state.completions[`${t.id}:${stage-1}`];return{...stageReadiness(bank,t.id,stage),completed,unlocked,resume:!completed&&!!attempt&&attempt.index<attempt.questions.length,index:attempt?.index||0};})})),
  final:{enabled:bank.finalEnabled!==false,unlocked:!!state.finalAccess,ready:finalReady,total:finalTopics.length*3,completed:!!state.completions['final:4'],resume:!!state.attempts['final:4']&&!state.completions['final:4'],index:state.attempts['final:4']?.index||0}};
}
export async function readBankCatalog(admin,auth,userId,bank){const state=await mutateProgress(admin,auth.user.id,userId,bank,s=>s);return bankCatalog(bank,state)}
function selectionOf(body){
 // Old round-based requests cannot accidentally launch or finish a new stage.
 if(typeof body.topicId!=='string'||!/^[a-z0-9_-]{1,70}$/i.test(body.topicId)||![1,2,3,4].includes(body.stage)||body.topicId==='final'&&body.stage!==4||!['final','review'].includes(body.topicId)&&body.stage===4)throw questFailure('اختر مرحلة من صفحة الموضوعات.',400);
 return{topicId:body.topicId,stage:body.stage};
}
const sameSelection=(a,b)=>a&&a.topicId===b.topicId&&a.stage===b.stage;
function liveQuestion(bank,q){if(!q)return q;const w=bank.words.find(w=>w.id===q.id);return w?{...q,mediaEnabled:{...q.mediaEnabled,...w.mediaEnabled}}:q;}
function response(bank,state,points){
 const r=state.round,q=liveQuestion(bank,r?.questions[r.index]),next=liveQuestion(bank,r?.questions[r.index+1]);
 return{finished:!q,attemptId:r?.id,sessionId:r?.sessionId,question:q?publicQuestQuestion(q):null,feedback:q?{correctChoiceId:q.correctId,word:q.options.find(o=>o.id===q.correctId).label,answer_audio:questRecording(q,'answer_audio')}:null,upcomingImage:questRecording(next,'image_url'),settings:bank.settings,title:r?.title||bank.title,subtitle:'انظر إلى الصورة، ثم اختر الكلمة.',index:r?.index||0,total:r?.questions.length||0,rejected:r?.rejected||[],hintUsed:!!r?.hintUsed,review:!!r?.review,points,provisional:r?.provisional||0,stage:r?.selection.stage,checkpoint:!!q&&bank.breaksEnabled!==false&&r.index>0&&r.index%5===0,independent:r?.completed.filter(w=>w.independent).length||0,records:r?.completed||[]};
}
function assertAvailable(bank,state,selection){
 const {topicId,stage}=selection;
 if(topicId==='review'){if(!bank.reviewEnabled)throw questFailure('المراجعة متوقفة.',409);return}
 if(topicId==='final'){
  if(bank.finalEnabled===false||!state.finalAccess)throw questFailure('أكمل المراحل الثلاث في جميع الموضوعات أولًا.',409);
  if(!state.finalAccess.topicIds.every(id=>stageReadiness(bank,id,4).ready)||!state.completions['final:4']&&bank.words.some(w=>state.finalAccess.topicIds.includes(w.topicId)&&w.stage===4&&state.mastery[w.id]?.seen))throw questFailure('كلمات مرحلة الأذكياء قيد التجهيز.',409);return;
 }
 if(!bank.topics.some(t=>t.id===topicId&&t.enabled))throw questFailure('هذا الموضوع غير متاح.',409);
 if(stage>1&&!state.completions[`${topicId}:${stage-1}`])throw questFailure('أكمل المرحلة السابقة أولًا.',409);
 if(!stageReadiness(bank,topicId,stage).ready)throw questFailure('هذه المرحلة قيد التجهيز. ستتاح بعد اكتمال كلماتها وصورها.',409);
}
async function settleCompletions(admin,auth,userId,bank,state){
 // Recover an outstanding reward from the previous round-based version once.
 for(const e of state.events.filter(e=>e.selection?.stage===undefined&&e.amount&&!e.review&&!e.settled)){
  const reason=`${QUEST_BANK_ID}:${bank.epoch}:${e.wordId}`,result=await deliverVerifiedEffect(admin,`${reason}:reward:${userId}`,auth.user.id,()=>awardVerifiedPoints(admin,userId,reason,e.amount));
  if(result.state!=='done')throw questFailure('نؤكّد النقاط السابقة؛ أعد المحاولة.',409);
  state=await mutateProgress(admin,auth.user.id,userId,bank,s=>{const old=s.events.find(x=>x.id===e.id);if(old)old.settled=true;return s});
 }
 for(const [key,c]of Object.entries(state.completions)){
  if(c.settled)continue;
  if(c.amount){const reason=`${QUEST_BANK_ID}:${bank.epoch}:stage:${key}`,reward=await deliverVerifiedEffect(admin,`${reason}:reward:${userId}`,auth.user.id,()=>awardVerifiedPoints(admin,userId,reason,c.amount));if(reward.state!=='done')throw questFailure('نؤكّد نقاط المرحلة؛ أعد المحاولة دون تكرار المكافأة.',409);}
  const logged=await deliverVerifiedEffect(admin,`${QUEST_BANK_ID}:stage-result:${userId}:${bank.epoch}:${key}`,auth.user.id,async()=>{const{error}=await admin.from('game_results').insert({user_id:userId,game_id:'picture-quest-topics',category:c.title,correct:c.correct,wrong:c.wrong,total:c.total});return{state:error?'pending':'done'}});
  if(logged.state!=='done')throw questFailure('تعذّر تأكيد نتيجة المرحلة. أعد المحاولة.',409);
  state=await mutateProgress(admin,auth.user.id,userId,bank,s=>{if(s.completions[key])s.completions[key].settled=true;return s});
 }
 return state;
}
export async function questBankSession(admin,auth,userId,body){
 const{config:bank}=await loadQuestBank(admin);
 const selection=selectionOf(body),key=stageKey(selection);
 if(body.action==='exit'){
  if(!questUuid(body.attemptId))throw questFailure('أعد فتح المرحلة قبل الخروج.',400);
  const state=await mutateProgress(admin,auth.user.id,userId,bank,s=>{
   const r=s.attempts[key]||s.round;if(r?.id!==body.attemptId)throw questFailure('تغيّرت المحاولة؛ أعد فتح المرحلة.',409);
   if(r.index<r.questions.length){delete s.attempts[key];s.events=s.events.filter(e=>e.roundId!==r.id);if(s.round?.id===r.id)s.round=null;}
   return s;
  });return{exited:true,points:await questBalance(admin,userId),completed:!!state.completions[key]};
 }
 if(!bank.enabled)throw questFailure('مغامرات الكلمات متوقفة حاليًا.',409);
 if(body.action==='start'||body.action==='replay'){
  let state=await mutateProgress(admin,auth.user.id,userId,bank,s=>{
   assertAvailable(bank,s,selection);
   const existing=s.attempts[key];if(existing&&(body.action==='start'||existing.index<existing.questions.length)){s.round=existing;return s;}
   const seed=`${userId}:${bank.epoch}:${key}`,words=selection.topicId==='final'?mixedFinalWords(bank,s.finalAccess.topicIds,seed):selection.topicId==='review'?selectBankWords(bank,{topicId:'review',level:3,round:0},s.mastery,seed):stageWords(bank,selection.topicId,selection.stage,seed);
   if(!words.length)throw questFailure('تعلّم كلمات أولًا، ثم عد للمراجعة.',409);
   const id=randomUUID(),topic=bank.topics.find(t=>t.id===selection.topicId),title=selection.topicId==='final'?'مرحلة الأذكياء':selection.topicId==='review'?'رحلة المراجعة':`${topic.title} · المرحلة ${selection.stage}`;
   s.round={id,key,selection,title,review:selection.topicId==='review'||!!s.completions[key],questions:words.map(w=>bankQuestion(bank,w,w.level,id)),index:0,sessionId:randomUUID(),rejected:[],assisted:false,hintUsed:false,completed:[],provisional:0,wrong:0};return s;
  });state=await settleCompletions(admin,auth,userId,bank,state);return response(bank,state,await questBalance(admin,userId));
 }
 if(!questUuid(body.sessionId))throw questFailure('افتح المرحلة مجددًا.',400);
 if(body.action==='answer'&&(!questUuid(body.requestId)||typeof body.choiceId!=='string'))throw questFailure('اختر إجابة من المرحلة.',400);
 let event,hint;
 let state=await mutateProgress(admin,auth.user.id,userId,bank,s=>{
  if(body.action==='answer'){const previous=s.events.find(e=>e.id===body.requestId);if(previous){if(previous.trace!==JSON.stringify([body.sessionId,body.choiceId,body.timedOut===true])||!sameSelection(previous.selection,selection)||s.round?.id!==previous.roundId)throw questFailure('هذا التأكيد يخص محاولة أخرى.',409);event=previous;return s;}}
  const r=s.round;if(!r||!sameSelection(r.selection,selection)||r.sessionId!==body.sessionId||!r.questions[r.index])throw questFailure('تغيّرت المرحلة. افتحها مجددًا.',409);
  const q=liveQuestion(bank,r.questions[r.index]);
  if(body.action==='hint'){
   if(!bank.settings.help)throw questFailure('المساعدة متوقفة.',409);r.assisted=true;
   if(!r.hintUsed){const wrong=q.options.find(o=>o.id!==q.correctId&&!r.rejected.includes(o.id));if(wrong)r.rejected.push(wrong.id);r.hintUsed=true;}
   hint={hint:q.hint,hint_audio:questRecording(q,'hint_audio'),rejected:r.rejected};return s;
  }
  if(body.action!=='answer')throw questFailure('الإجراء غير صالح.',400);
  const timedOut=body.timedOut===true;
  if(timedOut&&(!questEnabled(bank.settings,'timer')||body.choiceId!==''))throw questFailure('طلب انتهاء الوقت غير صالح.',400);
  if(!timedOut&&!q.options.some(o=>o.id===body.choiceId))throw questFailure('اختر من الكلمات الظاهرة.',400);
  const right=!timedOut&&q.correctId===body.choiceId;
  event={id:body.requestId,trace:JSON.stringify([body.sessionId,body.choiceId,timedOut]),selection,roundId:r.id,wordId:q.id,right,timedOut,review:r.review,assisted:r.assisted||timedOut,word:q.options.find(o=>o.id===q.correctId).label,answer_audio:right?questRecording(q,'answer_audio'):'',amount:right&&!r.review&&!s.mastery[q.id]?.rewardRequestId&&questEnabled(bank.settings,'reward')?bank.settings.reward:0};
  s.events=[...s.events.slice(-399),event];r.provisional+=event.amount;if(!right)r.wrong++;
  if(right||timedOut){
   r.completed.push({id:q.id,word:event.word,independent:right&&!r.assisted,assisted:r.assisted||timedOut,timedOut,right,amount:event.amount});r.index++;r.sessionId=randomUUID();r.rejected=[];r.assisted=false;r.hintUsed=false;
   if(r.index===r.questions.length){
    for(const w of r.completed){const prior=s.mastery[w.id]||{};s.mastery[w.id]={...prior,seen:(prior.seen||0)+1,independent:w.independent,at:Date.now(),...(w.amount?{rewardRequestId:r.id}:{})};}
    if(!r.review&&!s.completions[key])s.completions[key]={attemptId:r.id,at:Date.now(),title:r.title,amount:r.provisional,total:r.questions.length,correct:r.completed.filter(w=>w.right).length,wrong:r.wrong,settled:false};
   }
  }else{r.assisted=true;r.rejected=[...new Set([...r.rejected,body.choiceId])];}
  return s;
 });
 if(body.action==='hint')return hint;
 state=await settleCompletions(admin,auth,userId,bank,state);
 const points=await questBalance(admin,userId);
 return{right:event.right,timedOut:event.timedOut,word:event.right||event.timedOut?event.word:null,answer_audio:event.answer_audio,assisted:event.assisted,reward:0,provisional:state.round?.provisional||0,points,...(event.right||event.timedOut?{next:response(bank,state,points)}:{})};
}
