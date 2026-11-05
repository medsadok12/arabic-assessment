import React from'react';
import{renderToStaticMarkup}from'react-dom/server';
import{afterEach,it,expect,vi}from'vitest';
import{bodySceneEnabled,bodySceneLayout,BODY_SCENE_STATIONS}from'./picture-quest-body-scene';
import StageEntrance from'../app/library/games/picture-quest/topics/StageEntrance';
const data={settings:{animate:true,controls:{}}},topic={id:'body',title:'أعضاء الجسم',stages:[1,2,3].map(stage=>({stage,unlocked:stage===1,completed:false,ready:true}))};
const draw=(patch={})=>{vi.stubGlobal('React',React);return renderToStaticMarkup(<StageEntrance data={data} topic={topic} active={topic.stages[0]} {...patch}/>)};
afterEach(()=>vi.unstubAllGlobals());
it('shows full scene with real accessible stage buttons, existing locks and start action',()=>{const html=draw();expect(html).toContain('body-scene-v3.webp');expect(html).toContain('أعضاء الجسم');expect(html).not.toContain('pqe-road');expect(html).toContain('المرحلة 3، مقفلة');expect(html).toContain('ابدأ');expect(html).toContain('disabled=""');});
it('preserves staff preview and completion/selection states',()=>{const stages=topic.stages.map(s=>({...s,completed:s.stage===1}));const html=draw({topic:{...topic,stages},active:stages[2],staff:true});expect(html).toContain('معاينة المرحلة');expect(html).toContain('pqb-station current');expect(html).toContain('pqb-station completed');expect(html).not.toContain('pqb-station locked');});
it('respects teacher uploads, disabled artwork, art overrides and independent scenery/path switches',()=>{for(const t of[{...topic,mapImageEnabled:false},{...topic,map_image_url:'/picture-quest/upload.webp'},{...topic,mapArt:2},{...topic,id:'fruit'}])expect(bodySceneEnabled(data,t)).toBe(false);for(const flag of['journeyScenery','journeyPath'])expect(bodySceneEnabled({...data,[flag]:false},topic)).toBe(false);expect(bodySceneEnabled(data,topic)).toBe(true);expect(draw({data:{...data,journeyPath:false}})).not.toContain('pqb-scene');});
it('fits every stage without cropping, image distortion or tiny touch targets',()=>{for(const[w,h]of[[320,568],[390,700],[412,915],[820,1180],[1440,900],[1920,1080],[740,360]]){const g=bodySceneLayout(w,h);expect(g.width).toBeLessThanOrEqual(w);expect(g.height).toBeLessThanOrEqual(h+1e-6);expect(g.width/g.height).toBeCloseTo(g.wide?1.5:870/1808);for(const[x,y,d]of Object.values(BODY_SCENE_STATIONS[g.wide?'landscape':'portrait'])){expect(x-d/2).toBeGreaterThan(0);expect(x+d/2).toBeLessThan(100);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(100);expect(Math.max(44,g.width*d/100)).toBeGreaterThanOrEqual(44);}}});
it('keeps the active wide or portrait canvas during the celebration, including resize layouts',async()=>{
 const {default:Celebration}=await import('../app/library/games/picture-quest/topics/BodyCelebration');
 vi.stubGlobal('React',React);
 for(const[w,h]of[[390,844],[1366,768],[2048,1110]]){
  const layout=bodySceneLayout(w,h),html=renderToStaticMarkup(<Celebration data={data} layout={layout}/>);
  expect(html.includes('pbc-shell pbc-wide')).toBe(layout.wide);
  expect(html).toContain('width:'+layout.width+'px');expect(html).toContain('height:'+layout.height+'px');
 }
});
