// @vitest-environment jsdom
import React,{act}from'react';
import{createRoot}from'react-dom/client';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import SchoolCelebration from'../app/library/games/picture-quest/topics/SchoolCelebration';
import StageEntrance from'../app/library/games/picture-quest/topics/StageEntrance';
import{freshQuestBank,validateQuestBank}from'./picture-quest-bank';
import{bankCatalog}from'./picture-quest-bank-server';
let root,data,players;
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('matchMedia',()=>({matches:false}));players=[];vi.stubGlobal('Audio',class{constructor(url){this.url=url;this.play=vi.fn(()=>Promise.resolve());this.pause=vi.fn();players.push(this)}});data=freshQuestBank();document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'))});
afterEach(async()=>{await act(async()=>root.unmount());vi.useRealTimers();vi.unstubAllGlobals()});
const render=props=>act(async()=>root.render(<SchoolCelebration data={data} {...props}/>));
const advance=ms=>act(async()=>vi.advanceTimersByTime(ms));
it('starts with closed leaves; opens before arrival, finishes arrival before pages, then hands over the notebook and congratulates',async()=>{
 const done=vi.fn();await render({celebrate:true,onDone:done});expect(document.querySelector('.pqs-opened')).toBeNull();expect(document.querySelector('.pqs-door-frame')).toBeTruthy();await advance(1150);expect(document.querySelector('.pqs-opened')).toBeTruthy();expect(document.querySelector('.pqs-welcoming')).toBeNull();await advance(1050);expect(document.querySelector('.pqs-welcoming')).toBeTruthy();await advance(1900);expect(document.querySelector('.pqs-reading')).toBeNull();await advance(100);expect(document.querySelector('.pqs-reading')).toBeTruthy();await advance(1700);expect(document.querySelector('.pqs-gift')).toBeTruthy();await advance(2850);expect(document.querySelector('.pqs-message').textContent).toContain('الْمَدْرَسَةِ');expect(done).toHaveBeenCalledOnce();expect(players).toHaveLength(0);
});
it('skip ends immediately and cancels all delayed recordings; remount starts closed again',async()=>{
 data.schoolBellUrl='/picture-quest/bell.mp3';data.schoolVoiceUrl='/picture-quest/voice.mp3';const done=vi.fn();await render({celebrate:true,onDone:done});await advance(500);expect(players[0].url).toBe('/picture-quest/bell.mp3');await act(async()=>document.querySelector('.pqs-skip').click());expect(players[0].pause).toHaveBeenCalled();await advance(10000);expect(players).toHaveLength(1);expect(done).toHaveBeenCalledOnce();expect(document.querySelector('.pqs-settled')).toBeTruthy();await act(async()=>root.render(<div/>));await render({celebrate:true});expect(document.querySelector('.pqs-opened')).toBeNull();
});
it('uses only supplied recordings and stops the bell before playing the voice, then stops voice on exit',async()=>{
 data.schoolBellUrl='/picture-quest/bell.mp3';data.schoolVoiceUrl='/picture-quest/voice.mp3';await render({celebrate:true});await advance(8750);expect(players.map(p=>p.url)).toEqual(['/picture-quest/bell.mp3','/picture-quest/voice.mp3']);expect(players[0].pause).toHaveBeenCalled();await act(async()=>root.render(<div/>));expect(players[1].pause).toHaveBeenCalled();
});
it('unmount before completion cancels pending animations, callbacks and speech',async()=>{
 const done=vi.fn();data.schoolVoiceUrl='/picture-quest/voice.mp3';await render({celebrate:true,onDone:done});await advance(2200);await act(async()=>root.render(<div/>));await advance(10000);expect(done).not.toHaveBeenCalled();expect(players).toHaveLength(0);
});
it('respects motion reduction, feature switches and muted recordings without removing stored URLs',async()=>{
 data.settings.animate=false;data.schoolFaheemEnabled=false;data.schoolBookEnabled=false;data.schoolVoiceUrl='/picture-quest/kept.mp3';data.schoolBellUrl='/picture-quest/kept-bell.mp3';data.schoolBellSoundEnabled=false;const done=vi.fn();await render({celebrate:true,onDone:done});await advance(100);expect(document.querySelector('.pqs-settled')).toBeTruthy();expect(document.querySelector('.pqs-faheem')).toBeNull();expect(document.querySelector('.pqs-notebook')).toBeNull();expect(players).toHaveLength(0);expect(done).toHaveBeenCalledOnce();expect(data.schoolVoiceUrl).toBe('/picture-quest/kept.mp3');
});
it('honours book and pages switches independently',async()=>{
 data.schoolPagesEnabled=false;await render({celebrate:true});await advance(4200);expect(document.querySelector('.pqs-book-flip')).toBeNull();expect(document.querySelector('.pqs-notebook')).toBeTruthy();
});
it('round-trips all school controls and recording URLs without changing questions, points or other worlds',()=>{
 const old=structuredClone(data);const keys=['schoolDoorEnabled','schoolBellEnabled','schoolLightsEnabled','schoolFaheemEnabled','schoolBookEnabled','schoolPagesEnabled','schoolBellSoundEnabled','schoolVoiceEnabled'];for(const k of keys)data[k]=false;data.schoolVoiceUrl='/picture-quest/voice.mp3';data.schoolBellUrl='/picture-quest/bell.mp3';const v=validateQuestBank(data);expect(v.error).toBeUndefined();const catalog=bankCatalog(v.config);for(const k of keys)expect(catalog[k]).toBe(false);expect(catalog.schoolVoiceUrl).toBe('/picture-quest/voice.mp3');expect(catalog.schoolBellUrl).toBe('/picture-quest/bell.mp3');expect(v.config.words).toEqual(old.words);expect(v.config.settings).toEqual(old.settings);expect(catalog.fruitFaheemEnabled).toBe(true);data.schoolBellUrl='javascript:alert(1)';expect(validateQuestBank(data).error).toBeTruthy();
});
it('requires three completed stages, permits staff simulation and preserves custom or disabled world art',async()=>{
 const topic=bankCatalog(data).topics.find(t=>t.id==='school');await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} celebrate/>));expect(document.querySelector('.pqs-celebration')).toBeNull();await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} staff/>));await act(async()=>document.querySelector('.pqe-celebration-preview').click());expect(document.querySelector('.pqs-celebration')).toBeTruthy();expect(topic.stages.every(s=>!s.completed)).toBe(true);await act(async()=>root.render(<StageEntrance data={data} topic={{...topic,map_image_url:'/custom.webp'}} active={topic.stages[0]} celebrate/>));expect(document.querySelector('.pqs-school')).toBeNull();expect(document.querySelector('.pqe-gate img').getAttribute('src')).toBe('/custom.webp');
});
it('completes silently on backgrounding and does not replay timers on return',async()=>{
 const done=vi.fn();await render({celebrate:true,onDone:done});await advance(2500);Object.defineProperty(document,'hidden',{configurable:true,value:true});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));await advance(10000);expect(done).toHaveBeenCalledOnce();expect(document.querySelector('.pqs-settled')).toBeTruthy();Object.defineProperty(document,'hidden',{configurable:true,value:false});
});
it('offers a teacher-controlled road light without adding any student progress writes',async()=>{
 const topic=bankCatalog(data).topics.find(t=>t.id==='school');await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} staff/>));await act(async()=>document.querySelector('.pqe-celebration-preview').click());expect(document.querySelector('.pqs-road-light')).toBeTruthy();data.schoolLightsEnabled=false;await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} staff/>));expect(document.querySelector('.pqs-road-light')).toBeNull();expect(document.querySelector('.pqs-no-lights')).toBeTruthy();
});
