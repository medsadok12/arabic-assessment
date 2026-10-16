import { describe, it, expect, beforeAll } from 'vitest';
import { toPreviewWord, pickGamePreviewWords } from './game-preview.js';

const SUPA = 'https://proj.supabase.co';
const MEDIA = `${SUPA}/storage/v1/object/public/media/`;

beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA; });

const row = (over = {}) => ({
  word: '_نب', missing_letter: 'ع', options: ['م', 'غ', 'ع', 'ظ', 'خ'],
  emoji: null, image_url: `${MEDIA}letter-catcher/a.webp`, audio_url: null, ...over,
});

describe('toPreviewWord', () => {
  it('يبني الكلمة بثلاثة خيارات فيها الحرف الصحيح مرة واحدة', () => {
    const w = toPreviewWord(row({ audio_url: `${MEDIA}game-audio/letter-catcher/x.mp3` }));
    expect(w.word).toBe('_نب');
    expect(w.missing).toBe('ع');
    expect(w.options).toHaveLength(3);
    expect(w.options.filter(o => o === 'ع')).toHaveLength(1);
    expect(new Set(w.options).size).toBe(3);
    expect(w.image).toBe(`${MEDIA}letter-catcher/a.webp`);
    expect(w.audio).toBe(`${MEDIA}game-audio/letter-catcher/x.mp3`);
  });
  it('يرفض روابط خارج تخزيننا ويبقي الإيموجي بديلاً', () => {
    const w = toPreviewWord(row({ image_url: 'https://evil.example/a.png', audio_url: 'https://evil.example/a.mp3', emoji: '🍇' }));
    expect(w.image).toBeNull();
    expect(w.audio).toBeNull();
    expect(w.emoji).toBe('🍇');
  });
  it('يرفض العبارات والكلمات الطويلة والناقصة', () => {
    expect(toPreviewWord(row({ word: 'حمار و_شي', missing_letter: 'ح' }))).toBeNull();
    expect(toPreviewWord(row({ word: 'الب_تقالات', missing_letter: 'ر' }))).toBeNull();
    expect(toPreviewWord(row({ word: 'عنب' }))).toBeNull();
    expect(toPreviewWord(row({ options: ['ع', 'م'] }))).toBeNull();
    expect(toPreviewWord(row({ image_url: null, emoji: null }))).toBeNull();
  });
  it('يتجاهل التشكيل في الحرف الناقص والخيارات', () => {
    const w = toPreviewWord(row({ word: 'رمّا_', missing_letter: 'نٌ', options: ['اَ', 'ن', 'ه', 'ه'] }));
    expect(w.missing).toBe('ن');
    expect([...w.options].sort()).toEqual(['ا', 'ن', 'ه'].sort());
  });
});

describe('pickGamePreviewWords', () => {
  it('يقدّم الكلمات ذات الصوت الحقيقي', () => {
    const rows = [
      row({ word: 'ب_ت', missing_letter: 'ي', options: ['ي', 'ن', 'م'] }),
      row({ audio_url: `${MEDIA}game-audio/letter-catcher/1.mp3` }),
      row({ word: 'ق_م', missing_letter: 'ل', options: ['ل', 'ف', 'ج'] }),
      row({ word: 'بر_قال', missing_letter: 'ت', options: ['د', 'ك', 'ت'], audio_url: `${MEDIA}game-audio/letter-catcher/2.mp3` }),
    ];
    const picked = pickGamePreviewWords(rows);
    expect(picked).toHaveLength(3);
    expect(picked[0].audio && picked[1].audio).toBeTruthy();
    expect(picked[2].audio).toBeNull();
  });
  it('يُرجع null إن قلّت الكلمات الصالحة عن ثلاث', () => {
    expect(pickGamePreviewWords([row(), row({ word: 'عنب' })])).toBeNull();
    expect(pickGamePreviewWords(null)).toBeNull();
  });
});
