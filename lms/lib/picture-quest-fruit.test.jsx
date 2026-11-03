// @vitest-environment jsdom
import React,{act}from'react';
import{createRoot}from'react-dom/client';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import FruitCelebration from'../app/library/games/picture-quest/topics/FruitCelebration';
import StageEntrance from'../app/library/games/picture-quest/topics/StageEntrance';
import{freshQuestBank,validateQuestBank}from'./picture-quest-bank';
import{bankCatalog}from'./picture-quest-bank-server';
let root,data,players;
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('matchMedia',()=>({matches:false}));players=[];vi.stubGlobal('Audio',class{constructor(url){this.url=url;this.play=vi.fn(()=>Promise.resolve());this.pause=vi.fn();players.push(this)}});data=freshQuestBank();document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'))});
afterEach(async()=>{await act(async()=>root.unmount());vi.useRealTimers();vi.unstubAllGlobals()});
const render=props=>act(async()=>root.render(<FruitCelebration data={data} {...props}/>));
it('opens the actual canopy and panel, releases the basket, then deposits three fruits in order before cheering',async()=>{
 const done=vi.fn();data.fruitVoiceUrl='/picture-quest/fruit-voice.mp3';data.gateVoiceUrl='/picture-quest/animal-voice.mp3';await render({completed:true,celebrate:true,onDone:done});expect(document.querySelector('.pqh-open')).toBeNull();expect(document.querySelector('.pqh-frame')).toBeTruthy();expect(document.querySelector('.pqh-awning')).toBeTruthy();expect(document.querySelector('.pqh-panel')).toBeTruthy();
 await act(async()=>vi.advanceTimersByTime(60));expect(document.querySelector('.pqh-open')).toBeTruthy();expect(document.querySelector('.pqh-released')).toBeNull();
 await act(async()=>vi.advanceTimersByTime(1000));expect(document.querySelector('.pqh-released')).toBeTruthy();expect(document.querySelectorAll('.pqh-landed')).toHaveLength(0);
 await act(async()=>vi.advanceTimersByTime(900));expect(document.querySelectorAll('.pqh-landed')).toHaveLength(1);await act(async()=>vi.advanceTimersByTime(700));expect(document.querySelectorAll('.pqh-landed')).toHaveLength(2);await act(async()=>vi.advanceTimersByTime(700));expect(document.querySelectorAll('.pqh-landed')).toHaveLength(3);expect(players).toHaveLength(0);
 await act(async()=>vi.advanceTimersByTime(1000));expect(document.querySelector('.pqh-welcome').textContent).toContain('الْفَوَاكِهِ');expect(players[0].url).toBe('/picture-quest/fruit-voice.mp3');await act(async()=>vi.advanceTimersByTime(2200));expect(done).toHaveBeenCalledOnce();
});
it('cancels delayed fruits and speech on exit, and pauses a playing recording on unmount',async()=>{
 data.fruitVoiceUrl='/picture-quest/fruit-voice.mp3';const done=vi.fn();await render({celebrate:true,onDone:done});await act(async()=>vi.advanceTimersByTime(2200));await act(async()=>root.render(<div/>));await act(async()=>vi.advanceTimersByTime(10000));expect(done).not.toHaveBeenCalled();expect(players).toHaveLength(0);
 await render({celebrate:true});await act(async()=>vi.advanceTimersByTime(4500));expect(players[0].play).toHaveBeenCalledOnce();await act(async()=>root.render(<div/>));expect(players[0].pause).toHaveBeenCalled();
});
it('preserves and honours independent voice, basket, jump, Faheem and motion controls',async()=>{
 data.fruitBasketEnabled=false;data.fruitFaheemEnabled=false;data.fruitVoiceUrl='/picture-quest/kept.mp3';await render({celebrate:true});await act(async()=>vi.advanceTimersByTime(7000));expect(document.querySelector('.pqh-basket')).toBeNull();expect(document.querySelectorAll('.pqh-landed')).toHaveLength(0);expect(document.querySelector('.pqh-welcome')).toBeNull();expect(players).toHaveLength(0);
 await act(async()=>root.render(<div/>));data.fruitBasketEnabled=true;data.fruitFaheemEnabled=true;data.fruitJumpEnabled=false;data.fruitVoiceEnabled=false;data.fruitAwningEnabled=false;data.fruitPanelEnabled=false;await render({celebrate:true});await act(async()=>vi.advanceTimersByTime(100));expect(document.querySelector('.pqh-no-jump.pqh-no-awning-motion.pqh-no-panel-motion')).toBeTruthy();expect(document.querySelectorAll('.pqh-landed')).toHaveLength(3);await act(async()=>vi.advanceTimersByTime(4500));expect(players).toHaveLength(0);expect(data.fruitVoiceUrl).toBe('/picture-quest/kept.mp3');
});
it('shows a static completed kiosk without replaying a celebration and respects reduced motion',async()=>{
 await render({completed:true});expect(document.querySelector('.pqh-open.pqh-released')).toBeTruthy();expect(document.querySelectorAll('.pqh-settled')).toHaveLength(3);expect(players).toHaveLength(0);expect(document.querySelector('.pqh-welcome')).toBeNull();
 vi.stubGlobal('matchMedia',()=>({matches:true}));const done=vi.fn();await render({completed:true,celebrate:true,onDone:done});await act(async()=>vi.advanceTimersByTime(100));expect(done).toHaveBeenCalledOnce();expect(document.querySelector('.pqh').dataset.phase).toBe('done');
});
it('requires actual completion for students, offers read-only staff simulation, and preserves custom fruit artwork',async()=>{
 const topic=bankCatalog(data).topics.find(t=>t.id==='fruit');await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} celebrate/>));expect(document.querySelector('.pqh').dataset.phase).toBe('idle');
 await act(async()=>root.render(<StageEntrance data={data} topic={topic} active={topic.stages[0]} staff/>));await act(async()=>document.querySelector('.pqe-celebration-preview').click());await act(async()=>vi.advanceTimersByTime(60));expect(document.querySelector('.pqh').dataset.phase).toBe('opening');expect(topic.stages.every(s=>!s.completed)).toBe(true);
 await act(async()=>root.render(<StageEntrance data={data} topic={{...topic,map_image_url:'/custom.webp'}} active={topic.stages[0]} celebrate/>));expect(document.querySelector('.pqh')).toBeNull();expect(document.querySelector('.pqe-gate img').getAttribute('src')).toBe('/custom.webp');
});
it('round-trips fruit switches and uploaded voice through validation and the student catalog without altering animal controls or questions',()=>{
 const before=structuredClone(data);for(const k of ['fruitAwningEnabled','fruitPanelEnabled','fruitBasketEnabled','fruitJumpEnabled','fruitFaheemEnabled','fruitVoiceEnabled'])data[k]=false;data.fruitVoiceUrl='/picture-quest/fruit-voice.mp3';
 const checked=validateQuestBank(data);expect(checked.error).toBeUndefined();const catalog=bankCatalog(checked.config);for(const k of ['fruitAwningEnabled','fruitPanelEnabled','fruitBasketEnabled','fruitJumpEnabled','fruitFaheemEnabled','fruitVoiceEnabled'])expect(catalog[k]).toBe(false);expect(catalog.fruitVoiceUrl).toBe(data.fruitVoiceUrl);expect(checked.config.words).toEqual(before.words);expect(checked.config.settings).toEqual(before.settings);expect(catalog.gateDoorEnabled).toBe(true);expect(checked.config.epoch).toBe(before.epoch);data.fruitVoiceUrl='javascript:alert(1)';expect(validateQuestBank(data).error).toBeTruthy();
});
it('offers an explicit voice button when autoplay is blocked and retries the same recording',async()=>{
 vi.stubGlobal('Audio',class{constructor(url){this.url=url;this.play=vi.fn(()=>Promise.reject(Error('autoplay')));this.pause=vi.fn();players.push(this)}});data.fruitVoiceUrl='/picture-quest/fruit-voice.mp3';await render({celebrate:true});await act(async()=>vi.advanceTimersByTime(4500));const button=document.querySelector('.pqh-welcome button');expect(button.textContent).toBe('استمع إلى فهيم');players[0].play.mockResolvedValueOnce();await act(async()=>button.click());expect(players[0].play).toHaveBeenCalledTimes(2);expect(document.querySelector('.pqh-welcome button')).toBeNull();
});
