import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { isStaff, isSuspended } from '../../../../lib/auth-role';
import { HUROOF_COUNT, normalizeHuroofSettings } from '../../../../lib/huroof';
import { deliverVerifiedEffect, awardVerifiedPoints } from '../../../../lib/verified-effects';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req){
 try{
  const {data:{user}}=await createClient().auth.getUser();if(!user||isSuspended(user))return json({error:'سجّل الدخول لمتابعة الحروف.'},401);
  const {idx}=await req.json();if(!Number.isInteger(idx)||idx<0||idx>=HUROOF_COUNT)return json({error:'اختر حرفًا من التدريب.'},400);
  const admin=createAdminClient(),{data:cfg,error}=await admin.from('game_settings').select('settings').eq('game_id','huroof').maybeSingle();if(error)throw error;
  if(normalizeHuroofSettings(cfg?.settings).mode!=='explore')return json({error:'حلّ لغز الحرف في وضع التحدّي أولًا.'},409);
  if(isStaff(user))return json({preview:true,awarded:0,viewed:true});
  const {effectiveUserId}=await resolveActiveIdentity(user,admin,req),prefix=`verified:huroof:view:${effectiveUserId}:`;
  const {error:insertError}=await admin.from('game_settings').insert({game_id:prefix+idx,settings:{idx},updated_by:user.id,updated_at:new Date().toISOString()});if(insertError&&insertError.code!=='23505')throw insertError;
  const reward=await deliverVerifiedEffect(admin,`verified:huroof:reward:${effectiveUserId}:${idx}`,user.id,()=>awardVerifiedPoints(admin,effectiveUserId,`huroof_letter:${idx}`,2));
  const {data:views,error:readError}=await admin.from('game_settings').select('settings').like('game_id',prefix+'%');if(readError)throw readError;
  const seen=new Set((views||[]).map(r=>r.settings?.idx).filter(n=>Number.isInteger(n)&&n>=0&&n<HUROOF_COUNT));
  if(seen.size===HUROOF_COUNT)await deliverVerifiedEffect(admin,`verified:huroof:all:${effectiveUserId}`,user.id,()=>awardVerifiedPoints(admin,effectiveUserId,'huroof_all_complete',10));
  return json({viewed:true,mastery:false,state:reward.state,points:reward.points});
 }catch{return json({error:'تعذّر تأكيد المرور بالحرف. أعد المحاولة.'},503);}
}
