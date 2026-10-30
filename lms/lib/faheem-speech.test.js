import { describe, it, expect } from 'vitest';
import { cleanText, chunkText, takeSentences } from './faheem-speech';

/* صوت فهيم يُقرأ جملةً جملة وهو يصل (صوت Azure الثابت) */

// يحاكي وصول الجواب قطعاً صغيرة كما يبثّه الخادم
function stream(text, size) {
  const out = [];
  let buf = '';
  for (let i = 0; i < text.length; i += size) {
    const r = takeSentences(buf + text.slice(i, i + size));
    out.push(...r.sentences);
    buf = r.rest;
  }
  out.push(...takeSentences(buf, true).sentences);
  return out;
}

describe('تنظيف النص للصوت', () => {
  it('يحذف الرموز التعبيرية والأعلام وعلامات markdown ويُبقي الحركات', () => {
    expect(cleanText('أَحْسَنْتَ يَا **بَطَلُ**! 🌟🇹🇳 ⭐')).toBe('أَحْسَنْتَ يَا بَطَلُ!');
    expect(chunkText('')).toEqual([]);
    expect(chunkText('نص قصير')).toEqual(['نص قصير']);
  });
});

describe('تقسيم الجواب إلى جمل وهو يصل', () => {
  const reply = 'عَاصِمَةُ نَيْجِيرْيَا هِيَ أَبُوجَا يَا مُحَمَّدُ الْبَطَلُ. إِنَّهَا مَدِينَةٌ كَبِيرَةٌ وَمُهِمَّةٌ فِي قَلْبِ غَرْبِ إِفْرِيقْيَا. هَلْ تُحِبُّ أَنْ نَسْتَكْشِفَ الْمَزِيدَ؟ ✨🌍';

  it('أي تقطيع للبث يعطي الجمل نفسها، ولا يضيع حرف', () => {
    const expected = stream(reply, reply.length);
    expect(expected).toHaveLength(3);
    for (const size of [1, 2, 5, 17]) expect(stream(reply, size)).toEqual(expected);
    expect(cleanText(expected.join(' '))).toBe(cleanText(reply)); // كل ما يُنطق قُرئ
  });

  it('الجملة الأولى تخرج فور اكتمالها — قبل وصول بقية الجواب', () => {
    const r = takeSentences('عَاصِمَةُ نَيْجِيرْيَا هِيَ أَبُوجَا يَا بَطَلُ. إِنَّهَا مَدِ');
    expect(r.sentences).toEqual(['عَاصِمَةُ نَيْجِيرْيَا هِيَ أَبُوجَا يَا بَطَلُ.']);
    expect(r.rest).toBe('إِنَّهَا مَدِ');
  });

  it('نقطة في آخر ما وصل لا تُنهي الجملة (قد يكون رقماً)، والنهاية تُفرغ الباقي', () => {
    expect(takeSentences('الْعَدَدُ هُوَ 3.').sentences).toEqual([]);
    expect(takeSentences('الْعَدَدُ هُوَ 3.5 تَمَامًا', true).sentences).toEqual(['الْعَدَدُ هُوَ 3.5 تَمَامًا']);
  });

  it('جملة قصيرة جداً تُضم إلى التالية كي لا يتقطع الصوت', () => {
    const r = takeSentences('مَرْحَبًا! أَنَا فَهِيمٌ صَدِيقُكَ الذَّكِيُّ. ');
    expect(r.sentences).toEqual(['مَرْحَبًا! أَنَا فَهِيمٌ صَدِيقُكَ الذَّكِيُّ.']);
  });

  it('جملة طويلة بلا نهاية تُقسم عند فاصلة فلا ينتظر الصوت طويلاً', () => {
    const long = `${'كَلِمَةٌ '.repeat(15)}، ${'وَكَلِمَةٌ '.repeat(15)}`;
    const r = takeSentences(long);
    expect(r.sentences).toHaveLength(1);
    expect(r.sentences[0].endsWith('،')).toBe(true);
    expect(r.sentences[0].length + r.rest.length + 1).toBe(long.length);
  });

  it('ذيل من رموز فقط لا يصبح طلب صوت فارغاً، والذيل القصير يلتحق بما قبله', () => {
    expect(takeSentences('هَلْ تُحِبُّ أَنْ نَسْتَكْشِفَ الْمَزِيدَ؟ ✨🌍', true).sentences)
      .toEqual(['هَلْ تُحِبُّ أَنْ نَسْتَكْشِفَ الْمَزِيدَ؟']);
    expect(takeSentences('✨🌍', true).sentences).toEqual([]);
    expect(takeSentences('هَلْ تُحِبُّ أَنْ نَسْتَكْشِفَ الْمَزِيدَ؟ هَيَّا', true).sentences)
      .toEqual(['هَلْ تُحِبُّ أَنْ نَسْتَكْشِفَ الْمَزِيدَ؟ هَيَّا']);
  });
});
