import { describe, it, expect, beforeAll } from 'vitest';
import { storyPagePreview, pickStoryPreview } from './story-preview.js';

const SUPA = 'https://proj.supabase.co';
const MEDIA = `${SUPA}/storage/v1/object/public/media/`;

beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA; });

const PAGE1 = `<div data-sp-layout="text-only"><img class="sp-img" src="${MEDIA}stories/a.jpeg" alt="" style="width:100%">
<p style="text-align:center"><span style="font-size:1.55rem">مَرْحَبًا أَصْدِقَائِي،
اِسْمِي رَاشِد.</span></p></div>`;

describe('storyPagePreview', () => {
  it('يستخرج نص الصفحة بأسطره وصورتها من تخزيننا', () => {
    expect(storyPagePreview(PAGE1)).toEqual({
      text: 'مَرْحَبًا أَصْدِقَائِي،\nاِسْمِي رَاشِد.',
      image: `${MEDIA}stories/a.jpeg`,
    });
  });
  it('يرفض صورة من موقع خارجي ويحذف الوسوم والرموز', () => {
    const r = storyPagePreview('<img src="https://evil.example/x.png"><p>قِطَّتِي&nbsp;<b>الصَّغِيرَة</b></p>');
    expect(r).toEqual({ text: 'قِطَّتِي الصَّغِيرَة', image: null });
  });
});

describe('pickStoryPreview', () => {
  const base = { title: 'راشد', share_token: 'tok123', content: `${PAGE1}\n<!-- PAGE -->\n<p>صفحة 2</p>`, cover_image_url: null };
  it('يختار القصة المشارَكة التي لصفحتها الأولى صوت حقيقي', () => {
    const noAudio = { ...base, title: 'بلا صوت', page_audio: [null] };
    const ok = { ...base, page_audio: [`${MEDIA}stories/audio/p1.mp3`, null] };
    expect(pickStoryPreview([noAudio, ok])).toEqual({
      title: 'راشد', text: 'مَرْحَبًا أَصْدِقَائِي،\nاِسْمِي رَاشِد.', image: `${MEDIA}stories/a.jpeg`,
      audio: `${MEDIA}stories/audio/p1.mp3`, href: '/story/tok123',
    });
  });
  it('لا شيء بلا رابط مشاركة أو بصوت من خارج مجلد القصص', () => {
    expect(pickStoryPreview([{ ...base, share_token: null, page_audio: [`${MEDIA}stories/audio/p1.mp3`] }])).toBeNull();
    expect(pickStoryPreview([{ ...base, page_audio: ['https://evil.example/a.mp3'] }])).toBeNull();
    expect(pickStoryPreview([])).toBeNull();
  });
});
