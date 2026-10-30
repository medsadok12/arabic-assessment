export const ACADEMY_TIME_ZONE='Asia/Qatar';
export function learningDate(value=new Date()){if(value==null)return null;const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-CA',{timeZone:ACADEMY_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(d):null}
export function shiftDay(day,n){const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
export function validDay(d){try{return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&shiftDay(d,0)===d}catch{return false}}
export function streakSummary({actual=[],legacy=[],frozen=[]},today=learningDate()){
 const clean=a=>new Set(a.filter(d=>validDay(d)&&d<=today)),real=clean(actual),old=clean(legacy),ice=clean(frozen),all=new Set([...old,...ice,...real]);
 let day=all.has(today)?today:shiftDay(today,-1),streak=0;while(all.has(day)){streak++;day=shiftDay(day,-1)}
 let best=0,run=0,prev=null;for(const d of [...all].sort()){run=prev&&shiftDay(prev,1)===d?run+1:1;best=Math.max(best,run);prev=d}
 const calendar=n=>Array.from({length:n},(_,i)=>{const date=shiftDay(today,i-n+1),kind=real.has(date)?'activity':ice.has(date)?'freeze':old.has(date)?'legacy':'empty';return{date,day:Number(date.slice(-2)),kind,active:kind==='activity',frozen:kind==='freeze',legacy:kind==='legacy',isToday:date===today,isFuture:false}});
 return{streak,best,total_learning_days:real.size,legacy_days:[...old].filter(d=>!real.has(d)&&!ice.has(d)).length,last_learning_day:[...real].sort().at(-1)||null,logged_today:real.has(today),last_7:calendar(7),last_21:calendar(21),today,timezone:ACADEMY_TIME_ZONE};
}
export function freezeGap(days,today,balance){if(!days.actual.includes(today))return[];const occupied=new Set([...days.actual,...days.legacy,...days.frozen]),last=[...occupied].filter(d=>d<today).sort().at(-1);if(!last)return[];const missing=[];for(let d=shiftDay(last,1);d<today;d=shiftDay(d,1)){missing.push(d);if(missing.length>Math.min(balance,2))return[]}return missing}
