import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from './supabase-server';
import { getRole, isSuspended } from './auth-role';
import { SCRABBLE_ID, SCRABBLE_STAFF, freshScrabble, validateScrabble, playableBoards, roundNeeds, checkScrabbleAnswer, scrabbleUuid } from './scrabble';
import { deliverVerifiedEffect, awardVerifiedPoints } from './verified-effects';
export const scrabbleJson = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
const failure = (message, status=503) => Object.assign(new Error(message), { status });
export async function scrabbleUser(staffOnly=false) {
  const { data:{ user } } = await createClient().auth.getUser();
  if (!user || !getRole(user) || isSuspended(user)) return { error:scrabbleJson({error:'سجّل الدخول لتكمل اللعبة.'},401) };
  const staff=SCRABBLE_STAFF.includes(getRole(user));
  if(staffOnly&&!staff)return {error:scrabbleJson({error:'التحرير للمعلمين والإدارة فقط.'},403)};
  return {user,staff};
}
export async function readScrabbleRow(admin,key){const {data,error}=await admin.from('game_settings').select('game_id, settings, updated_at').eq('game_id',key).maybeSingle();if(error)throw failure('تعذّر فتح اللعبة. أعد المحاولة.');return data;}
export async function loadScrabble(admin){const row=await readScrabbleRow(admin,SCRABBLE_ID);if(!row)return{config:freshScrabble(),version:null};const checked=validateScrabble(row.settings);if(checked.error)throw failure('تعذّرت قراءة إعدادات اللعبة.');return{config:checked.config,version:row.updated_at};}
async function replaceRow(admin,row,settings){const updated_at=new Date(Math.max(Date.now(),Date.parse(row.updated_at)+1)).toISOString();const {data,error}=await admin.from('game_settings').update({settings,updated_at}).eq('game_id',row.game_id).eq('updated_at',row.updated_at).select('game_id,settings,updated_at').maybeSingle();if(error)throw failure('تعذّر حفظ المحاولة. أعد المحاولة.');return data;}
export async function scrabbleBalance(admin,userId){const {data,error}=await admin.from('user_points').select('total').eq('user_id',userId).maybeSingle();if(error)throw failure('تعذّرت قراءة الرصيد.');return data?.total??0;}
export async function startScrabbleGame(admin,auth,userId,boardId){
  const {config}=await loadScrabble(admin);if(!config.enabled&&!auth.staff)throw failure('اللعبة تستريح الآن. عد لاحقًا.',409);
  const board=playableBoards(config).find(b=>b.id===boardId);if(!board)throw failure('اختر لوحة متاحة.',400);
  const id=randomUUID(),session={id,owner:auth.user.id,userId,board,settings:config.settings,epoch:config.epoch,cursor:0,events:[],expiresAt:Date.now()+24*60*60*1000};
  if(!auth.staff){const {error}=await admin.from('game_settings').insert({game_id:`scrabble:session:${id}`,settings:session,updated_by:auth.user.id,updated_at:new Date().toISOString()});if(error)throw failure('تعذّر بدء اللعبة. أعد المحاولة.');}
  return {sessionId:id,preview:auth.staff,board,settings:session.settings,cursor:0,points:auth.staff?null:await scrabbleBalance(admin,userId)};
}
async function ownSession(admin,auth,userId,id){if(!scrabbleUuid(id))throw failure('ابدأ اللعبة من جديد.',400);const row=await readScrabbleRow(admin,`scrabble:session:${id}`);if(!row||row.settings.owner!==auth.user.id||row.settings.userId!==userId)throw failure('هذه الجولة غير متاحة لهذا الحساب.',404);if(row.settings.expiresAt<Date.now())throw failure('انتهت الجولة. ابدأ من جديد.',409);return row;}
export async function answerScrabbleGame(admin,auth,userId,body){
  if(!scrabbleUuid(body.requestId)||!Number.isInteger(body.index)||!Array.isArray(body.placements))throw failure('أكمل الكلمة من اللوحة.',400);
  let row,event;const trace=JSON.stringify({index:body.index,placements:body.placements});
  for(let tries=0;tries<5;tries++){
    row=await ownSession(admin,auth,userId,body.sessionId);const s=row.settings;
    event=s.events.find(e=>e.id===body.requestId);
    if(event){if(event.trace!==trace)throw failure('هذا التأكيد يخص محاولة أخرى.',409);break;}
    if(s.cursor!==body.index||!s.board.rounds[body.index])throw failure('أكمل الكلمة الحالية أولًا.',409);
    if(s.events.length>=1000)throw failure('ابدأ جولة جديدة لمتابعة اللعب.',409);
    const checked=checkScrabbleAnswer(s.board,body.index,body.placements);if(checked.error)throw failure(checked.error,400);
    event={id:body.requestId,index:body.index,trace,right:checked.right};
    const next={...s,cursor:s.cursor+(checked.right?1:0),events:[...s.events,event]};
    const saved=await replaceRow(admin,row,next);if(saved){row=saved;break;}event=null;
  }
  if(!event)throw failure('نحفظ محاولة أخرى. أعد المحاولة.',409);
  let reward={state:'none'};
  const s=row.settings,r=s.board.rounds[event.index];
  if(event.right){
    const digest=createHash('sha256').update(JSON.stringify([s.epoch,s.board.id,r])).digest('hex').slice(0,24);
    reward=await deliverVerifiedEffect(admin,`scrabble:reward:${userId}:${digest}`,auth.user.id,()=>awardVerifiedPoints(admin,userId,`scrabble:${digest}`,s.settings.reward));
  }
  if(s.cursor===s.board.rounds.length){await deliverVerifiedEffect(admin,`scrabble:result:${s.id}`,auth.user.id,async()=>{const {error}=await admin.from('game_results').insert({user_id:userId,game_id:'scrabble',category:s.board.title,correct:s.events.filter(e=>e.right).length,wrong:s.events.filter(e=>!e.right).length,total:s.board.rounds.length});return{state:error?'pending':'done'};});}
  return {verified:true,right:event.right,cursor:s.cursor,reward:reward.state,points:await scrabbleBalance(admin,userId)};
}
async function debitHint(admin,userId,reason,amount){
  const {data:old,error:oldError}=await admin.from('points_log').select('id').eq('user_id',userId).eq('reason',reason).maybeSingle();if(oldError)return{state:'pending'};if(old)return{state:'done',points:await scrabbleBalance(admin,userId)};
  if(amount===0)return{state:'done',points:await scrabbleBalance(admin,userId)};
  for(let retry=0;retry<4;retry++){
    const before=await scrabbleBalance(admin,userId);if(before<amount)return{state:'insufficient',points:before};
    const {data,error}=await admin.from('user_points').update({total:before-amount,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('total',before).select('total').maybeSingle();
    if(error)return{state:'pending'};if(!data)continue;
    const {error:logError}=await admin.from('points_log').insert({user_id:userId,reason,delta:-amount});
    return logError?{state:'review',points:data.total}:{state:'done',points:data.total};
  }return{state:'pending'};
}
export async function hintScrabbleGame(admin,auth,userId,body){
  if(!Number.isInteger(body.index)||!Number.isInteger(body.pos))throw failure('اختر مكان حرف من اللوحة.',400);
  const row=await ownSession(admin,auth,userId,body.sessionId),s=row.settings;
  if(s.cursor!==body.index)throw failure('المساعدة للكلمة الحالية فقط.',409);
  const n=roundNeeds(s.board,s.cursor).find(n=>n.pos===body.pos);if(!n)throw failure('اختر مكان حرف من اللوحة.',400);
  const key=`scrabble:hint:${s.id}:${s.cursor}:${n.pos}`;
  const result=await deliverVerifiedEffect(admin,key,auth.user.id,()=>debitHint(admin,userId,key,s.settings.helpCost));
  // طلب رُفض لعدم كفاية الرصيد لا يحجز الحرف للأبد؛ يُعاد عندما يكسب الطالب نقاطًا.
  if(result.state==='insufficient'){await admin.from('game_settings').delete().eq('game_id',key).eq('settings->>state','insufficient');return{...result,error:'رصيدك لا يكفي الآن.'};}
  if(result.state!=='done')throw failure('نؤكّد المساعدة. أعد الضغط؛ لن تُخصم مرتين.',409);
  return{...result,hint:n,cost:s.settings.helpCost};
}
