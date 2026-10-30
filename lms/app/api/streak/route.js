import {NextResponse} from 'next/server';
import {createAdminClient} from '../../../lib/supabase-admin';
import {createClient} from '../../../lib/supabase-server';
import {resolveActiveIdentity} from '../../../lib/active-child';
import {isStaff,isSuspended} from '../../../lib/auth-role';
import {loadLearningStreak} from '../../../lib/learning-streak-server';
export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req){try{
 const{data:{user}}=await createClient().auth.getUser();if(!user||isSuspended(user))return json({error:'سجّل الدخول أولًا.'},401);if(isStaff(user))return json({preview:true});
 const admin=createAdminClient(),{effectiveUserId}=await resolveActiveIdentity(user,admin,req);
 return json({ok:true,user_id:effectiveUserId,...await loadLearningStreak(admin,effectiveUserId)});
}catch{return json({error:'تعذّر عرض سجل التعلّم. حاول مجددًا.'},503)}}
// Old open clients can read but cannot fabricate attendance from page visits.
export const POST=GET;
