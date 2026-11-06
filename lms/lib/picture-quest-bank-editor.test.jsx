// @vitest-environment jsdom
import React from'react';
import{createRoot}from'react-dom/client';
import{act,Simulate}from'react-dom/test-utils';
import{beforeEach,afterEach,it,expect,vi}from'vitest';
import{freshQuestBank}from'./picture-quest-bank';
import BankEditor from'../app/library/games/picture-quest/topics/manage/BankEditor';
vi.mock('next/link',()=>({default:({href,children})=>React.createElement('a',{href},children)}));
vi.mock('../app/library/games/picture-quest/topics/StageEntrance',()=>({default:()=>React.createElement('div',null,'entrance preview')}));
vi.mock('../app/library/games/picture-quest/Game',()=>({default:()=>React.createElement('div',{'data-preview':true},'preview')}));
let root,requests;
beforeEach(()=>{vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('confirm',()=>true);window.history.replaceState({},'','/');requests=[];vi.stubGlobal('fetch',vi.fn(async(url,options)=>{if(options?.method==='PUT'){const body=JSON.parse(options.body);requests.push(body);return{ok:true,json:async()=>({config:body.config,version:body.version,draftVersion:'saved'})}}return{ok:true,json:async()=>({config:freshQuestBank(),version:null,draftVersion:null})}}));document.body.innerHTML='<div id="host"></div>';root=createRoot(document.getElementById('host'))});
afterEach(async()=>{await act(async()=>root.unmount());vi.unstubAllGlobals()});
const label=s=>[...document.querySelectorAll('label')].find(l=>l.firstChild?.textContent===s||l.querySelector('span')?.textContent===s);
const section=async name=>act(async()=>[...document.querySelectorAll('.pqb-editor-nav button')].find(b=>b.textContent.endsWith(name)).click());
const topic=async id=>act(async()=>Simulate.change(document.querySelector('[aria-label="اختيار العالم"]'),{target:{value:id}}));
const button=s=>[...document.querySelectorAll('button')].find(b=>b.textContent===s);
it('adds a word batch to the chosen topic and persists a draft with existing entries intact',async()=>{await act(async()=>root.render(React.createElement(BankEditor)));expect(document.querySelectorAll('.pqb-word-row')).toHaveLength(5);const field=label('قائمة الكلمات').querySelector('textarea');await act(async()=>Simulate.change(field,{target:{value:'جَمَلٌ\nجَبَلٌ\nقِطٌّ'}}));expect(button('إضافة 2 كلمة')).toBeTruthy();await act(async()=>button('إضافة 2 كلمة').click());expect(document.querySelectorAll('.pqb-word-row')).toHaveLength(7);await act(async()=>button('حفظ مسودة').click());expect(requests).toHaveLength(1);expect(requests[0].config.words).toHaveLength(58);expect(requests[0].config.words.find(w=>w.id==='animals-cat').label).toBe('قِطٌّ');expect(requests[0].action).toBe('draft')});
it('lets the administrator disable a topic without erasing its words or media',async()=>{await act(async()=>root.render(React.createElement(BankEditor)));await section('مظهر العالم');const toggle=label('إتاحة هذا الموضوع').querySelector('input');await act(async()=>Simulate.change(toggle,{target:{checked:false}}));await act(async()=>button('حفظ مسودة').click());expect(requests[0].config.topics.find(t=>t.id==='animals').enabled).toBe(false);expect(requests[0].config.words.filter(w=>w.topicId==='animals')).toHaveLength(8);expect(requests[0].config.words[0].image_url).toBe('/picture-quest/cat.svg')});
it('assigns a word to the final reserve and preserves all its existing media and settings',async()=>{await act(async()=>root.render(React.createElement(BankEditor)));await act(async()=>document.querySelector('.pqb-word-heading button').click());const assignment=label('توزيع الكلمة').querySelector('select');await act(async()=>Simulate.change(assignment,{target:{value:'4'}}));await act(async()=>button('اعتماد التعديل').click());await act(async()=>button('حفظ مسودة').click());const word=requests[0].config.words[0];expect(word.stage).toBe(4);expect(word.image_url).toBe('/picture-quest/cat.svg');expect(word.mediaEnabled.image_url).toBe(true);expect(requests[0].config.settings).toEqual(freshQuestBank().settings)});
it('can turn off world-card depth without deleting word media or game settings',async()=>{await act(async()=>root.render(React.createElement(BankEditor)));await section('إعدادات التدريب');const depth=label('التجسيم الخفيف لبطاقات العوالم').querySelector('input');await act(async()=>Simulate.change(depth,{target:{checked:false}}));await act(async()=>button('حفظ مسودة').click());expect(requests[0].config.hubDepthEnabled).toBe(false);expect(requests[0].config.words).toEqual(freshQuestBank().words);expect(requests[0].config.settings).toEqual(freshQuestBank().settings)});
it('persists map controls, an independent uploaded world image switch and artwork choice in a draft',async()=>{
 await act(async()=>root.render(React.createElement(BankEditor)));
 await section('إعدادات التدريب');for(const name of ['مدخل العالم المصوّر','الخريطة المتصلة','فتح العوالم بالتتابع','الأشجار والمناظر المحيطة','المسار والجسور','حركة الخريطة وفتح العالم'])await act(async()=>Simulate.change(label(name).querySelector('input'),{target:{checked:false}}));
 await section('مظهر العالم');await act(async()=>Simulate.change(label('صورة العالم في الخريطة').querySelector('input'),{target:{checked:false}}));
 await act(async()=>Simulate.change(label('رسم العالم في الخريطة').querySelector('select'),{target:{value:'19'}}));
 await act(async()=>button('حفظ مسودة').click());const config=requests[0].config;
 for(const key of ['entranceEnabled','journeyEnabled','journeySequential','journeyScenery','journeyPath','journeyEffects'])expect(config[key]).toBe(false);
 expect(config.topics[0]).toMatchObject({mapArt:19,mapImageEnabled:false});expect(config.words).toEqual(freshQuestBank().words);
});
it('saves independent gate controls and retains a disabled Faheem recording',async()=>{
 await act(async()=>root.render(React.createElement(BankEditor)));
 await section('الاحتفال');const gateLabels=['فتح البوابة','عبور القط للبوابة','ظهور فهيم وتصفيقه'];
 for(const text of gateLabels)await act(async()=>Simulate.change(label(text).querySelector('input'),{target:{checked:false}}));
 await act(async()=>button('الأصوات').click());await act(async()=>Simulate.change(label('تهنئة فهيم').querySelector('input'),{target:{checked:false}}));await act(async()=>button('حفظ مسودة').click());for(const key of ['gateDoorEnabled','gateCatEnabled','gateFaheemEnabled','gateVoiceEnabled'])expect(requests[0].config[key]).toBe(false);expect(requests[0].config.words).toEqual(freshQuestBank().words);expect(requests[0].config.settings).toEqual(freshQuestBank().settings);
});
it('saves independent fruit celebration switches without modifying animal sounds or word data',async()=>{
 await act(async()=>root.render(React.createElement(BankEditor)));await topic('fruit');await section('الاحتفال');for(const text of ['رفع مظلّة الكشك','فتح واجهة الكشك','خروج سلّة الفواكه','قفز الفواكه إلى السلّة','ظهور فهيم'])await act(async()=>Simulate.change(label(text).querySelector('input'),{target:{checked:false}}));
 await act(async()=>button('الأصوات').click());await act(async()=>Simulate.change(label('تهنئة فهيم').querySelector('input'),{target:{checked:false}}));await act(async()=>button('حفظ مسودة').click());for(const k of ['fruitAwningEnabled','fruitPanelEnabled','fruitBasketEnabled','fruitJumpEnabled','fruitFaheemEnabled','fruitVoiceEnabled'])expect(requests[0].config[k]).toBe(false);expect(requests[0].config.gateVoiceEnabled).toBe(true);expect(requests[0].config.words).toEqual(freshQuestBank().words);
});
it('saves independent school animation and recording switches without discarding the uploaded files',async()=>{
 await act(async()=>root.render(React.createElement(BankEditor)));
 await topic('school');await section('الاحتفال');for(const name of ['حركة باب المدرسة','حركة جرس المدرسة','أضواء المدرسة','ظهور فهيم في احتفال المدرسة','دفتر المعرفة في احتفال المدرسة','قلب صفحات دفتر المعرفة'])await act(async()=>Simulate.change(label(name).querySelector('input'),{target:{checked:false}}));
 await act(async()=>button('حفظ مسودة').click());for(const k of ['schoolDoorEnabled','schoolBellEnabled','schoolLightsEnabled','schoolFaheemEnabled','schoolBookEnabled','schoolPagesEnabled'])expect(requests[0].config[k]).toBe(false);expect(requests[0].config.words).toEqual(freshQuestBank().words);expect(requests[0].config.schoolVoiceEnabled).toBe(true);expect(requests[0].config.schoolBellSoundEnabled).toBe(true);
});
it('persists all independent body celebration switches without changing student content',async()=>{
 await act(async()=>root.render(React.createElement(BankEditor)));
 await topic('body');await section('الاحتفال');for(const name of ['نبضة أرقام أعضاء الجسم','حركة بوابة أعضاء الجسم','ظهور فهيم في أعضاء الجسم','مشي فهيم نحو الطالب','تصفيق فهيم في أعضاء الجسم','شارة بطل أعضاء الجسم','ألبوم إنجازات أعضاء الجسم','لمعات إنجاز أعضاء الجسم'])await act(async()=>Simulate.change(label(name).querySelector('input'),{target:{checked:false}}));
 await act(async()=>button('حفظ مسودة').click());for(const k of ['bodyPressEnabled','bodyDoorEnabled','bodyFaheemEnabled','bodyWalkEnabled','bodyClapEnabled','bodyBadgeEnabled','bodyAlbumEnabled','bodySparklesEnabled'])expect(requests[0].config[k]).toBe(false);expect(requests[0].config.words).toEqual(freshQuestBank().words);
});
it('opens the requested world and stage in the word workspace without unrelated controls or writes',async()=>{
 window.history.replaceState({},'','/library/games/picture-quest/topics/manage?topic=animals&stage=2#words');
 await act(async()=>root.render(React.createElement(BankEditor)));
 expect(document.querySelector('[aria-label="اختيار العالم"]').value).toBe('animals');
 expect(document.querySelector('.pqb-stage-tabs [aria-pressed=true]').textContent).toContain('الثانية');
 expect(document.querySelectorAll('.pqb-word-row')).toHaveLength(3);
 expect(label('حركة باب المدرسة')).toBeUndefined();expect(requests).toHaveLength(0);
 await act(async()=>document.querySelector('.pqb-word-heading button').click());
 expect(label('الكلمة التي سيتعلّمها الطالب')).toBeTruthy();expect(document.querySelector('[aria-label="رفع صورة الكلمة"]')).toBeTruthy();
 const name=label('الكلمة التي سيتعلّمها الطالب').querySelector('input');await act(async()=>Simulate.change(name,{target:{value:'تغيير ملغى'}}));await act(async()=>button('إلغاء').click());await act(async()=>button('حفظ مسودة').click());expect(requests[0].config.words.some(w=>w.label==='تغيير ملغى')).toBe(false);
});
it('requires an explicit publication review and preserves draft payload and concurrency guards',async()=>{
 await act(async()=>root.render(React.createElement(BankEditor)));await act(async()=>button('مراجعة قبل النشر ←').click());expect(requests).toHaveLength(0);expect(document.querySelector('[role="dialog"]').textContent).toContain('بنك الموضوعات كاملًا');await act(async()=>button('تأكيد النشر للطلاب').click());expect(requests).toHaveLength(1);expect(requests[0]).toMatchObject({action:'publish',version:null,draftVersion:null});
});
