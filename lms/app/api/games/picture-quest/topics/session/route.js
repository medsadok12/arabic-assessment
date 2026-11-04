import{createAdminClient}from'../../../../../../lib/supabase-admin';
import{resolveActiveIdentity}from'../../../../../../lib/active-child';
import{questJson as json,questUser}from'../../../../../../lib/picture-quest-server';
import{questBankSession,loadQuestBank}from'../../../../../../lib/picture-quest-bank-server';
export const dynamic='force-dynamic';
export async function POST(req){try{const auth=await questUser();if(auth.error)return auth.error;if(auth.staff)return json({error:'استخدم معاينة البنك؛ لا تُمنح نقاط في المعاينة.'},403);const raw=await req.text();if(raw.length>4000)return json({error:'الطلب كبير.'},413);let body;try{body=JSON.parse(raw)}catch{return json({error:'طلب غير صالح.'},400)}if(!['start','replay','answer','hint','exit'].includes(body?.action))return json({error:'اختر إجراءً من الجولة.'},400);const admin=createAdminClient(),[{effectiveUserId},bank]=await Promise.all([resolveActiveIdentity(auth.user,admin,req),loadQuestBank(admin)]);return json(await questBankSession(admin,auth,effectiveUserId,body,bank))}catch(e){return json({error:e.status?e.message:'تعذّر حفظ الجولة. أعد المحاولة.'},e.status||503)}}
