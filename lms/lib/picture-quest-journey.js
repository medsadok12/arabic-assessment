import{HOME_EFFECTS}from'./picture-quest-home-scene';
import{BODY_EFFECTS}from'./picture-quest-body-celebration';
import{SCHOOL_EFFECTS}from'./picture-quest-school-celebration';
export const JOURNEY_FLAGS=['homeChoiceProgressionEnabled',...HOME_EFFECTS.map(([key])=>key),...SCHOOL_EFFECTS.filter(([key])=>!['schoolDoorEnabled','schoolFaheemEnabled'].includes(key)).map(([key])=>key),...BODY_EFFECTS.map(([key])=>key),'schoolDoorEnabled','schoolBellEnabled','schoolLightsEnabled','schoolFaheemEnabled','schoolBookEnabled','schoolPagesEnabled','schoolBellSoundEnabled','schoolVoiceEnabled','fruitAwningEnabled','fruitPanelEnabled','fruitBasketEnabled','fruitJumpEnabled','fruitFaheemEnabled','fruitVoiceEnabled','gateDoorEnabled','gateCatEnabled','gateFaheemEnabled','gateVoiceEnabled','entranceEnabled','journeyEnabled','journeySequential','journeyScenery','journeyPath','journeyEffects'];
export const JOURNEY_ART=[
 ['animals','الحيوانات'],['fruit','الفواكه'],['school','المدرسة'],['home','البيت'],['family','الأسرة'],['birds','الطيور'],['garden','الحديقة'],['vegetables','الخضروات'],['weather','الطقس'],['clothes','الملابس'],['food','الطعام'],['body','أعضاء الجسم'],['toys','الألعاب'],['sports','الرياضة'],['transport','وسائل النقل'],['jobs','المهن'],['city','المدينة'],['shapes','الأشكال'],['sea','البحر'],['space','الفضاء']
];
const norm=s=>String(s||'').replace(/[\u064b-\u065f\u0670\u0640\s_-]/g,'').replace(/[أإآٱ]/g,'ا').toLowerCase();
export function journeyArt(topic){
 if(Number.isInteger(topic?.mapArt)&&topic.mapArt>=0&&topic.mapArt<20)return topic.mapArt;
 if(norm(topic?.title)===norm('الجسم'))return 11;
 const index=JOURNEY_ART.findIndex(([id,label])=>norm(id)===norm(topic?.id)||norm(label)===norm(topic?.title));
 return index<0?16:index;
}
export function journeySprite(index){return{backgroundPosition:`${index%4*100/3}% ${Math.floor(index/4)*20}%`}}
export const worldComplete=(state,id)=>[1,2,3].every(n=>!!state.completions?.[`${id}:${n}`]);
export function prepareWorldAccess(state,bank){
 state.worldAccess??={};const topics=bank.topics.filter(t=>t.enabled);
 for(const [i,t]of topics.entries()){
  // Previously started worlds stay accessible after the change to sequential play.
  const known=[1,2,3].some(n=>state.completions?.[`${t.id}:${n}`]||state.attempts?.[`${t.id}:${n}`])||state.round?.selection?.topicId===t.id;
  if(i===0||known||worldComplete(state,topics[i-1]?.id))state.worldAccess[t.id]=true;
 }
 return state;
}
export const worldUnlocked=(bank,state,id)=>bank.journeySequential===false||!!state.worldAccess?.[id];
export function journeyGeometry(count,width,viewHeight=600){
 const w=Math.max(280,width||375),sway=Math.min(w*.16,160),gap=w<=540?178:225,n=Math.max(1,count),height=Math.max(viewHeight+220,(n-1)*gap+430);
 return{width:w,height,viewHeight,gap,points:Array.from({length:n},(_,i)=>({x:Math.round(w*.5+sway*Math.sin(i*1.2+.2)),y:Math.round(height-180-i*gap)}))};
}
export function journeyPath(points){if(!points.length)return '';let d=`M${points[0].x} ${points[0].y}`;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],m=(a.y+b.y)/2;d+=` C${a.x} ${m} ${b.x} ${m} ${b.x} ${b.y}`}return d}
export function journeyDecor(g){
 const props=[],wide=g.width>1100,rows=Math.max(4,Math.min(wide?24:50,Math.round(g.height/190)));
 for(let i=0;i<rows;i++)for(let side=0;side<2;side++){
  const y=Math.round(80+i*(g.height-180)/Math.max(1,rows-1)),f=y/g.height;
  const art=f>.62?[20,21,22,23][(i*3+side)%4]:f>.20?[20,22,3,23][(i+side)%4]:[23,22,20,18][(i+side)%4];
  const small=g.width<=540,size=small?(art===22?76:art===23?98:125+i%3*6):(art===22?110:art===23?145:178+i%3*12);
  const py=y+(i*31+side*43)%95-35;
  props.push({art,size,x:Math.round(side?g.width-size*(.64+i%3*.06):-size*(.21+i%3*.07)),y:py});
  // Keep scenery beside the readable central route on wide displays.
  if(wide){const offset=Math.min(420,g.width*.34),innerSize=Math.round(size*.85);props.push({art,size:innerSize,x:Math.round(g.width*.5+(side?offset:-offset)-innerSize*.5),y:py+60});}
 }
 return props;
}
