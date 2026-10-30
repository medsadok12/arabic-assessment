import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { recordScrambleAttempt, scrambleLetters, scrambleSummary } from './verified-scramble';
const db = vi.hoisted(() => ({ tables: {}, user: null, child: null, seq: 0, fail: null, ambiguous: null, collisions: 0 }));
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }) }));
vi.mock('./supabase-server', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) } }) }));
vi.mock('./active-child', () => ({ resolveActiveIdentity: async user => ({ effectiveUserId: db.child || user.id }) }));
vi.mock('./supabase-admin', () => {
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.op = 'select'; this.one = false; }
    select() { return this; }
    eq(k, v) { this.filters.push(r => r[k] === v); return this; }
    gt(k, v) { this.filters.push(r => r[k] > v); return this; }
    order(k) { this.sort = k; return this; }
    range(a, b) { this.slice = [a, b + 1]; return this; }
    insert(p) { this.op = 'insert'; this.payload = p; return this; }
    update(p) { this.op = 'update'; this.payload = p; return this; }
    maybeSingle() { this.one = true; return this; }
    single() { this.one = true; return this; }
    then(ok, fail) {
      return Promise.resolve().then(() => {
        if (db.fail === `${this.table}:${this.op}`) return { data: null, error: { code: 'TEST_FAILURE' } };
        const rows = db.tables[this.table] ||= [];
        let matches = rows.filter(r => this.filters.every(f => f(r)));
        if (this.op === 'insert') {
          const unique = this.table === 'game_settings' ? 'game_id' : this.table === 'user_points' ? 'user_id' : null;
          if (unique && rows.some(r => r[unique] === this.payload[unique])) return { data: null, error: { code: '23505' } };
          const r = { id: ++db.seq, ...structuredClone(this.payload) }; rows.push(r); matches = [r];
          if (db.ambiguous === `${this.table}:${this.op}`) { db.ambiguous = null; throw new Error('reply lost after commit'); }
        } else if (this.op === 'update') {
          if (this.table === 'user_points' && db.collisions > 0) { db.collisions--; matches = []; }
          for (const r of matches) Object.assign(r, structuredClone(this.payload));
        } else {
          if (this.sort) matches = matches.toSorted((a, b) => String(a[this.sort]).localeCompare(String(b[this.sort])));
          if (this.slice) matches = matches.slice(...this.slice);
        }
        return { data: structuredClone(this.one ? matches[0] || null : matches), error: null };
      }).then(ok, fail);
    }
  }
  return { createAdminClient: () => ({ from: table => new Query(table) }) };
});
const { POST } = await import('../app/api/games/word-scramble/session/route');
const oldResults = await import('../app/api/game-results/route');
const oldPoints = await import('../app/api/points/route');
const req = body => new Request('https://www.aarem.net/api/games/word-scramble/session', { method: 'POST', body: JSON.stringify(body) });
const call = async body => { const r = await POST(req(body)); return { status: r.status, body: await r.json(), headers: r.headers }; };
const start = async (extra = {}) => { const id = randomUUID(); const r = await call({ action: 'start', roundId: id, mode: 'all', filters: { minLen: 2, maxLen: 20 }, ...extra }); expect(r.status).toBe(200); return r.body; };
const roundRow = id => db.tables.game_settings.find(r => r.game_id === `word_scramble:round:${id}`);
const answerBody = (session, index = 0, wrong = false) => {
  const order = scrambleLetters(session.words[index].word).map((_, i) => i);
  if (wrong) [order[0], order[1]] = [order[1], order[0]];
  return { action: 'answer', roundId: session.roundId, attemptId: randomUUID(), index, order };
};
beforeEach(() => {
  db.user = { id: 'student', app_metadata: { role: 'student' }, user_metadata: {} }; db.child = null; db.seq = 0; db.fail = null; db.ambiguous = null; db.collisions = 0;
  db.tables = { game_settings: [], points_log: [], user_points: [{ user_id: 'student', total: 100 }], game_results: [],
    word_scramble_words: [{ id: 'a', word: 'قَلَمٌ', topic: 'المدرسة', grade_level: 1 }, { id: 'b', word: 'بَيْتٌ', topic: 'البيت', grade_level: 2 }] };
});
describe('رتّب الكلمة — تصحيح الخادم والجولة الثابتة', () => {
  it('بلا جلسة أو حساب معلق أو دور لا يبدأ جولة', async () => {
    db.user = null; expect((await call({})).status).toBe(401);
    db.user = { id: 'x', app_metadata: { role: 'student', status: 'suspended' } }; expect((await call({})).status).toBe(401);
    db.user.app_metadata = {}; db.user.user_metadata = { role: 'admin' }; expect((await call({})).status).toBe(401);
    expect(db.tables.game_settings).toHaveLength(0);
  });
  it('يختار الأسئلة من المحتوى الحقيقي، ويطبق فلاتر المعلم، لا كلمات المتصفح', async () => {
    const s = await start({ filters: { grade: 1, minLen: 2, maxLen: 20 }, words: [{ id: 'fake', word: 'خداع' }] });
    expect(s.words.map(w => w.id)).toEqual(['a']);
    expect((await start({ mode: 'topic', topic: 'البيت' })).words.map(w => w.id)).toEqual(['b']);
    expect((await call({ action: 'start', roundId: randomUUID(), mode: 'other' })).status).toBe(400);
  });
  it('إعادة البدء بنفس المعرّف تعيد الجولة نفسها؛ التعديل والحذف لا يغيران تصحيح ما شاهده الطفل', async () => {
    const s = await start();
    db.tables.word_scramble_words = [];
    const retry = await call({ action: 'start', roundId: s.roundId, mode: 'all' });
    expect(retry.body.words).toEqual(s.words);
    const r = await call(answerBody(s)); expect(r.status).toBe(200); expect(r.body.right).toBe(true);
    expect(db.tables.game_settings.filter(r => r.game_id.includes(':round:'))).toHaveLength(1);
  });
  it('يتحقق من ترتيب الحروف والتشكيل؛ الأرقام المرسلة لا تصنع درجة أو مكافأة', async () => {
    const s = await start(); const wrong = answerBody(s, 0, true);
    const r = await call({ ...wrong, correct: 999, score: 999, amount: 999 });
    expect(r.body).toMatchObject({ right: false, verified: true, summary: { correct: 0, wrong: 0, solved: 0, attempts: 1 } });
    expect(db.tables.user_points[0].total).toBe(100); expect(db.tables.game_results).toHaveLength(0);
    expect((await call({ ...answerBody(s), order: [0, 0, 0] })).status).toBe(400);
    expect((await call(answerBody(s, 1))).status).toBe(409);
    const correct = await call(answerBody(s)); expect(correct.body.summary).toMatchObject({ correct: 0, wrong: 1, solved: 1 });
    expect(db.tables.user_points[0].total).toBe(105);
  });
  it('إكمال الجولة يسجّل درجة أول محاولة حقيقية؛ إعادة الإرسال لا تكرر النتيجة أو النقاط', async () => {
    const s = await start(); await call(answerBody(s, 0, true));
    await call(answerBody(s)); const last = answerBody(s, 1);
    const done = await call(last); expect(done.body.summary).toMatchObject({ correct: 1, wrong: 1, solved: 2, total: 2, complete: true });
    expect(db.tables.game_results).toMatchObject([{ game_id: 'word_scramble', correct: 1, wrong: 1, total: 2, user_id: 'student' }]);
    for (let i = 0; i < 3; i++) expect((await call(last)).body.repeated).toBe(true);
    expect(db.tables.game_results).toHaveLength(1); expect(db.tables.points_log).toHaveLength(2); expect(db.tables.user_points[0].total).toBe(110);
  });
  it('طلبان متزامنان لنفس الإجابة لا يضاعفان الدرجة أو المكافأة', async () => {
    db.tables.word_scramble_words.length = 1; const s = await start(), b = answerBody(s);
    const results = await Promise.all([call(b), call(b), call(b)]);
    expect(results.every(r => r.status === 200)).toBe(true);
    expect(roundRow(s.roundId).settings.events).toHaveLength(1);
    expect(db.tables.points_log).toHaveLength(1); expect(db.tables.game_results).toHaveLength(1); expect(db.tables.user_points[0].total).toBe(105);
  });
  it('معرّف المحاولة لا يعاد استخدامه لإجابة مختلفة', async () => {
    const s = await start(), b = answerBody(s, 0, true); await call(b);
    expect((await call({ ...b, order: answerBody(s).order })).status).toBe(409);
    expect(roundRow(s.roundId).settings.events).toHaveLength(1);
  });
  it('عزل الطفل والحساب يسبق أي تصحيح أو منح', async () => {
    db.child = 'child-a'; const s = await start(); db.child = 'child-b';
    expect((await call(answerBody(s))).status).toBe(404);
    db.child = 'child-a'; db.user.id = 'another-parent'; expect((await call(answerBody(s))).status).toBe(404);
    expect(db.tables.points_log).toHaveLength(0);
    db.user.id = 'student'; expect((await call(answerBody(s))).status).toBe(200);
    expect(db.tables.points_log[0].user_id).toBe('child-a');
  });
  it.each(['teacher', 'admin', 'super_admin', 'supervisor'])('معاينة %s لا تكتب جولات أو نقاطًا أو نتائج طلاب', async role => {
    db.user.app_metadata.role = role; const before = structuredClone(db.tables), s = await start();
    expect(s.preview).toBe(true); expect((await call(answerBody(s))).status).toBe(403);
    expect(db.tables).toEqual(before);
  });
  it('المهلة تمنع محاولة جديدة، مع السماح باستعادة تأكيد محفوظ', async () => {
    const s = await start(), b = answerBody(s); await call(b);
    roundRow(s.roundId).settings.expiresAt = '2000-01-01';
    expect((await call(b)).status).toBe(200); expect((await call(answerBody(s, 1))).status).toBe(409);
  });
  it('استعادة الجولة تأتي من الخادم؛ تعديل التخزين المحلي لا يغير الدرجة أو هوية الطفل', async () => {
    const s = await start(); await call(answerBody(s, 0, true)); await call(answerBody(s));
    const restored = await call({ action: 'resume', roundId: s.roundId, score: 999, cursor: 999 });
    expect(restored.body).toMatchObject({ cursor: 1, summary: { correct: 0, wrong: 1, solved: 1 } });
    expect(db.tables.user_points[0].total).toBe(105);
    db.child = 'other'; expect((await call({ action: 'resume', roundId: s.roundId })).status).toBe(404);
  });
  it('استعادة جولة مكتملة تصلح نسخ تقرير فشل صراحةً، دون مضاعفة النتيجة', async () => {
    db.tables.word_scramble_words.length = 1; const s = await start(); db.fail = 'game_results:insert'; await call(answerBody(s)); db.fail = null;
    const restored = await call({ action: 'resume', roundId: s.roundId });
    expect(restored.body.summary.complete).toBe(true); expect(restored.body.confirmation.result).toBe('done');
    await call({ action: 'resume', roundId: s.roundId }); expect(db.tables.game_results).toHaveLength(1);
  });
  it('فشل حفظ الإجابة لا يمنح نقاطًا ولا نتيجة؛ إعادة المحاولة تستخدم نفس الطلب', async () => {
    const s = await start(), b = answerBody(s); db.fail = 'game_settings:update';
    expect((await call(b)).status).toBe(503); expect(db.tables.points_log).toHaveLength(0);
    db.fail = null; expect((await call(b)).body.right).toBe(true); expect(db.tables.points_log).toHaveLength(1);
  });
  it('فشل نسخ التقرير يبقي الأصل المدقق؛ إعادة التأكيد تصلح النسخ دون تكرار المكافأة', async () => {
    db.tables.word_scramble_words.length = 1; const s = await start(), b = answerBody(s); db.fail = 'game_results:insert';
    expect((await call(b)).body.result).toBe('pending'); expect(scrambleSummary(roundRow(s.roundId).settings).complete).toBe(true);
    db.fail = null; expect((await call(b)).body.result).toBe('done');
    expect(db.tables.game_results).toHaveLength(1); expect(db.tables.user_points[0].total).toBe(105);
  });
  it('تعارض الرصيد قابل لإعادة المحاولة؛ لا يغير أرصدة أخرى', async () => {
    const s = await start(), b = answerBody(s); db.collisions = 4;
    expect((await call(b)).body.reward).toBe('pending'); expect(db.tables.user_points[0].total).toBe(100);
    expect((await call(b)).body.reward).toBe('done'); expect(db.tables.user_points[0].total).toBe(105);
  });
  it('انقطاع مبهم بعد الكتابة لا يعيد المنح أو النتيجة؛ يُحفظ أثر للمراجعة', async () => {
    db.tables.word_scramble_words.length = 1; const s = await start(), b = answerBody(s); db.ambiguous = 'game_results:insert';
    expect((await call(b)).body.result).toBe('review'); await call(b);
    expect(db.tables.game_results).toHaveLength(1); expect(db.tables.user_points[0].total).toBe(105);
    const s2 = await start(), b2 = answerBody(s2); db.fail = 'points_log:insert';
    expect((await call(b2)).body.reward).toBe('review'); db.fail = null; await call(b2);
    expect(db.tables.user_points[0].total).toBe(110);
  });
  it('المساران القديمان يرفضان درجة ونقاط رتّب الكلمة فقط؛ بقية الألعاب محفوظة', async () => {
    expect((await oldPoints.POST(req({ reason: 'word_scramble' }))).status).toBe(409);
    expect((await oldPoints.POST(req({ reason: 'word_scramble:fake' }))).status).toBe(409);
    expect((await oldResults.POST(req({ game_id: 'word_scramble', category: 'عام', correct: 999, wrong: 0, total: 999 }))).status).toBe(409);
    expect((await oldPoints.POST(req({ reason: `daily_word:${new Date().toISOString().slice(0,10)}` }))).status).toBe(200);
    expect((await oldResults.POST(req({ game_id: 'other_activity', category: 'عام', correct: 1, wrong: 0, total: 1 }))).status).toBe(409);
  });
  it('الكلمات المكررة حروفها والأسماء ذات المسافات تحتفظ بمعنى الإجابة', () => {
    const round = { words: [{ word: 'بَابَ' }], answers: [{ solved: false, wrong: 0 }], events: [], cursor: 0, revision: 0 };
    expect(recordScrambleAttempt(round, { attemptId: randomUUID(), index: 0, order: [2, 1, 0] }).event.right).toBe(true);
    expect(scrambleLetters('حِمَار وَحْشِيّ').join('')).toBe('حِمَاروَحْشِيّ');
  });
});
