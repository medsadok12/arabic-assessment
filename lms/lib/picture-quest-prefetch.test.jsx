// @vitest-environment jsdom
import React,{act}from'react';
import{createRoot}from'react-dom/client';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
const env=vi.hoisted(()=>({child:null}));
vi.mock('./child-fetch',()=>({getActiveChildTab:()=>env.child}));
vi.mock('next/link',()=>({default:({prefetch,...props})=><a {...props} data-prefetch={String(prefetch)}/>}));
import QuestTopicsLink,{questTopicsHref}from'../components/QuestTopicsLink';
let root;
beforeEach(()=>{vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);env.child='second';document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'))});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals()});
it('fully prefetches topics for the active tab and updates after a child switch',async()=>{
 await act(async()=>root.render(<QuestTopicsLink href="/library/games/picture-quest/topics">ابدأ</QuestTopicsLink>));expect(document.querySelector('a').getAttribute('href')).toBe('/library/games/picture-quest/topics?child=second');expect(document.querySelector('a').dataset.prefetch).toBe('true');
 env.child='self';await act(async()=>window.dispatchEvent(new Event('focus')));expect(document.querySelector('a').getAttribute('href')).toContain('child=self');
});
it('preserves other links and query parameters and safely encodes the selector',async()=>{
 expect(questTopicsHref('/library/games/picture-quest/topics?view=map#road','a&b')).toBe('/library/games/picture-quest/topics?view=map&child=a%26b#road');expect(questTopicsHref('/library/games/picture-quest/topics',null)).toBe('/library/games/picture-quest/topics');
 await act(async()=>root.render(<QuestTopicsLink href="/library/huroof">حروف</QuestTopicsLink>));expect(document.querySelector('a').getAttribute('href')).toBe('/library/huroof');expect(document.querySelector('a').dataset.prefetch).toBe('undefined');
});
