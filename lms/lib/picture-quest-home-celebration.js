import{homeArrivalFrames,homePortalMask}from'./picture-quest-home-scene';

export function animateHomeCelebration(root,{data,layout,reduced=false,onMessage=()=>{},onSettled=()=>{}}){
 let live=true;const timers=new Set(),animations=new Set(),particles=new Set();
 const el=name=>root.querySelector('.pqhome-'+name),motion=data.settings?.animate!==false&&data.journeyEffects!==false&&!reduced;
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(live)fn()},ms);timers.add(id)};
 const animate=(node,frames,options)=>{if(!node)return;if(!motion||!node.animate){for(const[k,v]of Object.entries(frames.at(-1)))if(!['offset','easing'].includes(k))node.style[k]=v;return;}const a=node.animate(frames,options);animations.add(a);};
 const person=el('faheem'),layer=el('person-layer'),door=el('door-leaf'),medal=el('badge'),album=el('album');
 const hasPerson=data.homeFaheemEnabled!==false,hasBadge=data.homeBadgeEnabled!==false,hasAlbum=data.homeAlbumEnabled!==false;
 const frame=n=>{const pose=el('pose');if(pose)pose.style.backgroundPosition=(n%4/3*100)+'% '+(Math.floor(n/4)/3*100)+'%';};
 const setPhase=name=>{root.dataset.homePhase=name;};
 const settled=()=>{setPhase('settled');el('album-slot')?.classList.add('collected');onMessage(hasBadge?(hasAlbum?'أُضيفت شارة بطل البيت إلى ألبوم إنجازاتك.':'أحسنت! حصلت على شارة بطل البيت.'):'أحسنت! أكملت رحلة البيت.');onSettled();};
 const collect=()=>{
  setPhase('badge');frame(12);
  if(hasBadge){medal.style.opacity='1';animate(medal,[{transform:'translate(-50%,-50%) scale(.3)',opacity:0},{transform:'translate(-50%,-50%) scale(1)',opacity:1}],{duration:600,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});}
  if(motion&&data.homeSparklesEnabled!==false){for(let i=0;i<12;i++){const node=document.createElement('span');node.className='pqhome-sparkle';node.textContent='✦';node.style.left=(25+i*4.5)+'%';node.style.top='48%';el('particles').append(node);particles.add(node);animate(node,[{opacity:0,transform:'translateY(0) scale(.3)'},{opacity:1,offset:.18},{opacity:0,transform:`translateY(${-45-i%4*16}px) rotate(100deg) scale(1)`}],{duration:1400+i%3*140,easing:'ease-out',fill:'forwards'});}}
  onMessage(hasBadge?(hasAlbum?'شارة بطل البيت… إلى ألبوم إنجازاتك!':'شارة بطل البيت!'):'أحسنت! البيت يضيء بإنجازك.');
  later(()=>{if(!hasAlbum)return;album.style.opacity='1';album.removeAttribute('aria-hidden');animate(album,[{transform:'translate(-50%,20px)',opacity:0},{transform:'translate(-50%,0)',opacity:1}],{duration:500,fill:'forwards',easing:'ease-out'})},motion?700:10);
  later(()=>{if(!hasBadge||!hasAlbum)return;const r=medal.getBoundingClientRect(),slot=el('album-slot').getBoundingClientRect(),dx=slot.x+slot.width/2-r.x-r.width/2,dy=slot.y+slot.height/2-r.y-r.height/2;animate(medal,[{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.35)`,opacity:0}],{duration:850,easing:'cubic-bezier(.35,.05,.2,1)',fill:'forwards'})},motion?1300:20);
  later(settled,motion?2300:30);
 };
 const welcome=()=>{
  if(!hasPerson){later(collect,motion&&data.homeDoorEnabled!==false?1850:0);return;}
  const frames=homeArrivalFrames(layout,person.offsetWidth||140),walk=motion&&data.homeWalkEnabled!==false;
  Object.assign(person.style,Object.fromEntries(Object.entries(frames[0]).filter(([k])=>k!=='offset')));person.style.opacity=motion&&data.homeDoorEnabled!==false?'0':'1';frame(9);
  layer.style.clipPath=homePortalMask(layout);layer.style.zIndex='8';
  if(!walk)later(()=>{Object.assign(person.style,Object.fromEntries(Object.entries(frames.at(-1)).filter(([k])=>k!=='offset')));layer.style.clipPath='none';layer.style.zIndex='10';frame(8)},motion&&data.homeDoorEnabled!==false?1850:20);
  const walkTime=walk?2800:0,wait=motion&&data.homeDoorEnabled!==false?1850:20;
  if(walk)later(()=>{setPhase('leaving');onMessage('ها هو فهيم يخرج من البيت…');animate(person,frames,{duration:walkTime,easing:'linear',fill:'forwards'});for(let k=0;k<24;k++)later(()=>frame(k%8),k*116);later(()=>{layer.style.clipPath='none';layer.style.zIndex='10'},340)},wait);
  later(()=>{setPhase('clapping');frame(8);onMessage('أحسنت يا بطل! البيت يضيء بإنجازك.');if(motion&&data.homeClapEnabled!==false)for(let k=0;k<12;k++)later(()=>frame(12+k%4),k*110)},wait+walkTime);
  later(collect,wait+walkTime+(motion?1550:10));
 };
 setPhase('opening');onMessage(hasPerson?'فهيم يفتح الباب ليحتفل معك…':'أكملت رحلة البيت… الباب يُفتح!');
 animate(door,[{transform:'rotateY(0deg)'},{offset:.12,transform:'rotateY(3deg)'},{transform:'rotateY(-107deg)'}],{duration:data.homeDoorEnabled!==false?1650:1,easing:'cubic-bezier(.25,.55,.25,1)',fill:'forwards'});
 // A small, camera-facing pose appears inside the arch as the door opens, never on the path.
 if(hasPerson){const frames=homeArrivalFrames(layout,person.offsetWidth||140);Object.assign(person.style,Object.fromEntries(Object.entries(frames[0]).filter(([k])=>k!=='offset')));person.style.opacity='0';layer.style.clipPath=homePortalMask(layout);frame(9);later(()=>person.style.opacity='1',motion&&data.homeDoorEnabled!==false?700:0);}
 welcome();
 return()=>{live=false;timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());particles.forEach(p=>p.remove());};
}
