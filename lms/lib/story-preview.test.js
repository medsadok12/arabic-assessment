import { describe, it, expect, beforeAll } from 'vitest';
import { storyPagePreview, pickStoryPreview, homeFeatureProblem } from './story-preview.js';

const SUPA = 'https://proj.supabase.co';
const MEDIA = `${SUPA}/storage/v1/object/public/media/`;

beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA; });

const PAGE1 = `<div data-sp-layout="text-only"><img class="sp-img" src="${MEDIA}stories/a.jpeg" alt="" style="width:100%">
<p style="text-align:center"><span style="font-size:1.55rem">مَرْحَبًا أَصْدِقَائِي،
اِسْمِي رَاشِد.</span></p></div>`;

// الصفحة الأولى الحقيقية لقصة «فَهيم» كما حفظها المحرر (اسم البطل بخط عريض)
const FAHEEM1 = `<div data-sp-layout="img-top" data-sp-img="${SUPA}/storage/v1/object/public/stories/pages/f.jpg"><img src="${SUPA}/storage/v1/object/public/stories/pages/f.jpg" alt=""><div class="sp-text"><p data-path-to-node="5,1,1"><span style="font-size: large;">الفِيلُ الصَّغِيرُ <b data-path-to-node="5,1,1" style="">« فَهِيم »</b> يُحِبُّ القِرَاءَةَ كَثِيرًا. <br>فِي صَبَاحِ أَحَدِ الأَيَّامِ!</span></p><p><span style="font-size: large;">تَسَاءَلَ فهِيم بِدَهْشَةٍ.</span></p></div></div>`;

describe('storyPagePreview', () => {
  it('يستخرج نص الصفحة بأسطره وصورتها من تخزيننا', () => {
    expect(storyPagePreview(PAGE1)).toEqual({
      text: 'مَرْحَبًا أَصْدِقَائِي،\nاِسْمِي رَاشِد.',
      image: `${MEDIA}stories/a.jpeg`,
      parts: [{ t: 'مَرْحَبًا أَصْدِقَائِي،\nاِسْمِي رَاشِد.', em: false }],
    });
  });
  it('يرفض صورة من موقع خارجي ويحذف الوسوم والرموز', () => {
    const r = storyPagePreview('<img src="https://evil.example/x.png"><p>قِطَّتِي&nbsp;<b>الصَّغِيرَة</b></p>');
    expect(r.text).toBe('قِطَّتِي الصَّغِيرَة');
    expect(r.image).toBeNull();
  });
  it('يُبقي ما جعله المعلم عريضاً (اسم البطل) مقطعاً بارزاً، والنص الكامل بلا علامات', () => {
    const r = storyPagePreview(FAHEEM1);
    expect(r.text).toBe('الفِيلُ الصَّغِيرُ « فَهِيم » يُحِبُّ القِرَاءَةَ كَثِيرًا.\nفِي صَبَاحِ أَحَدِ الأَيَّامِ!\nتَسَاءَلَ فهِيم بِدَهْشَةٍ.');
    expect(r.image).toBe(`${SUPA}/storage/v1/object/public/stories/pages/f.jpg`);
    expect(r.parts).toEqual([
      { t: 'الفِيلُ الصَّغِيرُ ', em: false },
      { t: '« فَهِيم »', em: true },
      { t: ' يُحِبُّ القِرَاءَةَ كَثِيرًا.\nفِي صَبَاحِ أَحَدِ الأَيَّامِ!\nتَسَاءَلَ فهِيم بِدَهْشَةٍ.', em: false },
    ]);
    expect(r.parts.map(p => p.t).join('')).toBe(r.text);
  });
  it('عريض يمتد عبر سطر فارغ لا يُبقي بقية النص بارزاً', () => {
    const r = storyPagePreview('<p><b>أ</p><p></b></p><p>ب</p>');
    expect(r.text).toBe('أ\nب');
    expect(r.parts).toEqual([{ t: 'أ', em: true }, { t: '\nب', em: false }]);
  });
});

describe('pickStoryPreview', () => {
  const base = { title: 'راشد', share_token: 'tok123', content: `${PAGE1}\n<!-- PAGE -->\n<p>صفحة 2</p>`, cover_image_url: null };
  const rashid = { ...base, page_audio: [`${MEDIA}stories/audio/p1.mp3`, null] };
  const faheem = { title: 'فَهيم', share_token: 'tokF', content: FAHEEM1, cover_image_url: null, page_audio: [`${MEDIA}stories/audio/f1.mp3`] };

  it('يختار القصة المشارَكة التي لصفحتها الأولى صوت حقيقي', () => {
    const noAudio = { ...base, title: 'بلا صوت', page_audio: [null] };
    expect(pickStoryPreview([noAudio, rashid])).toEqual({
      title: 'راشد', text: 'مَرْحَبًا أَصْدِقَائِي،\nاِسْمِي رَاشِد.', image: `${MEDIA}stories/a.jpeg`,
      parts: [{ t: 'مَرْحَبًا أَصْدِقَائِي،\nاِسْمِي رَاشِد.', em: false }],
      audio: `${MEDIA}stories/audio/p1.mp3`, href: '/story/tok123',
    });
  });
  it('القصة التي اختارها المشرف للصفحة الرئيسية تتقدّم أحدث قصة معدَّلة', () => {
    expect(pickStoryPreview([rashid, { ...faheem, featured_home: true }]).href).toBe('/story/tokF');
    expect(pickStoryPreview([rashid, faheem]).href).toBe('/story/tok123');
  });
  it('قصة مختارة لا تصلح للعرض (بلا صوت) لا تُخفي البطاقة: تُعرض القصة التالية', () => {
    expect(pickStoryPreview([rashid, { ...faheem, featured_home: true, page_audio: [null] }]).href).toBe('/story/tok123');
  });
  it('لا شيء بلا رابط مشاركة أو بصوت من خارج مجلد القصص', () => {
    expect(pickStoryPreview([{ ...base, share_token: null, page_audio: [`${MEDIA}stories/audio/p1.mp3`] }])).toBeNull();
    expect(pickStoryPreview([{ ...base, page_audio: ['https://evil.example/a.mp3'] }])).toBeNull();
    expect(pickStoryPreview([])).toBeNull();
  });
});

describe('homeFeatureProblem', () => {
  const ok = { status: 'published', content: FAHEEM1, page_audio: [`${MEDIA}stories/audio/f1.mp3`] };
  it('قصة منشورة لصفحتها الأولى نص وصوت تصلح', () => {
    expect(homeFeatureProblem(ok)).toBeNull();
  });
  it('رسالة واضحة لكل نقص', () => {
    expect(homeFeatureProblem({ ...ok, content: '' })).toMatch(/بلا صفحات/);
    expect(homeFeatureProblem({ ...ok, status: 'draft' })).toMatch(/انشر القصة/);
    expect(homeFeatureProblem({ ...ok, content: `<img src="${MEDIA}x.jpg">` })).toMatch(/تحتاج نصاً/);
    expect(homeFeatureProblem({ ...ok, page_audio: [null, 'x'] })).toMatch(/صوت قراءة للصفحة الأولى/);
  });
});
