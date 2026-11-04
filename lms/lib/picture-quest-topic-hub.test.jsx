// @vitest-environment jsdom
import React,{act}from'react';
import{createRoot}from'react-dom/client';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import{freshQuestBank}from'./picture-quest-bank';
import{bankCatalog}from'./picture-quest-bank-server';
import TopicHub from'../app/library/games/picture-quest/topics/TopicHub';
const env=vi.hoisted(()=>({data:null,child:null,requests:[],play:null,preview:null,reply:null}));
vi.mock('next/link',()=>({default:({href,children,...props})=>React.createElement('a',{href,...props},children)}));
vi.mock('./child-fetch',()=>({getActiveChildTab:()=>env.child,childFetch:async(url,options)=>{env.requests.push({url,options});if(env.reply)return env.reply(url,options);return{ok:true,json:async()=>structuredClone(env.data)}}}));
vi.mock('../app/library/games/picture-quest/topics/TopicPlay',()=>({default:props=>{env.play=props;return React.createElement('section',{'aria-label':'training'},React.createElement('button',{onClick:props.onExit},'العودة للعوالم'))}}));
vi.mock('../app/library/games/picture-quest/topics/StaffTopicPreview',()=>({default:props=>{env.preview=props;return React.createElement('button',{'data-staff-preview':true,onClick:props.onExit},'عودة')}}));
let root,bank;
beforeEach(()=>{vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);window.history.replaceState({},'','/library/games/picture-quest/topics');bank=freshQuestBank();bank.journeyEnabled=false;bank.journeySequential=false;env.child=null;env.requests=[];env.reply=null;env.play=null;env.data={...bankCatalog(bank,{attempts:{'animals:1':{index:2,questions:Array(5)}},round:{key:'animals:1',index:2,questions:Array(5),selection:{topicId:'animals',stage:1}},completions:{'fruit:1':true}}),points:628};document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'))});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals()});
const render=staff=>act(async()=>root.render(<TopicHub staff={!!staff}/>));
const world=title=>[...document.querySelectorAll('.pqw-world')].find(b=>b.querySelector('strong')?.textContent===title);
it('keeps the focus screen uncluttered and opens stages only after selecting a world',async()=>{await render();expect(document.documentElement.classList.contains('pqw-focus')).toBe(true);expect(document.querySelectorAll('.pqw-world')).toHaveLength(4);expect(document.querySelector('.pqf-path')).toBeNull();expect(document.querySelector('.pqf-menu')).toBeNull();expect(document.querySelector('.pqf-score')).toBeNull();expect(document.querySelectorAll('.pqf-resume')).toHaveLength(1);await act(async()=>world('الحيوانات').click());expect(document.querySelector('.pqf-grid')).toBeNull();expect(document.querySelectorAll('.pqf-step')).toHaveLength(3);expect(document.querySelectorAll('.pqf-step')[1].disabled).toBe(true);expect(document.querySelector('.pqf-status').textContent).toContain('2 من 5');expect(document.querySelectorAll('.pqf-action .pqf-go')).toHaveLength(1);expect(env.requests).toHaveLength(1);await act(async()=>document.querySelector('.pqf-action .pqf-go').click());expect(env.play.selection).toEqual({topicId:'animals',stage:1});expect(document.documentElement.classList.contains('pqw-focus')).toBe(false);await act(async()=>{document.querySelector('[aria-label=training] button').click();await new Promise(r=>setTimeout(r,30));});expect(document.querySelector('.pqf-header h1').textContent).toBe('الحيوانات');expect(document.documentElement.classList.contains('pqw-focus')).toBe(true);expect(env.requests).toHaveLength(2)});
it('retains original navigation and balance in the secondary menu, with locks and review intact',async()=>{await render();expect(document.querySelector('.pqf-challenge').disabled).toBe(true);await act(async()=>document.querySelector('.pqf-more').click());expect(document.querySelector('.pqf-score').textContent).toContain('628');expect(document.querySelector('a[href="/library/games/picture-quest?classic=1"]')).toBeTruthy();await act(async()=>document.querySelector('.pqf-menu a').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(document.querySelector('.pqf-menu')).toBeNull();expect(document.activeElement).toBe(document.querySelector('.pqf-more'));await act(async()=>world('الفواكه').click());const stages=document.querySelectorAll('.pqf-step');expect(stages[1].getAttribute('aria-pressed')).toBe('true');expect(document.querySelector('.pqf-action .pqf-go').disabled).toBe(true);expect(document.querySelector('.pqf-status').textContent).toBe('قيد التجهيز');await act(async()=>stages[0].click());expect(document.querySelector('.pqf-status').textContent).toContain('مكتملة');await act(async()=>document.querySelector('.pqf-action .pqf-go').click());expect(env.play.selection).toEqual({topicId:'fruit',stage:1})});
it('honours independent depth, animation, score and progress controls and staff previews',async()=>{env.data.hubDepthEnabled=false;env.data.settings.animate=false;env.data.settings.controls.progress=false;env.data.settings.controls.score=false;await render(true);expect(document.querySelector('.pqw-flat.pqw-no-motion')).toBeTruthy();await act(async()=>document.querySelector('.pqf-more').click());expect(document.querySelector('.pqf-score')).toBeNull();await act(async()=>world('الحيوانات').click());expect(document.querySelectorAll('.pqf-step')[2].disabled).toBe(false);await act(async()=>document.querySelectorAll('.pqf-step')[2].click());await act(async()=>document.querySelector('.pqf-action .pqf-go').click());expect(env.preview.selection).toEqual({topicId:'animals',stage:3});expect(document.querySelector('[data-staff-preview]')).toBeTruthy();expect(env.play).toBeNull()});
it('does not reuse a selected stage or progress after switching children',async()=>{await render();await act(async()=>world('الحيوانات').click());await act(async()=>document.querySelector('.pqf-action .pqf-go').click());env.play=null;env.child='child-two';env.data={...bankCatalog(bank,{}),points:0};await act(async()=>window.dispatchEvent(new Event('focus')));expect(env.play).toBeNull();expect(document.querySelector('.pqf-grid')).toBeTruthy();expect(document.querySelector('.pqf-resume')).toBeNull();await act(async()=>document.querySelector('.pqf-more').click());expect(document.querySelector('.pqf-score').textContent).toContain('0')});
it('paginates large banks rather than extending the worlds page, preserving the current page on back',async()=>{const original=env.data.topics[0];env.data.topics=Array.from({length:17},(_,i)=>({...structuredClone(original),id:'topic-'+i,title:'عالم '+i}));await render();expect(document.querySelectorAll('.pqw-world')).toHaveLength(8);expect(document.querySelector('.pqf-pages').textContent).toContain('1 / 3');await act(async()=>document.querySelector('[aria-label="العوالم التالية"]').click());expect(document.querySelectorAll('.pqw-world')).toHaveLength(8);expect(document.querySelector('.pqf-pages').textContent).toContain('2 / 3');await act(async()=>world('عالم 8').click());await act(async()=>{document.querySelector('.pqf-back').click();await new Promise(r=>setTimeout(r,30));});expect(document.querySelector('.pqf-pages').textContent).toContain('2 / 3');expect(document.activeElement).toBe(world('عالم 8'));expect(env.requests).toHaveLength(1)});
it('removes the focus class on unmount and does not discard a saved attempt',async()=>{await render();await act(async()=>root.unmount());root=createRoot(document.getElementById('host'));expect(document.documentElement.classList.contains('pqw-focus')).toBe(false);expect(env.requests.every(r=>!r.options?.method||r.options.method==='GET')).toBe(true)});

it('keeps stages and worlds visible during a slow refresh and applies fresh progress',async()=>{
 await render();await act(async()=>world('الحيوانات').click());await act(async()=>document.querySelector('.pqf-action .pqf-go').click());
 let resolve;env.reply=()=>new Promise(r=>{resolve=r});
 await act(async()=>{env.play.onExit();await new Promise(r=>setTimeout(r,30))});
 expect(document.querySelector('.pqf-topic')).toBeTruthy();expect(document.body.textContent).not.toContain('نجهّز العوالم');
 await act(async()=>{document.querySelector('.pqf-back').click();await new Promise(r=>setTimeout(r,30))});expect(document.querySelector('.pqf-grid')).toBeTruthy();
 const updated=structuredClone(env.data);updated.points=653;updated.topics[0].stages[0].completed=true;updated.topics[0].stages[1].unlocked=true;
 await act(async()=>resolve({ok:true,json:async()=>updated}));await act(async()=>document.querySelector('.pqf-more').click());expect(document.querySelector('.pqf-score').textContent).toContain('653');
 await act(async()=>world('الحيوانات').click());expect(document.querySelectorAll('.pqf-step')[1].disabled).toBe(false);
});
it('keeps navigation usable after a background failure and retries',async()=>{
 await render();await act(async()=>world('الحيوانات').click());await act(async()=>document.querySelector('.pqf-action .pqf-go').click());env.reply=async()=>{throw Error('offline')};
 await act(async()=>{env.play.onExit();await new Promise(r=>setTimeout(r,30))});expect(document.querySelector('.pqf-topic')).toBeTruthy();expect(document.querySelector('.pqf-refresh-error')).toBeTruthy();expect(document.querySelector('.pqf-message')).toBeNull();
 env.reply=null;await act(async()=>document.querySelector('.pqf-refresh-error button').click());expect(document.querySelector('.pqf-refresh-error')).toBeNull();
});
it('hides the previous child catalog and ignores a delayed response after switching',async()=>{
 await render();await act(async()=>world('الحيوانات').click());await act(async()=>document.querySelector('.pqf-action .pqf-go').click());
 let oldReply,newReply;env.reply=()=>new Promise(r=>{oldReply=r});await act(async()=>{env.play.onExit();await new Promise(r=>setTimeout(r,30))});const oldRequest=env.requests.at(-1);
 env.child='child-two';env.reply=()=>new Promise(r=>{newReply=r});await act(async()=>window.dispatchEvent(new Event('focus')));expect(oldRequest.options.signal.aborted).toBe(true);expect(document.querySelector('.pqf-grid')).toBeNull();expect(document.querySelector('.pqf-topic')).toBeNull();
 await act(async()=>oldReply({ok:true,json:async()=>env.data}));expect(document.querySelector('.pqf-grid')).toBeNull();
 await act(async()=>newReply({ok:true,json:async()=>({...bankCatalog(bank),points:0})}));expect(document.querySelector('.pqf-grid')).toBeTruthy();expect(document.querySelector('.pqf-resume')).toBeNull();
});

it('does not restart an active game if the previous background refresh arrives late',async()=>{
 await render();await act(async()=>world('الحيوانات').click());await act(async()=>document.querySelector('.pqf-action .pqf-go').click());
 let resolve;env.reply=()=>new Promise(r=>{resolve=r});await act(async()=>{env.play.onExit();await new Promise(r=>setTimeout(r,30))});
 await act(async()=>document.querySelector('.pqf-action .pqf-go').click());const settings=env.play.settings;
 await act(async()=>resolve({ok:true,json:async()=>({...structuredClone(env.data),points:999})}));expect(env.play.settings).toBe(settings);expect(document.querySelector('[aria-label=training]')).toBeTruthy();
});
it('uses matching server data immediately without a second catalog request',async()=>{
 env.child='second';await act(async()=>root.render(<TopicHub initialCatalog={{child:'second',value:env.data,loadedAt:Date.now()}}/>));expect(document.querySelector('.pqf-grid')).toBeTruthy();expect(env.requests).toHaveLength(0);await act(async()=>world('الحيوانات').click());expect(document.querySelector('.pqf-topic')).toBeTruthy();
});
it('never hydrates a sibling catalog and fetches for the actual tab instead',async()=>{
 env.child='second';let resolve;env.reply=()=>new Promise(r=>{resolve=r});await act(async()=>root.render(<TopicHub initialCatalog={{child:'first',value:env.data,loadedAt:Date.now()}}/>));expect(document.querySelector('.pqf-grid')).toBeNull();expect(env.requests).toHaveLength(1);
 await act(async()=>resolve({ok:true,json:async()=>({...bankCatalog(bank),points:0})}));expect(document.querySelector('.pqf-grid')).toBeTruthy();expect(document.querySelector('.pqf-resume')).toBeNull();
});
it('keeps an older prefetched catalog visible while checking fresh progress, even on failure',async()=>{
 env.reply=async()=>{throw Error('offline')};await act(async()=>root.render(<TopicHub initialCatalog={{child:'self',value:env.data,loadedAt:Date.now()-30000}}/>));expect(document.querySelector('.pqf-grid')).toBeTruthy();expect(env.requests).toHaveLength(1);expect(document.querySelector('.pqf-refresh-error')).toBeTruthy();expect(document.querySelector('.pqf-message')).toBeNull();
});

it('refreshes a router-restored prefetched page after a completed or abandoned game',async()=>{
 const seed={child:'self',value:structuredClone(env.data),loadedAt:Date.now()-1000};await render();await act(async()=>world('الحيوانات').click());await act(async()=>document.querySelector('.pqf-action .pqf-go').click());await act(async()=>{env.play.onExit();await new Promise(r=>setTimeout(r,30))});
 await act(async()=>root.unmount());root=createRoot(document.getElementById('host'));env.requests=[];env.data={...bankCatalog(bank),points:0};await act(async()=>root.render(<TopicHub initialCatalog={seed}/>));expect(env.requests).toHaveLength(1);expect(document.querySelector('.pqf-resume')).toBeNull();
});
