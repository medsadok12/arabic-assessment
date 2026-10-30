import { learningDate,streakSummary,freezeGap,validDay } from './learning-streak';
import { deliverVerifiedEffect,awardVerifiedPoints } from './verified-effects';
const fail=()=>Object.assign(new Error('تعذّر تحديث سجل التعلّم. حاول مجددًا.'),{status:503});
async function pages(query){const rows=[];for(let start=0;;start+=1000){const{data,error}=await query().range(start,start+999);if(error)throw fail();rows.push(...data||[]);if((data||[]).length<1000)return rows}}
// Server-only checkpoint after a completed activity; the client never supplies the date.
export async function recordLearningDay(admin,userId,now=new Date()){
 const date=learningDate(now),{error}=await admin.from('game_settings').upsert({game_id:`attendance-day:${userId}:${date}`,settings:{date,kind:'activity'},updated_by:userId,updated_at:new Date(now).toISOString()},{onConflict:'game_id',ignoreDuplicates:true});if(error)throw fail();
}
async function debitFreezes(admin,userId,cost){for(let retry=0;retry<8;retry++){
 const{data,error}=await admin.from('streak_freezes').select('balance').eq('user_id',userId).maybeSingle();if(error||!data||data.balance<cost)return{state:'pending'};
 const write=await admin.from('streak_freezes').update({balance:data.balance-cost}).eq('user_id',userId).eq('balance',data.balance).select('balance').maybeSingle();if(write.error)return{state:'pending'};if(write.data)return{state:'done',balance:write.data.balance};
 }return{state:'pending'}}
const protectedEffect=s=>['done','working','review'].includes(s?.state);
export async function loadLearningStreak(admin,userId,{now=new Date(),applyFreeze=true}={}){
 const today=learningDate(now);
 const[old,games,stories,letters,saved,protections]=await Promise.all([
 pages(()=>admin.from('daily_logs').select('log_date').eq('user_id',userId).order('log_date')),
 pages(()=>admin.from('game_results').select('id, played_at, total').eq('user_id',userId).order('id')),
 pages(()=>admin.from('story_reads').select('id, read_at').eq('user_id',userId).order('id')),
 pages(()=>admin.from('huroof_progress').select('epoch, idx, solved_at').eq('user_id',userId).order('epoch').order('idx')),
 pages(()=>admin.from('game_settings').select('game_id, settings').like('game_id',`attendance-day:${userId}:%`).order('game_id')),
 pages(()=>admin.from('game_settings').select('game_id, settings').like('game_id',`attendance-freeze:${userId}:%`).order('game_id'))]);
 const actual=[...saved.map(r=>r.settings?.date),...games.filter(r=>r.total>0).map(r=>learningDate(r.played_at)),...stories.map(r=>learningDate(r.read_at)),...letters.map(r=>learningDate(r.solved_at))].filter(d=>validDay(d)&&d<=today);
 const days={actual:[...new Set(actual)],legacy:old.map(r=>r.log_date).filter(d=>validDay(d)&&d<=today),frozen:protections.filter(r=>protectedEffect(r.settings)).flatMap(r=>r.settings.input||[])};
 // Retain proven dates across later exercise resets. Historic unclassified logs remain untouched.
 const known=new Set(saved.map(r=>r.settings?.date)),recovered=days.actual.filter(d=>!known.has(d));
 if(applyFreeze)for(let i=0;i<recovered.length;i+=200){const{error}=await admin.from('game_settings').upsert(recovered.slice(i,i+200).map(date=>({game_id:`attendance-day:${userId}:${date}`,settings:{date,kind:'activity'},updated_by:userId,updated_at:new Date(now).toISOString()})),{onConflict:'game_id',ignoreDuplicates:true});if(error)throw fail()}
 let pending=protections.some(r=>['working','review','pending'].includes(r.settings?.state));
 if(applyFreeze&&days.actual.includes(today)){
 const{data:stock,error}=await admin.from('streak_freezes').select('balance').eq('user_id',userId).maybeSingle();if(error)throw fail();
 const gap=freezeGap(days,today,stock?.balance||0);
 if(gap.length){
 // The unique durable journal stores protected dates BEFORE debit; balance CAS preserves concurrent purchases.
 // An ambiguous outcome retains protection and is never charged again.
 const effect=await deliverVerifiedEffect(admin,`attendance-freeze:${userId}:${gap[0]}:${gap.at(-1)}`,userId,()=>debitFreezes(admin,userId,gap.length),gap);
 if(protectedEffect(effect))days.frozen.push(...gap);pending||=effect.state!=='done';
 }
 await deliverVerifiedEffect(admin,`attendance-reward:${userId}:${today}`,userId,()=>awardVerifiedPoints(admin,userId,`daily_login:${today}`,10));
 }
 return{...streakSummary(days,today),pending};
}
