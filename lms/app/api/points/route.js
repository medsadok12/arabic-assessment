import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';
import { resolveActiveIdentity } from '../../../lib/active-child';
import { isStaff, isSuspended } from '../../../lib/auth-role';
import { deliverVerifiedEffect, awardVerifiedPoints } from '../../../lib/verified-effects';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ points: 0, earned: 0 });
    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const [{ data: balRow }, { data: logRows }] = await Promise.all([
      admin.from('user_points').select('total').eq('user_id', effectiveUserId).maybeSingle(),
      admin.from('points_log').select('delta').eq('user_id', effectiveUserId).gt('delta', 0),
    ]);
    const points = balRow?.total ?? 0;
    const earned = (logRows ?? []).reduce((s, r) => s + (r.delta || 0), 0);
    return NextResponse.json({ points, earned });
  } catch {
    return NextResponse.json({ points: 0, earned: 0 });
  }
}

// لا متصل عميل شرعي غير «كلمة اليوم»؛ مكافآت الألعاب والحضور والواجبات
// تُمنح من مساراتها الموثوقة، لا من اسم حدث يختاره المتصفح.
export async function POST(req) {
  try {
    const {data:{user}}=await createClient().auth.getUser();
    if(!user||isSuspended(user))return NextResponse.json({error:'سجّل الدخول أولًا.'},{status:401});
    const body=await req.json(),today=new Date().toISOString().slice(0,10);
    if(body?.reason!==`daily_word:${today}`)return NextResponse.json({error:'مكافآت التدريب تُحفظ من مساره بعد التحقق.'},{status:409});
    if(isStaff(user))return NextResponse.json({preview:true,skipped:true});
    const admin=createAdminClient(),{effectiveUserId}=await resolveActiveIdentity(user,admin,req);
    const result=await deliverVerifiedEffect(admin,`verified:daily-word:${effectiveUserId}:${today}`,user.id,()=>awardVerifiedPoints(admin,effectiveUserId,`daily_word:${today}`,3));
    return NextResponse.json({success:result.state==='done',skipped:!!result.skipped,points:result.points,state:result.state});
  }catch{return NextResponse.json({error:'تعذّر تأكيد المكافأة. أعد المحاولة.'},{status:503});}
}
