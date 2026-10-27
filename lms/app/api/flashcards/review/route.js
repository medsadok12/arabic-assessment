import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient } from '../../../../lib/supabase-server';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { isStaff, isSuspended } from '../../../../lib/auth-role';
import { scrambleId } from '../../../../lib/verified-scramble';
import { deliverVerifiedEffect, awardVerifiedPoints } from '../../../../lib/verified-effects';
export const dynamic='force-dynamic';
const INTERVALS=[1,1,3,7,14,30];
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req){
 try{
  const {data:{user}}=await createClient().auth.getUser();if(!user||isSuspended(user))return json({error:'سجّل الدخول لمتابعة المراجعة.'},401);
  const body=await req.json(),wordId=String(body?.word_id||''),difficulty=body?.difficulty;
  if(!/^[\w-]{1,100}$/.test(wordId)||!['easy','hard','forgot'].includes(difficulty)||!scrambleId(body.review_id))return json({error:'أعد اختيار تقييم البطاقة.'},400);
  const admin=createAdminClient(),{effectiveUserId}=await resolveActiveIdentity(user,admin,req);
  const {data:word,error:wordError}=await admin.from('lexicon_words').select('id').eq('id',wordId).maybeSingle();if(wordError)throw wordError;if(!word)return json({error:'هذه البطاقة غير متاحة الآن.'},404);
  if(isStaff(user))return json({ok:true,preview:true,self_assessment:true,awarded:0});
  const today=new Date().toISOString().slice(0,10);
  const result=await deliverVerifiedEffect(admin,`verified:review:${effectiveUserId}:${wordId}:${body.review_id}`,user.id,async()=>{
   const {data:old,error}=await admin.from('flashcard_progress').select('level, last_reviewed').eq('user_id',effectiveUserId).eq('word_id',wordId).maybeSingle();if(error)return {state:'pending'};
   const before=old?.level||0;
   const level=difficulty==='easy'?(old?.last_reviewed===today?before:Math.min(before+1,5)):difficulty==='hard'?before:Math.max(0,before-1);
   const days=difficulty==='easy'?INTERVALS[level]:1,date=new Date();date.setUTCDate(date.getUTCDate()+days);const next=date.toISOString().slice(0,10);
   const {error:saveError}=await admin.from('flashcard_progress').upsert({user_id:effectiveUserId,word_id:wordId,level,next_review:next,last_reviewed:today},{onConflict:'user_id,word_id'});if(saveError)return {state:'pending'};
   const reward=difficulty==='easy'?await awardVerifiedPoints(admin,effectiveUserId,`fc:${wordId}`,3):{state:'done',amount:0};
   return {...reward,new_level:level,next_review:next,interval_days:days,self_assessment:true};
  },{difficulty});
  return json({ok:result.state!=='pending',...result,awarded:result.state==='done'?result.amount||0:0});
 }catch(e){return json({error:e.status?e.message:'تعذّر تأكيد المراجعة. أعد المحاولة دون تكرارها.'},e.status||503);}
}
