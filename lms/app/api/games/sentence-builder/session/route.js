import {createAdminClient} from '../../../../../lib/supabase-admin';
import {resolveActiveIdentity} from '../../../../../lib/active-child';
import {sentenceJson as json,sentenceUser,startSentenceGame,answerSentenceGame,hintSentenceGame,resetSentenceStudent} from '../../../../../lib/sentence-builder-server';
export const dynamic='force-dynamic';
export async function POST(req){
 const auth=await sentenceUser();if(auth.error)return auth.error;
 try{const text=await req.text();if(text.length>6000)return json({error:'أكمل الجملة من التدريب.'},400);let body;try{body=JSON.parse(text)}catch{return json({error:'أعد المحاولة من التدريب.'},400)}
  const admin=createAdminClient();
  if(body?.action==='reset'){if(!auth.staff)return json({error:'إعادة الضبط للمعلمين والإدارة فقط.'},403);return json(await resetSentenceStudent(admin,auth,body.userId))}
  if(!['start','replay','answer','hint'].includes(body?.action))return json({error:'اختر إجراءً من التدريب.'},400);
  if(auth.staff)return json({error:'معاينة المعلم لا تغيّر نقاط الطلاب.'},403);
  const {effectiveUserId}=await resolveActiveIdentity(auth.user,admin,req);
  return json(body.action==='start'||body.action==='replay'?await startSentenceGame(admin,auth,effectiveUserId,body.action==='replay'):body.action==='answer'?await answerSentenceGame(admin,auth,effectiveUserId,body):await hintSentenceGame(admin,auth,effectiveUserId,body));
 }catch(e){return json({error:e.status?e.message:'تعذّر تأكيد الحفظ. أعد المحاولة.'},e.status||503)}
}
