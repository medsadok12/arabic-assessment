// Coordinates are percentages of the gate, not viewport pixels.
const keys=[
 [0,89,95,1,0],[220,86,95,1,1],[440,83,95,1,2],
 [570,78,91,1,3],[740,70,80,1,4],[880,64,77,1,5],
 [1020,60,81,1,6],[1160,58,89,1,7],[1310,57,89,1,8],
 [1480,57,88,1,9],[1740,55,83,.96,10],[2000,51,77,.93,11],
 [2260,45,72,.9,9],[2520,33,67,.87,10],[2800,15,63,.85,11]
];
export function gateCatPose(elapsed){
 const t=Math.max(0,Math.min(2800,elapsed));let i=0;
 while(i<keys.length-2&&t>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],u=(t-a[0])/(b[0]-a[0]);
 return{x:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u,scale:a[3]+(b[3]-a[3])*u,frame:t>=1480?9+Math.floor((t-1480)/125)%3:a[4],inside:t>=1640,done:t>=2800};
}
export function animateGateCat({gate,opening,cat,frames,shadow,requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame}){
 let raf=0,start=null,stopped=false;
 // The inner copy is owned by this animation, not React. Never reparent a
 // React-owned node: changing an editor switch during a crossing must be safe.
 const inward=cat.cloneNode(true),inwardFrames=inward.firstElementChild;
 inward.hidden=true;opening.appendChild(inward);
 function place({x,y,scale,frame,inside,done}){
  const visibleCat=inside?inward:cat,visibleFrames=inside?inwardFrames:frames;
  visibleCat.style.left=(inside?(x-34)/.38:x)+'%';visibleCat.style.top=(inside?(y-46)/.36:y)+'%';
  visibleCat.style.transform=`translate(-50%,-100%) scale(${scale})`;
  visibleFrames.style.backgroundPosition=`${frame%4*100/3}% ${Math.floor(frame/4)*50}%`;
  const height=Math.max(0,93-y);shadow.style.left=x+'%';shadow.style.top=(y>89?93:y+1)+'%';
  shadow.style.transform=`translateX(-50%) scale(${1-height*.025})`;
  shadow.style.opacity=String(inside?0:Math.max(.18,1-height*.038));cat.hidden=done||inside;inward.hidden=done||!inside;shadow.hidden=done;
 }
 function tick(now){if(stopped)return;start??=now;const pose=gateCatPose(now-start);place(pose);if(!pose.done)raf=requestFrame(tick);}
 place(gateCatPose(0));raf=requestFrame(tick);
 return()=>{stopped=true;cancelFrame(raf);place(gateCatPose(0));inward.remove();shadow.style.cssText='';};
}
