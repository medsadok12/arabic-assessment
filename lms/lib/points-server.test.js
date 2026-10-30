import { describe, it, expect } from 'vitest';
import { awardPoints } from './points-server';

/* قاعدة وهمية بسيطة: user_points (رصيد) و points_log (سجل) */
function fakeAdmin({ total = null, logged = [], lockFails = false } = {}) {
  const st = { total, log: [...logged], inserts: [] };
  const from = (table) => {
    const q = { table, filters: {}, op: 'select', payload: null };
    const run = async () => {
      if (table === 'points_log' && q.op === 'select')
        return { data: st.log.find(r => r.reason === q.filters.reason) || null };
      if (table === 'points_log' && q.op === 'insert') { st.log.push(q.payload); return { data: null }; }
      if (table === 'user_points' && q.op === 'select') return { data: st.total === null ? null : { total: st.total } };
      if (table === 'user_points' && q.op === 'update') {
        if (lockFails || q.filters.total !== st.total) return { data: null };
        st.total = q.payload.total; return { data: { total: st.total } };
      }
      if (table === 'user_points' && q.op === 'insert') { st.total = q.payload.total; st.inserts.push(q.payload); return { data: null }; }
      return { data: null };
    };
    const b = {
      select: () => b,
      eq: (k, v) => { q.filters[k] = v; return b; },
      update: (p) => { q.op = 'update'; q.payload = p; return b; },
      insert: (p) => { q.op = 'insert'; q.payload = p; return run(); },
      maybeSingle: run,
    };
    return b;
  };
  return { from, st };
}

describe('awardPoints', () => {
  it('أول نقاط للطالب: صف رصيد جديد + سجل', async () => {
    const a = fakeAdmin();
    expect(await awardPoints(a, 'u1', 'scene_story:s1', 15, { dedup: true })).toEqual({ success: true, points: 15 });
    expect(a.st.log).toEqual([{ user_id: 'u1', delta: 15, reason: 'scene_story:s1' }]);
  });
  it('يضيف للرصيد القائم', async () => {
    const a = fakeAdmin({ total: 100 });
    expect(await awardPoints(a, 'u1', 'word_wheel', 10)).toEqual({ success: true, points: 110 });
  });
  it('السبب نفسه مرتين مع dedup ← لا شيء', async () => {
    const a = fakeAdmin({ total: 40, logged: [{ reason: 'scene_story:s1' }] });
    expect(await awardPoints(a, 'u1', 'scene_story:s1', 15, { dedup: true })).toEqual({ skipped: true, points: 40 });
    expect(a.st.total).toBe(40);
  });
  it('تعارض القفل التفاؤلي', async () => {
    const a = fakeAdmin({ total: 40, lockFails: true });
    expect(await awardPoints(a, 'u1', 'x', 5)).toEqual({ conflict: true });
    expect(a.st.log).toHaveLength(0);
  });
});
