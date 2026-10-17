import { describe, it, expect, beforeAll } from 'vitest';
import { resolveStoryCover, storyCoverPathFromUrl, removeStoryCover } from './story-cover.js';

const SUPA = 'https://proj.supabase.co';
const BASE = `${SUPA}/storage/v1/object/public/media/`;
const PNG  = 'data:image/webp;base64,' + Buffer.from('fake-webp-bytes').toString('base64');

function fakeAdmin({ uploadError = null } = {}) {
  const uploads = [];
  const removed = [];
  return {
    uploads, removed,
    storage: { from: () => ({
      upload: async (path, buf, opts) => { uploads.push({ path, buf, opts }); return { error: uploadError }; },
      remove: async (paths) => { removed.push(...paths); return { error: null }; },
    }) },
  };
}

beforeAll(() => { process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA; });

describe('resolveStoryCover', () => {
  it('يرفع الصورة الجديدة إلى مجلد الأغلفة ويحفظ رابطاً قصيراً بدل base64', async () => {
    const admin = fakeAdmin();
    const r = await resolveStoryCover(admin, PNG, 'f745d0bc-a08f');
    expect(r.value).toMatch(/^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/media\/stories\/covers\/f745d0bc-a08f-.+\.webp$/);
    expect(admin.uploads[0].opts.contentType).toBe('image/webp');
  });

  it('لا تغيير، إزالة، والإبقاء على غلاف موجود', async () => {
    const admin = fakeAdmin();
    expect(await resolveStoryCover(admin, undefined, 'x')).toEqual({ value: undefined });
    expect(await resolveStoryCover(admin, null, 'x')).toEqual({ value: null });
    expect(await resolveStoryCover(admin, '', 'x')).toEqual({ value: null });
    const kept = `${BASE}stories/covers/a-1.webp`;
    expect(await resolveStoryCover(admin, kept, 'x')).toEqual({ value: kept });
    expect(admin.uploads).toHaveLength(0);
  });

  it('يرفض روابط خارج مجلد الأغلفة ولا يحفظ base64 إن فشل الرفع', async () => {
    const admin = fakeAdmin();
    expect((await resolveStoryCover(admin, 'https://evil.example/x.png', 'x')).error).toBeTruthy();
    expect((await resolveStoryCover(admin, `${BASE}library/cards/a.webp`, 'x')).error).toBeTruthy();
    expect((await resolveStoryCover(admin, `${BASE}stories/covers/../x.webp`, 'x')).error).toBeTruthy();
    expect((await resolveStoryCover(fakeAdmin({ uploadError: { message: 'x' } }), PNG, 'x')).error).toBeTruthy();
  });
});

describe('removeStoryCover', () => {
  it('يحذف أغلفتنا فقط', async () => {
    const admin = fakeAdmin();
    await removeStoryCover(admin, `${BASE}stories/covers/a-1.webp`);
    await removeStoryCover(admin, `${BASE}stories/audio/a.mp3`);
    await removeStoryCover(admin, null);
    expect(admin.removed).toEqual(['stories/covers/a-1.webp']);
    expect(storyCoverPathFromUrl(`${BASE}stories/covers/a-1.webp`)).toBe('stories/covers/a-1.webp');
  });
});
