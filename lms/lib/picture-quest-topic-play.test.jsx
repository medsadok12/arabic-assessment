// @vitest-environment jsdom
import React,{act}from'react';import{createRoot}from'react-dom/client';import{beforeEach,afterEach,it,expect,vi}from'vitest';
import TopicPlay from'../app/library/games/picture-quest/topics/TopicPlay';import{freshPictureQuest,publicQuestQuestion}from'./picture-quest';
const calls=vi.hoisted(()=>[]);
vi.mock('./child-fetch',()=>({getActiveChildTab:()=>null,childFetch:async(url,options)=>{const action=JSON.parse(options.body).action;calls.push(JSON.parse(options.body));if(action==='start'&&calls.gate)await calls.gate;return{ok:true,json:async()=>action==='exit'?{exited:true}:{attemptId:'11111111-1111-4111-8111-111111111111',sessionId:'22222222-2222-4222-8222-222222222222',...globalThis.topicTestSession}}}}));
vi.mock('./picture-quest-audio',()=>({createQuestAudio:()=>({prepare(){},stop(){},dispose(){},unlock(){},tick(){},effect(){}})}));
const selection={topicId:'animals',stage:1};
let root,onExit;
beforeEach(()=>{vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('matchMedia',()=>({matches:true}));calls.length=0;calls.gate=null;const c=freshPictureQuest();c.settings.controls.timer=false;globalThis.topicTestSession={question:publicQuestQuestion(c.questions[0]),feedback:{correctChoiceId:c.questions[0].correctId},settings:c.settings,index:0,total:5,points:40,provisional:0,title:'الحيوانات'};document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'));onExit=vi.fn()});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals();delete globalThis.topicTestSession});
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
const render=async()=>act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={selection} onExit={onExit}/>));
it('sends exit only after explicit confirmation, and cancellation leaves the saved attempt alone',async()=>{await render();await act(async()=>button('← الموضوعات').click());expect(document.querySelector('.pqb-dialog')).toBeTruthy();expect(document.querySelector('#arem-quest').inert).toBe(true);expect(calls.map(c=>c.action)).toEqual(['start']);await act(async()=>button('سأواصل اللعب').click());expect(document.querySelector('.pqb-dialog')).toBeNull();expect(document.querySelector('#arem-quest').inert).toBe(false);expect(onExit).not.toHaveBeenCalled();await act(async()=>button('← الموضوعات').click());await act(async()=>button('نعم، أخرج').click());expect(calls.at(-1)).toEqual({action:'exit',attemptId:'11111111-1111-4111-8111-111111111111',topicId:'animals',stage:1});expect(onExit).toHaveBeenCalledOnce()});
it('does not discard an attempt when the page is unmounted unexpectedly',async()=>{await render();await act(async()=>root.unmount());root=createRoot(document.getElementById('host'));expect(calls.map(c=>c.action)).toEqual(['start']);expect(onExit).not.toHaveBeenCalled()});

it('phone Back uses the same confirmation dialog and sends no exit until the student confirms',async()=>{
 await render();await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={selection} onExit={onExit} exitRequest={1}/>));
 expect(document.querySelector('.pqb-dialog')).toBeTruthy();expect(calls.map(c=>c.action)).toEqual(['start']);
 await act(async()=>button('سأواصل اللعب').click());expect(document.querySelector('.pqb-dialog')).toBeNull();expect(onExit).not.toHaveBeenCalled();
 await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={selection} onExit={onExit} exitRequest={2}/>));
 await act(async()=>button('نعم، أخرج').click());expect(calls.at(-1).action).toBe('exit');expect(onExit).toHaveBeenCalledOnce();
});
it('marks only a freshly completed animal stage 3 for the gate celebration',async()=>{
 const onWorldComplete=vi.fn();globalThis.topicTestSession={...globalThis.topicTestSession,finished:true,review:false,index:15,total:15,independent:15};
 await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'animals',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).toHaveBeenCalledExactlyOnceWith('animals');
 await act(async()=>root.unmount());root=createRoot(document.getElementById('host'));globalThis.topicTestSession.review=true;onWorldComplete.mockClear();
 await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'animals',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).not.toHaveBeenCalled();
});
it('queues fruit celebration only for a newly finished stage 3, not a fruit review',async()=>{
 const onWorldComplete=vi.fn();globalThis.topicTestSession={...globalThis.topicTestSession,finished:true,review:false,index:15,total:15,independent:15};await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'fruit',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).toHaveBeenCalledExactlyOnceWith('fruit');
 await act(async()=>root.unmount());root=createRoot(document.getElementById('host'));globalThis.topicTestSession.review=true;onWorldComplete.mockClear();await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'fruit',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).not.toHaveBeenCalled();
});

it('waits for a pending start before confirming deliberate exit, then resets that exact attempt',async()=>{
 let release;calls.gate=new Promise(r=>release=r);await render();await act(async()=>button('← الموضوعات').click());await act(async()=>button('نعم، أخرج').click());expect(onExit).not.toHaveBeenCalled();expect(calls.map(c=>c.action)).toEqual(['start']);
 await act(async()=>release());expect(calls.map(c=>c.action)).toEqual(['start','exit']);expect(calls[1].attemptId).toBe('11111111-1111-4111-8111-111111111111');expect(onExit).toHaveBeenCalledOnce();
});
it('queues the school celebration only for a newly finished third stage and preserves review behaviour',async()=>{
 const onWorldComplete=vi.fn();globalThis.topicTestSession={...globalThis.topicTestSession,finished:true,review:false,index:15,total:15,independent:15};await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'school',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).toHaveBeenCalledExactlyOnceWith('school');
 await act(async()=>root.unmount());root=createRoot(document.getElementById('host'));globalThis.topicTestSession.review=true;onWorldComplete.mockClear();await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'school',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).not.toHaveBeenCalled();
});

it('queues body celebration only for a newly finished stage 3, not a body review',async()=>{
 const onWorldComplete=vi.fn();globalThis.topicTestSession={...globalThis.topicTestSession,finished:true,review:false,index:15,total:15,independent:15};await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'body',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).toHaveBeenCalledExactlyOnceWith('body');
 await act(async()=>root.unmount());root=createRoot(document.getElementById('host'));globalThis.topicTestSession.review=true;onWorldComplete.mockClear();await act(async()=>root.render(<TopicPlay settings={globalThis.topicTestSession.settings} selection={{topicId:'body',stage:3}} onExit={onExit} onWorldComplete={onWorldComplete}/>));expect(onWorldComplete).not.toHaveBeenCalled();
});
