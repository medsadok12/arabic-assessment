import { describe, it, expect } from 'vitest';
import { storyPageText, speechChunks, pickArabicVoice } from './story-speech.js';

/* صفحة بنفس شكل محرر القصص الفعلي (صورة + فقرات + قائمة + «») */
const PAGE = `<div data-sp-layout="img-top"><img src="https://x/a.jpg" alt=""><div class="sp-text">
<p><span style="font-size: large;">الفِيلُ الصَّغِيرُ <b>« فَهِيم »</b> يُحِبُّ القِرَاءَةَ كَثِيرًا. <br>فِي صَبَاحِ أَحَدِ الأَيَّامِ، دَخَلَ مَكْتَبَةَ الغَابَةِ!</span></p>
<ul><li><p>تَسَاءَلَ فَهِيم:&nbsp;أَيْنَ ذَهَبَتْ الحُرُوفُ؟</p></li></ul></div></div>`;

describe('storyPageText', () => {
  it('يستخرج النص بأسطره بلا وسوم ولا رموز HTML', () => {
    expect(storyPageText(PAGE)).toBe(
      'الفِيلُ الصَّغِيرُ « فَهِيم » يُحِبُّ القِرَاءَةَ كَثِيرًا.\n'
      + 'فِي صَبَاحِ أَحَدِ الأَيَّامِ، دَخَلَ مَكْتَبَةَ الغَابَةِ!\n'
      + 'تَسَاءَلَ فَهِيم: أَيْنَ ذَهَبَتْ الحُرُوفُ؟');
  });
  it('صفحة صورة فقط ← نص فارغ (فلا زر قراءة آلية لها)', () => {
    expect(storyPageText('<img src="https://x/a.jpg"><p>&nbsp;</p>')).toBe('');
    expect(storyPageText(null)).toBe('');
  });
});

describe('speechChunks', () => {
  it('جملة لكل قطعة، وتُحذف علامات التنصيص', () => {
    expect(speechChunks(storyPageText(PAGE))).toEqual([
      'الفِيلُ الصَّغِيرُ فَهِيم يُحِبُّ القِرَاءَةَ كَثِيرًا.',
      'فِي صَبَاحِ أَحَدِ الأَيَّامِ، دَخَلَ مَكْتَبَةَ الغَابَةِ!',
      'تَسَاءَلَ فَهِيم: أَيْنَ ذَهَبَتْ الحُرُوفُ؟',
    ]);
  });
  it('الإيموجي لا يُقرأ، والقطع التي بلا كلمات تُحذف', () => {
    expect(speechChunks('🐘 فَهِيم يَقْرَأُ 📚!\n«»\n...')).toEqual(['فَهِيم يَقْرَأُ !']);
  });
  it('الجملة الطويلة تُقسَّم عند الفواصل ثم الكلمات دون تجاوز الحد', () => {
    const longSentence = Array.from({ length: 30 }, (_, i) => `كَلِمَة${i}`).join(' ');
    const chunks = speechChunks(`أَوَّلاً، ${longSentence}.`, 60);
    expect(chunks[0]).toBe('أَوَّلاً،');
    expect(chunks.every(c => c.length <= 60)).toBe(true);
    expect(chunks.join(' ')).toBe(`أَوَّلاً، ${longSentence}.`);
  });
});

describe('pickArabicVoice', () => {
  const v = (name, lang) => ({ name, lang });
  it('يفضّل الصوت الطبيعي ثم Google ثم العربية السعودية', () => {
    const voices = [
      v('Google US English', 'en-US'),
      v('Microsoft Naayf', 'ar-SA'),
      v('Google العربية', 'ar'),
      v('Microsoft Shakir Online (Natural) - Arabic (Egypt)', 'ar-EG'),
    ];
    expect(pickArabicVoice(voices).name).toBe('Microsoft Shakir Online (Natural) - Arabic (Egypt)');
    expect(pickArabicVoice(voices.slice(0, 3)).name).toBe('Google العربية');
    expect(pickArabicVoice([v('Majed', 'ar-001'), v('Maged', 'ar_SA')]).name).toBe('Maged');
  });
  it('null إن لم يكن في الجهاز صوت عربي', () => {
    expect(pickArabicVoice([v('Samantha', 'en-US')])).toBeNull();
    expect(pickArabicVoice(undefined)).toBeNull();
  });
});
