import { describe,it,expect } from 'vitest';
import { freshScrabble,validateScrabble,roundNeeds,checkScrabbleAnswer,wordCells,playableBoards, scrabbleRequestId, scrabbleUuid } from './scrabble';
describe('سكرابل الصغار',()=>{
 it('يعتمد النموذج الذي اختاره المعلم ويحسب التقاطعات',()=>{const c=freshScrabble();expect(validateScrabble(c).config).toEqual(c);expect(roundNeeds(c.boards[0],0)).toEqual([{pos:20,char:'ا'},{pos:26,char:'ب'}]);expect(wordCells(c.boards[0].seed[0],6).map(p=>p.char).join('')).toBe('كتاب')});
 it('يقبل ترتيبًا خاطئًا مكتملًا للتغذية المؤجلة ولا يمنحه نجاحًا',()=>{const b=freshScrabble().boards[0];expect(checkScrabbleAnswer(b,0,[{pos:20,char:'ب'},{pos:26,char:'ا'}])).toEqual({right:false});expect(checkScrabbleAnswer(b,0,[{pos:20,char:'ا'},{pos:26,char:'ب'}])).toEqual({right:true})});
 it.each([[],[{pos:20,char:'ا'}],[{pos:20,char:'ا'},{pos:20,char:'ب'}],[{pos:20,char:'ز'},{pos:26,char:'ب'}],[{pos:1,char:'ا'},{pos:26,char:'ب'}]])('يرفض الحروف المزورة أو الناقصة أو الخانات المكررة: %j',placements=>expect(checkScrabbleAnswer(freshScrabble().boards[0],0,placements).error).toBeTruthy());
 it.each(['helpCost','reward','errorMs','pictureSize','letterSize'])('يرفض إعدادًا خارج الحد: %s',key=>{const c=freshScrabble();c.settings[key]=-1;expect(validateScrabble(c).error).toBeTruthy()});
 it.each(['background','purple','error'])('يحصر الألوان في قيم CSS آمنة: %s',key=>{const c=freshScrabble();c.settings[key]='red;position:fixed';expect(validateScrabble(c).error).toBeTruthy()});
 it.each(['javascript:alert(1)','data:image/png;base64,xxx','//evil.test/image'])('يرفض روابط الوسائط غير الآمنة: %s',url=>{const c=freshScrabble();c.boards[0].rounds[0].image_url=url;expect(validateScrabble(c).error).toBeTruthy()});
 it('يرفض التقاطعات المخالفة واللوحات الخارجة عن الحدود',()=>{const c=freshScrabble();c.boards[0].rounds[0].word='تاج';c.boards[0].rounds[0].vocalized='تاج';expect(validateScrabble(c).error).toContain('تقاطع');c.boards[0].rounds[0].row=5;expect(validateScrabble(c).error).toBeTruthy()});
 it('يثبت حروف الكلمات المعطّلة مع بقاء الكلمات الباقية قابلة للعب',()=>{const c=freshScrabble();c.boards[0].rounds[0].enabled=false;const b=playableBoards(c)[0];expect(b.rounds[0].word).toBe('سمك');expect(b.seed.some(s=>s.word==='باب')).toBe(true);expect(roundNeeds(b,0)).toHaveLength(2)});
 it('لا يغيّر الافتراضي عند إنشاء نسخة أخرى',()=>{const a=freshScrabble(),b=freshScrabble();a.settings.helpCost=99;expect(b.settings.helpCost).toBe(5)});
});

it("ينشئ معرفًا صالحًا دون randomUUID في معاينة HTTP",()=>expect(scrabbleUuid(scrabbleRequestId({getRandomValues:a=>a.fill(7)}))).toBe(true));
