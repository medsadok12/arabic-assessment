// @vitest-environment jsdom
import React,{act}from'react';
import{createRoot}from'react-dom/client';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import StaffTopicPreview from'../app/library/games/picture-quest/topics/StaffTopicPreview';
import{buildQuestStaffPreview}from'./picture-quest-staff-preview';
import{completeQuestWorlds}from'./picture-quest-content-pack';
import{freshQuestBank}from'./picture-quest-bank';
import{freshPictureQuest}from'./picture-quest';
const env=vi.hoisted(()=>({response:null,calls:[],wait:null}));
vi.mock('./child-fetch',()=>({childFetch:async(url,options)=>{env.calls.push({url,options});if(env.wait)return env.wait;return{ok:true,json:async()=>env.response}}}));
vi.mock('./picture-quest-audio',()=>({createQuestAudio:()=>({unlock(){},preload(){},prepare(){},stop(){},effect(){},tick(){},success:async()=>true,dispose(){}})}));
let root,onExit;
const selection={topicId:'animals',stage:2};
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('matchMedia',()=>({matches:true}));vi.stubGlobal('requestAnimationFrame',fn=>setTimeout(()=>fn(0),16));vi.stubGlobal('cancelAnimationFrame',clearTimeout);const b=completeQuestWorlds(freshQuestBank(),freshPictureQuest());b.settings.animate=false;b.settings.sound=false;b.settings.controls.timer=false;env.response=buildQuestStaffPreview(b,selection);env.calls=[];env.wait=null;document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'));onExit=vi.fn()});
afterEach(async()=>{if(root)await act(async()=>root.unmount());vi.useRealTimers();vi.unstubAllGlobals()});
const render=extra=>act(async()=>root.render(<StaffTopicPreview selection={selection} onExit={onExit} {...extra}/>));
it('plays all 10 selected questions with the real engine, without any session POST or points event',async()=>{
 const points=vi.fn();window.addEventListener('points-updated',points);await render();expect(document.querySelectorAll('.answer').length).toBeGreaterThanOrEqual(2);
 for(const q of env.response.config.questions){const correct=q.options.find(o=>o.id===q.correctId).label;const answer=[...document.querySelectorAll('.answer')].find(b=>b.textContent.includes(correct));expect(answer).toBeTruthy();await act(async()=>answer.click());await act(async()=>document.querySelector('.next').click());await act(async()=>vi.advanceTimersByTimeAsync(20));}
 expect(document.querySelector('.summary').hidden).toBe(false);expect(env.calls).toHaveLength(1);expect(env.calls[0].url).toContain('topic=animals&stage=2');expect(env.calls[0].options.method).toBeUndefined();expect(points).not.toHaveBeenCalled();window.removeEventListener('points-updated',points);
});
it('returns to the stage from both its Back button and a Back request without saving anything',async()=>{await render();await act(async()=>document.querySelector('.pq-mobile-back').click());expect(onExit).toHaveBeenCalledOnce();onExit.mockClear();await render({exitRequest:1});expect(onExit).toHaveBeenCalledOnce();expect(env.calls).toHaveLength(1)});
it('ignores a late response after leaving the preview',async()=>{let resolve;env.wait=new Promise(r=>resolve=r);await render();await act(async()=>root.unmount());root=null;await act(async()=>resolve({ok:true,json:async()=>env.response}));expect(document.querySelector('#arem-quest')).toBeNull();expect(env.calls).toHaveLength(1)});
it('keeps Back available after a failed load and retries the same stage without redirects',async()=>{env.wait=Promise.resolve({ok:false,json:async()=>({error:'failed'})});await render();expect(document.querySelector('[role="alert"]')).toBeTruthy();expect(document.querySelector('.pq-staff-tools button')).toBeTruthy();env.wait=null;await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='أعد المحاولة').click());expect(document.querySelectorAll('.answer').length).toBeGreaterThanOrEqual(2);expect(env.calls).toHaveLength(2);expect(env.calls.every(c=>c.url.includes('topic=animals&stage=2')&&!c.options.method)).toBe(true)});
