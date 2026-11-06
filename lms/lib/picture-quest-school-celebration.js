export const SCHOOL_CELEBRATION_WIDE_ART='/picture-quest/school-celebration-wide-v1.webp';
export const SCHOOL_CELEBRATION_ART='/picture-quest/school-celebration-plate-v1.webp';
export const SCHOOL_FAHEEM_ART='/picture-quest/school-faheem-backpack-v1.webp';
export const SCHOOL_EFFECTS=[
 ['schoolBackpackEnabled','حقيبة فهيم المدرسية'],['schoolPressEnabled','نبضة أرقام المدرسة'],['schoolDoorEnabled','حركة بوابة المدرسة'],
 ['schoolFaheemEnabled','ظهور فهيم في المدرسة'],['schoolWalkEnabled','مشي فهيم نحو الطالب'],
 ['schoolClapEnabled','تصفيق فهيم في المدرسة'],['schoolBadgeEnabled','شارة بطل المدرسة'],
 ['schoolAlbumEnabled','ألبوم إنجازات المدرسة'],['schoolSparklesEnabled','لمعات إنجاز المدرسة']
];
// Fixed camera-facing artwork; ground-contact position advances down the center.
export function schoolArrivalFrames(wide=false){if(wide)return [
 {offset:0,left:'50%',top:'45%',transform:'translate(-50%,-100%) scale(.28)',opacity:0},
 {offset:.12,left:'50%',top:'48%',transform:'translate(-50%,-100%) scale(.35)',opacity:1},
 {offset:.35,left:'50%',top:'55%',transform:'translate(-50%,-100%) scale(.50)',opacity:1},
 {offset:.65,left:'50%',top:'65%',transform:'translate(-50%,-100%) scale(.75)',opacity:1},
 {offset:1,left:'50%',top:'78%',transform:'translate(-50%,-100%) scale(1)',opacity:1}
 ];return [
 {offset:0,left:'50%',top:'39%',transform:'translate(-50%,-100%) scale(.20)',opacity:0},
 {offset:.12,left:'50%',top:'42%',transform:'translate(-50%,-100%) scale(.28)',opacity:1},
 {offset:.35,left:'50%',top:'47%',transform:'translate(-50%,-100%) scale(.45)',opacity:1},
 {offset:.65,left:'50%',top:'55%',transform:'translate(-50%,-100%) scale(.70)',opacity:1},
 {offset:1,left:'50%',top:'65%',transform:'translate(-50%,-100%) scale(1)',opacity:1}
];}
export function animateSchoolCelebration(root,{data,wide=false,reduced=false,onMessage=()=>{},onSettled=()=>{}}){
 let live=true;const timers=new Set(),animations=new Set();
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(live)fn()},ms);timers.add(id)};
 const motion=!reduced&&data.settings?.animate!==false&&data.journeyEffects!==false;
 const animate=(el,frames,options)=>{if(!el)return;if(!motion||!el.animate){Object.entries(frames.at(-1)).forEach(([k,v])=>{if(!['offset','easing'].includes(k))el.style[k]=v});return;}const a=el.animate(frames,options);animations.add(a);/* Keep filled animations until cleanup too. */};
 const person=root.querySelector('.bw-faheem'),pose=root.querySelector('.bw-rest'),badge=root.querySelector('.bw-badge'),album=root.querySelector('.bw-album');
 const hasPerson=data.schoolFaheemEnabled!==false,hasBadge=data.schoolBadgeEnabled!==false,hasAlbum=data.schoolAlbumEnabled!==false;
 const frame=n=>{if(!pose)return;const f=n;pose.style.transform='scaleX(1)';pose.style.backgroundPosition=(f%4/3*100)+'% '+(Math.floor(f/4)/3*100)+'%';};
 const revealBadge=()=>{if(!hasBadge)return;badge.style.opacity='1';animate(badge,[{transform:'translateY(12px) scale(.6)',opacity:0},{transform:'translateY(0) scale(1)',opacity:1}],{duration:650,easing:'cubic-bezier(.2,.7,.25,1)',fill:'forwards'});};
 const settle=()=>{if(hasAlbum&&hasBadge)root.querySelector('.bm-scene').classList.add('bw-arrived');onMessage(hasBadge?(hasAlbum?'أحسنت! أُضيفت شارتك إلى ألبوم الإنجازات':'أحسنت! حصلت على شارة بطل المدرسة'):'أحسنت! أكملت رحلة المدرسة!');onSettled();};
 const collect=()=>{
  revealBadge();
  if(motion&&data.schoolSparklesEnabled!==false&&data.schoolLightsEnabled!==false){for(let i=0;i<8;i++){const p=document.createElement('span');p.className='pbc-spark';p.style.left=(12+i*10)+'%';p.style.top='52%';root.querySelector('.bm-scene').append(p);animate(p,[{transform:'translateY(0) scale(.3)',opacity:0},{offset:.2,opacity:1},{transform:`translateY(${-30-i%3*12}px) scale(1)`,opacity:0}],{duration:850,easing:'ease-out',fill:'forwards'});later(()=>p.remove(),900);}}

  later(()=>{if(hasAlbum){album.style.opacity='1';album.removeAttribute('aria-hidden');animate(album,[{transform:'translateY(18px) rotateX(12deg)',opacity:0},{transform:'translateY(0) rotateX(0)',opacity:1}],{duration:650,easing:'ease-out',fill:'forwards'});}if(hasBadge&&hasAlbum)onMessage('شارة بطل المدرسة… إلى ألبوم إنجازاتك!');},motion?1000:10);
  later(()=>{if(!hasAlbum||!hasBadge)return;const r=badge.getBoundingClientRect(),slot=root.querySelector('.bw-slot').getBoundingClientRect();if(!r.width)return;const dx=slot.x+slot.width/2-r.x-r.width/2,dy=slot.y+slot.height/2-r.y-r.height/2;animate(badge,[{transform:'translate(0,0) scale(1)',opacity:1},{offset:.45,transform:`translate(${dx*.5}px,${dy*.4-12}px) scale(.85)`,opacity:1},{transform:`translate(${dx}px,${dy}px) scale(${slot.width/r.width})`,opacity:0}],{duration:950,easing:'cubic-bezier(.35,.05,.2,1)',fill:'forwards'});},motion?1800:20);
  later(settle,motion?2800:30);
 };
 const welcome=()=>{
  onMessage(hasPerson?'فهيم قادم بحقيبته ليهنّئك…':'أحسنت! أكملت رحلة المدرسة!');
  if(!hasPerson){collect();return;}
  person.style.opacity='1';person.style.zIndex='1';frame(0);
  const walk=motion&&data.schoolWalkEnabled!==false,walkTime=walk?2880:0;
  if(walk){animate(person,schoolArrivalFrames(wide),{duration:walkTime,easing:'linear',fill:'forwards'});for(let k=0;k<24;k++)later(()=>frame(k%8),k*120);later(()=>person.style.zIndex='5',wide?380:500);}else{const {offset,...arrival}=schoolArrivalFrames(wide).at(-1);Object.assign(person.style,arrival);person.style.zIndex='5';frame(8);}
  later(()=>{frame(8);onMessage('أحسنت يا بطل! لقد أكملت رحلة المدرسة!');},walkTime);
  [9,10,11].forEach((n,i)=>later(()=>frame(n),walkTime+(motion?120+i*160:0)));
  if(motion&&data.schoolClapEnabled!==false)[12,13,14,15,12,13,14,15,12,13,14,15].forEach((n,i)=>later(()=>frame(n),walkTime+620+i*110));
  later(()=>{frame(12);collect();},walkTime+(motion?2070:10));
 };
 if(data.schoolBellEnabled!==false)animate(root.querySelector('.sc-bell'),[{transform:'rotate(0)'},{offset:.25,transform:'rotate(-12deg)'},{offset:.5,transform:'rotate(10deg)'},{transform:'rotate(0)'}],{duration:1250,easing:'ease-in-out'});
 root.dataset.phase='opening';onMessage('أكملت المراحل الثلاث… البوابة تُفتح!');
 root.querySelectorAll('.bm-door').forEach((door,k)=>animate(door,[{transform:'rotateY(0)'},{transform:`rotateY(${k===0?-98:98}deg)`}],{duration:data.schoolDoorEnabled!==false?1350:1,easing:'cubic-bezier(.25,.55,.2,1)',fill:'forwards'}));
 later(()=>{root.dataset.phase='welcoming';welcome()},motion&&data.schoolDoorEnabled!==false?1550:20);
 return()=>{live=false;timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());root.getAnimations?.({subtree:true}).forEach(a=>a.cancel());};
}
