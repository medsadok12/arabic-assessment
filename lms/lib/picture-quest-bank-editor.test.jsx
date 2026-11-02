// @vitest-environment jsdom
import React from'react';
import{createRoot}from'react-dom/client';
import{act,Simulate}from'react-dom/test-utils';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import{freshQuestBank}from'./picture-quest-bank';
import BankEditor from'../app/library/games/picture-quest/topics/manage/BankEditor';
vi.mock('next/link',()=>({default:({href,children})=>React.createElement('a',{href},children)}));
vi.mock('../app/library/games/picture-quest/Game',()=>({default:()=>React.createElement('div',{'data-preview':true},'preview')}));
let root,requests;
beforeEach(()=>{vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('confirm',()=>true);requests=[];vi.stubGlobal('fetch',vi.fn(async(url,options)=>{if(options?.method==='PUT'){const body=JSON.parse(options.body);requests.push(body);return{ok:true,json:async()=>({config:body.config,version:body.version,draftVersion:'saved'})}}return{ok:true,json:async()=>({config:freshQuestBank(),version:null,draftVersion:null})}}));document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'))});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals()});
const label=s=>[...document.querySelectorAll('label')].find(l=>l.firstChild?.textContent===s||l.querySelector('span')?.textContent===s);
const button=s=>[...document.querySelectorAll('button')].find(b=>b.textContent===s);
it('adds a word batch to the chosen topic and persists a draft with existing entries intact',async()=>{await act(async()=>root.render(React.createElement(BankEditor)));expect(document.querySelectorAll('.pqb-word-row')).toHaveLength(8);const field=label('قائمة الكلمات').querySelector('textarea');await act(async()=>Simulate.change(field,{target:{value:'جَمَلٌ\nجَبَلٌ\nقِطٌّ'}}));expect(button('إضافة 2 كلمة')).toBeTruthy();await act(async()=>button('إضافة 2 كلمة').click());expect(document.querySelectorAll('.pqb-word-row')).toHaveLength(10);await act(async()=>button('حفظ مسودة').click());expect(requests).toHaveLength(1);expect(requests[0].config.words).toHaveLength(58);expect(requests[0].config.words.find(w=>w.id==='animals-cat').label).toBe('قِطٌّ');expect(requests[0].action).toBe('draft')});
it('lets the administrator disable a topic without erasing its words or media',async()=>{await act(async()=>root.render(React.createElement(BankEditor)));const toggle=label('إتاحة هذا الموضوع').querySelector('input');await act(async()=>Simulate.change(toggle,{target:{checked:false}}));await act(async()=>button('حفظ مسودة').click());expect(requests[0].config.topics.find(t=>t.id==='animals').enabled).toBe(false);expect(requests[0].config.words.filter(w=>w.topicId==='animals')).toHaveLength(8);expect(requests[0].config.words[0].image_url).toBe('/picture-quest/cat.svg')});
