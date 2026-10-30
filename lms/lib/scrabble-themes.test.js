import {describe,it,expect} from 'vitest';
import {SCRABBLE_THEMES,scrabbleTheme} from './scrabble-themes';
import {freshScrabble,validateScrabble,boardBefore} from './scrabble';
import {scrabbleBoardStamp} from './scrabble-journey-server';
describe('خلفيات لوحات السكرابل',()=>{
 it('يختار خلفية لكل موضوع وتظل ثابتة بين كلمات اللوحة',()=>{const c=freshScrabble();expect(SCRABBLE_THEMES).toHaveLength(12);for(const board of c.boards){expect(scrabbleTheme(board)).toBe(board.theme);for(let i=0;i<=board.rounds.length;i++){const active={...board,cells:boardBefore(board,i),cursor:i};expect(scrabbleTheme(active)).toBe(board.theme)}}});
 it('يحترم اختيار المعلم والإخفاء ويمنح الموضوع المخصص خلفية بديلة',()=>{expect(scrabbleTheme({theme:'garden',backgroundTheme:'sea'})).toBe('sea');expect(scrabbleTheme({theme:'home',backgroundTheme:'none'})).toBeNull();expect(scrabbleTheme({theme:'custom'})).toBe('home')});
 it('يحفظ تخصيص الخلفيات ولا يسمح بقيم غير صالحة',()=>{const c=freshScrabble();c.boards[0].backgroundTheme='sea';c.settings.backgroundOpacity=20;const v=validateScrabble(c);expect(v.error).toBeUndefined();expect(v.config.boards[0].backgroundTheme).toBe('sea');expect(v.config.settings.backgroundOpacity).toBe(20);for(const x of [-1,26,0.5])expect(validateScrabble({...c,settings:{...c.settings,backgroundOpacity:x}}).error).toBeTruthy();c.boards[0].backgroundTheme='invalid';expect(validateScrabble(c).error).toBeTruthy()});
 it('لا يمحو تغيير خلفية اللوحة تقدّم الطالب',()=>{const b=freshScrabble().boards[0];expect(scrabbleBoardStamp({...b,backgroundTheme:'sea'})).toBe(scrabbleBoardStamp(b))});
 it('يقبل إعدادات قديمة بلا حقول الخلفيات',()=>{const c=freshScrabble();delete c.settings.backgroundOpacity;c.boards.forEach(b=>delete b.backgroundTheme);const v=validateScrabble(c);expect(v.error).toBeUndefined();expect(v.config.settings.backgroundOpacity).toBe(14);expect(v.config.boards[0].backgroundTheme).toBe('auto')});
});
