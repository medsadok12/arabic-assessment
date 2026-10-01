import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// cachedPromise حالة على مستوى الوحدة — نحتاج نسخة جديدة من الوحدة في كل
// اختبار (vi.resetModules + dynamic import) حتى لا يتسرب التخزين المؤقت
// من اختبار لآخر.
async function freshModule() {
  vi.resetModules();
  return import('./fetchQuestions.js');
}

const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('getQuestionData — الفشل الآمن للقراءة الديناميكية', () => {
  it('يعيد source:"database" عند نجاح الاستجابة بالشكل المتوقع', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        source: 'database',
        levels: { 1: { fixed: [], shuffled: [] } },
        skills: [{ id: 'listening', name: 'الاستماع', weight: 1 }],
      }),
    });
    const { getQuestionData } = await freshModule();
    const data = await getQuestionData();
    expect(data.source).toBe('database');
    expect(data.levels[1]).toBeDefined();
  });

  it('يعود إلى source:"fallback" عند فشل الشبكة (رمي استثناء)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    const { getQuestionData } = await freshModule();
    const data = await getQuestionData();
    expect(data.source).toBe('fallback');
  });

  it('يعود إلى source:"fallback" عند استجابة HTTP غير ناجحة', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const { getQuestionData } = await freshModule();
    const data = await getQuestionData();
    expect(data.source).toBe('fallback');
  });

  it('يعود إلى source:"fallback" إن أرجع الخادم نفسه إشارة fallback صراحة', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ source: 'fallback' }) });
    const { getQuestionData } = await freshModule();
    const data = await getQuestionData();
    expect(data.source).toBe('fallback');
  });

  it('يعود إلى source:"fallback" عند شكل استجابة غير متوقع (levels/skills مفقودة)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ source: 'database' }) });
    const { getQuestionData } = await freshModule();
    const data = await getQuestionData();
    expect(data.source).toBe('fallback');
  });

  it('يخزّن النتيجة مؤقتاً — استدعاء fetch مرة واحدة فقط عبر عدة نداءات', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ source: 'database', levels: { 1: { fixed: [], shuffled: [] } }, skills: [] }),
    });
    const { getQuestionData } = await freshModule();
    await getQuestionData();
    await getQuestionData();
    await getQuestionData();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
