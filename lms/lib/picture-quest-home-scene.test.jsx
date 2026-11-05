import React from'react';
import{renderToStaticMarkup}from'react-dom/server';
import{afterEach,it,expect,vi}from'vitest';
import{homeSceneEnabled,homeSceneLayout,homeStationBox,HOME_SCENE_STATIONS,HOME_SCENE_TOP,HOME_SCENE_BOTTOM,HOME_SCENE_MIN_WIDTH}from'./picture-quest-home-scene';
import HomeScene from'../app/library/games/picture-quest/topics/HomeScene';
import StageEntrance from'../app/library/games/picture-quest/topics/StageEntrance';
const data={settings:{animate:true,controls:{}}},topic={id:'home',title:'البيت',stages:[1,2,3].map(stage=>({stage,unlocked:stage===1,completed:false,ready:true}))};
const draw=(patch={})=>{vi.stubGlobal('React',React);return renderToStaticMarkup(<HomeScene data={data} topic={topic} active={topic.stages[0]} status="" {...patch}/>)};
afterEach(()=>vi.unstubAllGlobals());

it('routes the home world to its own scene and leaves other worlds on the shared entrance',()=>{
 vi.stubGlobal('React',React);
 const home=renderToStaticMarkup(<StageEntrance data={data} topic={topic} active={topic.stages[0]}/>);
 expect(home).toContain('pqh-scene');expect(home).not.toContain('pqe-road');
 const family=renderToStaticMarkup(<StageEntrance data={data} topic={{...topic,id:'family',title:'الأسرة'}} active={topic.stages[0]}/>);
 expect(family).not.toContain('pqh-scene');expect(family).toContain('pqe-road');
});

it('draws the cut-away house with real accessible stage buttons, locks and the start action',()=>{
 const html=draw();
 expect(html).toContain('<svg');expect(html).toContain('البيت');
 expect(html.match(/class="pqh-station[ "]/g)).toHaveLength(3);
 expect(html).toContain('المرحلة 3، مقفلة');expect(html).toContain('ابدأ');expect(html).toContain('disabled=""');
 expect(html).not.toContain('pqh-party');expect(html).not.toContain('pqh-on-1');
 expect(html.match(/class="pqh-shade pqh-shade-\d"/g)).toHaveLength(3); // every floor starts with its lights off
});

it('keeps staff preview, completion, resume and lit-path states',()=>{
 const stages=topic.stages.map(s=>({...s,completed:s.stage===1,unlocked:true}));
 const staffHtml=draw({topic:{...topic,stages},active:stages[2],staff:true});
 expect(staffHtml).toContain('معاينة المرحلة');expect(staffHtml).toContain('pqh-station current');expect(staffHtml).toContain('pqh-station completed');
 expect(staffHtml).not.toContain('pqh-station locked');expect(staffHtml).toContain('جرّب احتفال البيت');
 expect(staffHtml).not.toContain('pqh-on-1'); // with motion the earned lights switch on after the screen opens
 const still={...data,settings:{animate:false,controls:{}}};
 const stillHtml=draw({data:still,topic:{...topic,stages},active:stages[2]});
 expect(stillHtml).toContain('pqh-on-1 pqh-lit-a');expect(stillHtml).not.toContain('pqh-on-2');expect(stillHtml).not.toContain('pqh-on-3');
 const resume=draw({topic:{...topic,stages},active:{...stages[1],resume:true},status:'وصلت إلى 4 من 10'});
 expect(resume).toContain('واصل');expect(resume).toContain('وصلت إلى 4 من 10');expect(resume).not.toContain('جرّب احتفال');
 const done=topic.stages.map(s=>({...s,completed:true,unlocked:true}));
 const review=draw({topic:{...topic,stages:done},active:done[0]});
 expect(review).toContain('راجع');expect(review).toContain('احتفال بيتي');
 expect(draw({data:{...data,settings:{animate:false,controls:{}}},topic:{...topic,stages:done},active:done[0]})).toContain('pqh-on-1 pqh-lit-a pqh-on-2 pqh-lit-b pqh-on-3');
 expect(draw({preparing:true})).toContain('نجهّز لعبتك');
});

it('respects teacher uploads, disabled artwork, art overrides, motion and the scenery/path switches',()=>{
 for(const t of[{...topic,mapImageEnabled:false},{...topic,map_image_url:'/picture-quest/upload.webp'},{...topic,mapArt:2},{...topic,id:'fruit'}])expect(homeSceneEnabled(data,t)).toBe(false);
 for(const flag of['journeyScenery','journeyPath'])expect(homeSceneEnabled({...data,[flag]:false},topic)).toBe(false);
 expect(homeSceneEnabled(data,topic)).toBe(true);expect(homeSceneEnabled(data,{...topic,mapArt:3})).toBe(true);
 expect(draw()).toContain('pqh-motion');
 expect(draw({data:{...data,settings:{animate:false,controls:{}}}})).not.toContain('pqh-motion');
 expect(draw({data:{...data,journeyEffects:false}})).not.toContain('pqh-motion');
});

it('fits the whole house and every stage on phones, tablets and computers without tiny targets',()=>{
 const cases=[[320,568],[375,667],[390,844],[412,915],[820,1180],[1180,820],[1280,800],[1440,900],[1920,1080],[2560,1080],[600,650]];
 for(const[w,h]of cases){
  const reserve={top:80,bottom:184,left:0},g=homeSceneLayout(w,h,reserve);
  expect(g.w/g.h).toBeCloseTo(w/h,6); // never stretched
  expect(g.w).toBeGreaterThanOrEqual(HOME_SCENE_MIN_WIDTH-1e-6); // the central rooms stay whole
  expect((HOME_SCENE_TOP-g.y)*g.scale).toBeGreaterThanOrEqual(reserve.top-1e-6); // below the title
  expect((HOME_SCENE_BOTTOM-g.y)*g.scale).toBeLessThanOrEqual(h-reserve.bottom+1e-6); // above the start button
  for(const spot of Object.values(HOME_SCENE_STATIONS)){
   const b=homeStationBox(g,spot);
   expect(b.size).toBeGreaterThanOrEqual(48);
   expect(b.left*w/100-b.size/2).toBeGreaterThan(0);expect(b.left*w/100+b.size/2).toBeLessThan(w);
   expect(b.top*h/100-b.size/2).toBeGreaterThan(reserve.top-1);expect(b.top*h/100+b.size/2).toBeLessThan(h-reserve.bottom);
  }
 }
 // Short landscape phones: the start panel sits on the left and the house moves beside it.
 const g=homeSceneLayout(844,390,{top:58,bottom:12,left:300});
 for(const spot of Object.values(HOME_SCENE_STATIONS)){const b=homeStationBox(g,spot);expect(b.left*844/100-b.size/2).toBeGreaterThan(300);expect(b.size).toBeGreaterThanOrEqual(48);}
});
