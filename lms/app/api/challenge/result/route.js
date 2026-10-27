import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { isStaff, isSuspended } from '../../../../lib/auth-role';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { challengeOutcome } from '../../../../lib/challenge-verified';
import { deliverVerifiedEffect, awardVerifiedPoints } from '../../../../lib/verified-effects';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req){
  try{
    const {data:{user}}=await createClient().auth.getUser(); if(!user||isSuspended(user))return json({error:'سجّل الدخول لتكمل التحدي.'},401);
    const body=await req.json(); if(typeof body?.room_id!=='string'||body.room_id.length>100)return json({error:'اختر غرفة التحدّي.'},400);
    const admin=createAdminClient(),{effectiveUserId}=await resolveActiveIdentity(user,admin,req);
    const {data:room,error}=await admin.from('challenge_rooms').select('*').eq('id',body.room_id).maybeSingle();if(error)throw error;
    const outcome=challengeOutcome(room,effectiveUserId);if(!outcome)return json({error:'النتيجة متاحة للمشاركين بعد نهاية التحدي.'},403);
    if(isStaff(user))return json({preview:true,awarded:0,...outcome,amount:0});
    const result=await deliverVerifiedEffect(admin,`verified:challenge:${room.id}:${effectiveUserId}`,user.id,()=>awardVerifiedPoints(admin,effectiveUserId,`challenge_${outcome.tag}:${room.id}`,outcome.amount));
    return json({verified:true,...outcome,state:result.state,points:result.points,awarded:result.state==='done'?outcome.amount:0});
  }catch{return json({error:'تعذّر تأكيد المكافأة. أعد المحاولة دون تكرارها.'},503);}
}
