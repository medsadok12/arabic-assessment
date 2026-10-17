import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseAudioDataUrl, isDataAudio, storableAudioUrl, healAudioRows } from './game-audio';

const WEBM_OPUS = 'data:audio/webm;codecs=opus;base64,' + btoa('fake-webm-bytes');

function fakeAdmin({ uploadError = null, updateError = null } = {}) {
  const uploads = [];
  const updates = [];
  return {
    uploads, updates,
    storage: { from: () => ({ upload: async (path, bytes, opts) => { uploads.push({ path, bytes, opts }); return { error: uploadError }; } }) },
    from: (table) => ({ update: (patch) => ({ eq: async (col, id) => { updates.push({ table, patch, id }); return { error: updateError }; } }) }),
  };
}

beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co'); });

describe('parseAudioDataUrl', () => {
  it('يفك تسجيل المتصفح مع معامل codecs', () => {
    const p = parseAudioDataUrl(WEBM_OPUS);
    expect(p.type).toBe('audio/webm');
    expect(p.ext).toBe('webm');
    expect(new TextDecoder().decode(p.bytes)).toBe('fake-webm-bytes');
  });
  it('يرفض غير الصوت والأنواع المجهولة والنص الفارغ', () => {
    expect(parseAudioDataUrl('data:image/png;base64,' + btoa('x'))).toBeNull();
    expect(parseAudioDataUrl('data:audio/unknown;base64,' + btoa('x'))).toBeNull();
    expect(parseAudioDataUrl('data:audio/webm;base64,')).toBeNull();
    expect(parseAudioDataUrl('https://x/y.webm')).toBeNull();
  });
});

describe('storableAudioUrl', () => {
  it('يرفع التسجيل الجديد ويعيد رابطاً قصيراً بدل base64', async () => {
    const admin = fakeAdmin();
    const url = await storableAudioUrl(admin, 'letter-catcher', WEBM_OPUS);
    expect(url).toMatch(/^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/media\/game-audio\/letter-catcher\/.+\.webm$/);
    expect(admin.uploads[0].opts.contentType).toBe('audio/webm');
  });
  it('يمرر الرابط الموجود والقيم الفارغة كما هي', async () => {
    const admin = fakeAdmin();
    expect(await storableAudioUrl(admin, 'g', 'https://a/b.webm')).toBe('https://a/b.webm');
    expect(await storableAudioUrl(admin, 'g', null)).toBeNull();
    expect(await storableAudioUrl(admin, 'g', undefined)).toBeUndefined();
    expect(admin.uploads).toHaveLength(0);
  });
  it('يرمي خطأً إن فشل الرفع بدل حفظ base64 بصمت', async () => {
    await expect(storableAudioUrl(fakeAdmin({ uploadError: { message: 'x' } }), 'g', WEBM_OPUS)).rejects.toThrow();
  });
});

describe('healAudioRows', () => {
  it('ينقل الصفوف القديمة فقط ويحدّث الاستجابة نفسها', async () => {
    const admin = fakeAdmin();
    const rows = [{ id: 1, audio_url: WEBM_OPUS }, { id: 2, audio_url: 'https://a/b.webm' }, { id: 3, audio_url: null }];
    await healAudioRows(admin, 'letter_catcher_words', 'letter-catcher', rows);
    expect(admin.updates).toHaveLength(1);
    expect(admin.updates[0].id).toBe(1);
    expect(isDataAudio(rows[0].audio_url)).toBe(false);
    expect(rows[1].audio_url).toBe('https://a/b.webm');
  });
  it('لا يغيّر الصف إن فشل تحديث القاعدة', async () => {
    const rows = [{ id: 1, audio_url: WEBM_OPUS }];
    await healAudioRows(fakeAdmin({ updateError: { message: 'x' } }), 't', 'g', rows);
    expect(rows[0].audio_url).toBe(WEBM_OPUS);
  });
});
