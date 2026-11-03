import{createAdminClient}from'../../../../../../lib/supabase-admin';
import{questJson as json,questUser}from'../../../../../../lib/picture-quest-server';
import{loadQuestBank}from'../../../../../../lib/picture-quest-bank-server';
import{buildQuestStaffPreview}from'../../../../../../lib/picture-quest-staff-preview';
export const dynamic='force-dynamic';
export async function GET(req){try{const auth=await questUser(true);if(auth.error)return auth.error;const params=new URL(req.url).searchParams,topicId=params.get('topic'),stage=Number(params.get('stage'));if(!/^[a-z0-9_-]{1,70}$/i.test(topicId||'')||![1,2,3,4].includes(stage))return json({error:'اختر عالمًا ومرحلة صحيحة للمعاينة.'},400);const{config}=await loadQuestBank(createAdminClient());return json(buildQuestStaffPreview(config,{topicId,stage}));}catch(e){return json({error:e.status?e.message:'تعذّر فتح المعاينة. أعد المحاولة.'},e.status||503)}}
