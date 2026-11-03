// @vitest-environment jsdom
import React,{act}from'react';
import{createRoot}from'react-dom/client';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import GateCelebration from'../app/library/games/picture-quest/topics/GateCelebration';
import StageEntrance from'../app/library/games/picture-quest/topics/StageEntrance';
import{gateCatPose,animateGateCat}from'./picture-quest-gate-motion';
import{freshQuestBank,validateQuestBank}from'./picture-quest-bank';
import{bankCatalog}from'./picture-quest-bank-server';
let root,data,players;
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('matchMedia',()=>({matches:false}));players=[];vi.stubGlobal('Audio',class{constructor(url){this.url=url;this.play=vi.fn(()=>Promise.resolve());this.pause=vi.fn();players.push(this)}});data=freshQuestBank();document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'))});
afterEach(async()=>{await act(async()=>root.unmount());vi.useRealTimers();vi.unstubAllGlobals()});
const render=props=>act(async()=>root.render(<GateCelebration data={data} {...props}/>));
it('moves through distinct crouch, flight, landing and rear-walk poses; passes behind the door frame',()=>{
 expect(gateCatPose(450).frame).toBe(2);expect(gateCatPose(890).frame).toBe(5);expect(gateCatPose(1320).frame).toBe(8);expect(gateCatPose(1800).frame).toBeGreaterThanOrEqual(9);
 expect(gateCatPose(1650).inside).toBe(true);expect(gateCatPose(2800).x+39*.85/2).toBeLessThan(34);
 const gate=document.createElement('div'),opening=gate.appendChild(document.createElement('div')),cat=gate.appendChild(document.createElement('span')),frames=cat.appendChild(document.createElement('span')),shadow=gate.appendChild(document.createElement('span'));
 let frame;const requestFrame=vi.fn(fn=>{frame=fn;return 1}),cancelFrame=vi.fn();const stop=animateGateCat({gate,opening,cat,frames,shadow,requestFrame,cancelFrame});frame(0);frame(1700);expect(cat.parentNode).toBe(gate);expect(cat.hidden).toBe(true);expect(opening.firstElementChild.hidden).toBe(false);expect(shadow.style.opacity).toBe('0');frame(2900);expect(cat.hidden).toBe(true);stop();expect(cat.parentNode).toBe(gate);expect(cat.hidden).toBe(false);expect(cancelFrame).toHaveBeenCalled();
});
it('opens, crosses, then presents Faheem and plays only the separate uploaded recording',async()=>{
 data.gateVoiceUrl='/picture-quest/faheem.mp3';const done=vi.fn();await render({celebrate:true,onDone:done});expect(document.querySelector('.pqg-open')).toBeNull();await act(async()=>vi.advanceTimersByTime(50));expect(document.querySelector('.pqg-open')).toBeTruthy();expect(players).toHaveLength(0);
 await act(async()=>vi.advanceTimersByTime(1000));expect(document.querySelector('.pqg').dataset.phase).toBe('crossing');
 await act(async()=>vi.advanceTimersByTime(2900));expect(document.querySelector('.pqg-welcome').textContent).toContain('بَوَّابَةَ الْحَيَوَانَاتِ');expect(players[0].url).toBe('/picture-quest/faheem.mp3');expect(players[0].play).toHaveBeenCalledOnce();
 await act(async()=>vi.advanceTimersByTime(3000));expect(done).toHaveBeenCalledOnce();await act(async()=>root.render(<div/>));expect(players[0].pause).toHaveBeenCalled();
});
it('suppresses each disabled feature without erasing the recording or blocking navigation',async()=>{
 data.gateCatEnabled=false;data.gateFaheemEnabled=false;data.gateDoorEnabled=false;data.gateVoiceEnabled=false;data.gateVoiceUrl='/kept.mp3';await render({celebrate:true});expect(document.querySelector('.pqg-cat')).toBeNull();expect(document.querySelector('.pqg-no-door-motion')).toBeTruthy();await act(async()=>vi.advanceTimersByTime(7000));expect(document.querySelector('.pqg-welcome')).toBeNull();expect(players).toHaveLength(0);expect(data.gateVoiceUrl).toBe('/kept.mp3');
});
it('honours disabled voice, global mute and reduced motion and cancels pending work on unmount',async()=>{
 data.gateVoiceUrl='/kept.mp3';data.settings.sound=false;vi.stubGlobal('matchMedia',()=>({matches:true}));const done=vi.fn();await render({celebrate:true,onDone:done});await act(async()=>vi.advanceTimersByTime(100));expect(done).toHaveBeenCalledOnce();expect(players).toHaveLength(0);expect(document.querySelector('.pqg').dataset.phase).toBe('done');
 await act(async()=>root.render(<div/>));vi.stubGlobal('matchMedia',()=>({matches:false}));data.settings.sound=true;done.mockClear();await render({celebrate:true,onDone:done});await act(async()=>vi.advanceTimersByTime(1600));await act(async()=>root.render(<div/>));await act(async()=>vi.advanceTimersByTime(10000));expect(players).toHaveLength(0);expect(done).not.toHaveBeenCalled();
});
it('never celebrates an incomplete real world; staff can simulate without writing progress',async()=>{
 const topic=bankCatalog(data).topics[0];await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} celebrate/>));expect(document.querySelector('.pqg').dataset.phase).toBe('idle');expect(document.querySelectorAll('.pqe-station small')).toHaveLength(0);
 await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} staff/>));await act(async()=>document.querySelector('.pqe-celebration-preview').click());await act(async()=>vi.advanceTimersByTime(50));expect(document.querySelector('.pqg').dataset.phase).toBe('opening');expect(topic.stages.every(s=>!s.completed)).toBe(true);
});
it('preserves custom or disabled world artwork rather than replacing it with the animated gate',async()=>{
 const topic={...bankCatalog(data).topics[0],map_image_url:'/custom.webp'};await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} celebrate/>));expect(document.querySelector('.pqg')).toBeNull();expect(document.querySelector('.pqe-gate img').getAttribute('src')).toBe('/custom.webp');
});
it('round-trips independent controls and the recording through validation and the student catalog',()=>{
 const words=structuredClone(data.words);data.gateVoiceUrl='/picture-quest/faheem.mp3';for(const k of ['gateDoorEnabled','gateCatEnabled','gateFaheemEnabled','gateVoiceEnabled'])data[k]=false;
 const checked=validateQuestBank(data);expect(checked.error).toBeUndefined();const catalog=bankCatalog(checked.config);for(const k of ['gateDoorEnabled','gateCatEnabled','gateFaheemEnabled','gateVoiceEnabled'])expect(catalog[k]).toBe(false);expect(catalog.gateVoiceUrl).toBe('/picture-quest/faheem.mp3');expect(checked.config.words).toEqual(words);expect(checked.config.epoch).toBe(data.epoch);
 data.gateVoiceUrl='javascript:alert(1)';expect(validateQuestBank(data).error).toBeTruthy();
});

it('can disable the kitten during its crossing without moving React-owned nodes or leaking a copy',async()=>{
 await render({celebrate:true});await act(async()=>vi.advanceTimersByTime(2700));expect(document.querySelector('.pqg-opening .pqg-cat')).toBeTruthy();data={...data,gateCatEnabled:false};await render({celebrate:true});expect(document.querySelector('.pqg-opening .pqg-cat')).toBeNull();expect(document.querySelector('.pqg > .pqg-cat')).toBeNull();
});
