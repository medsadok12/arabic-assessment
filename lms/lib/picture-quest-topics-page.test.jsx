import React from'react';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
const env=vi.hoisted(()=>({auth:{user:{id:'parent'},staff:false},cookie:'first',load:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:url=>{throw Error('redirect:'+url)}}));
vi.mock('next/headers',()=>({cookies:()=>({get:()=>env.cookie?{value:env.cookie}:undefined})}));
vi.mock('./active-child',()=>({ACTIVE_CHILD_COOKIE:'active_child'}));
vi.mock('./picture-quest-server',()=>({questUser:async()=>env.auth}));
vi.mock('./supabase-admin',()=>({createAdminClient:()=>({})}));
vi.mock('./picture-quest-catalog-server',()=>({loadTopicCatalog:(...args)=>env.load(...args)}));
vi.mock('../app/library/games/picture-quest/topics/TopicHub',()=>({default:()=>null}));
import Page from'../app/library/games/picture-quest/topics/page';
beforeEach(()=>{vi.stubGlobal('React',React);env.auth={user:{id:'parent'},staff:false};env.cookie='first';env.load.mockReset().mockResolvedValue({enabled:true,journeyEnabled:true,topics:[],points:10})});
afterEach(()=>vi.unstubAllGlobals());
const hub=page=>page.props.children[1];
it('delivers the authenticated catalog with the page and preloads the map artwork',async()=>{
 const page=await Page();expect(hub(page).props.initialCatalog).toMatchObject({child:'first',value:{points:10}});expect(env.load.mock.calls[0][2].url).toContain('child=first');expect(page.props.children[0].props).toMatchObject({rel:'preload',as:'image'});
});
it('prefetches the explicit tab child instead of a different sibling cookie, including self',async()=>{
 for(const child of['second','self']){const page=await Page({searchParams:{child}});expect(hub(page).props.initialCatalog.child).toBe(child);expect(new URL(env.load.mock.calls.at(-1)[2].url).searchParams.get('child')).toBe(child)}
});
it('retains a client retry after a failed server load and authenticates before reading data',async()=>{
 env.load.mockRejectedValueOnce(Error('offline'));expect(hub(await Page()).props.initialCatalog).toBeNull();env.load.mockClear();env.auth={error:true};await expect(Page()).rejects.toThrow('redirect:/auth/login');expect(env.load).not.toHaveBeenCalled();
});
