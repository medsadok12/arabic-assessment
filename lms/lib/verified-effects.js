import { randomUUID } from 'node:crypto';
const failure = (message, status = 503) => Object.assign(new Error(message), { status });
async function readRow(admin, id) {
  const { data, error } = await admin.from('game_settings').select('game_id, settings, updated_at').eq('game_id', id).maybeSingle();
  if (error) throw failure('تعذّر فتح الجولة. أعد المحاولة.');
  return data;
}
async function putRow(admin, id, settings, owner) {
  return admin.from('game_settings').insert({ game_id: id, settings, updated_by: owner, updated_at: new Date().toISOString() });
}
async function cas(admin, row, settings) {
  const { data, error } = await admin.from('game_settings').update({ settings, updated_at: new Date(Math.max(Date.now(), Date.parse(row.updated_at) + 1)).toISOString() })
    .eq('game_id', row.game_id).eq('updated_at', row.updated_at).select('game_id, settings, updated_at').maybeSingle();
  if (error) throw failure('تعذّر حفظ الجولة. أعد المحاولة.');
  return data;
}
// حجز دائم لكل أثر جانبي: إعادة الإرسال والمتزامن لا ينفذان المنح/النسخ مرتين.
// خطأ قاعدة صريح يسمح بإعادة المحاولة. انقطاع مبهم بعد الكتابة يبقى للمراجعة،
// ولا نعيد منح رصيد قد يكون كُتب بالفعل. النتيجة الأصلية تبقى في صف الجولة.
export async function deliverVerifiedEffect(admin, id, owner, action, input = null) {
  let row = await readRow(admin, id);
  if(row&&input!==null&&JSON.stringify(row.settings.input)!==JSON.stringify(input))throw failure('هذا التأكيد يخص طلبًا آخر.',409);
  if (!row) {
    const { error } = await putRow(admin, id, { state: 'working', token: randomUUID(), input }, owner);
    if (error?.code === '23505') {
      const found=await readRow(admin,id);
      if(found&&input!==null&&JSON.stringify(found.settings.input)!==JSON.stringify(input))throw failure('هذا التأكيد يخص طلبًا آخر.',409);
      return found?.settings||{state:'pending'};
    }
    if (error) return { state: 'pending' };
    row = await readRow(admin, id);
  } else {
    if (row.settings.state !== 'pending') return row.settings;
    row = await cas(admin, row, { state: 'working', token: randomUUID(), input });
    if (!row) return { state: 'pending' };
  }
  let result;
  try { result = await action(); } catch { result = { state: 'review' }; }
  result={...result,input};
  try { await cas(admin, row, result); } catch { /* الحجز يبقى working: لا نكرر أثرًا مبهمًا */ }
  return result;
}
export async function awardVerifiedPoints(admin, userId, reason, amount) {
  // reason فريد لكل كلمة في الجولة، لا يأتي مقدار النقاط من المتصفح.
  const { data: log, error: logError } = await admin.from('points_log').select('id').eq('user_id', userId).eq('reason', reason).maybeSingle();
  if (logError) return { state: 'pending' };
  if (log) return { state: 'done', amount: 0, skipped: true };
  for (let retry = 0; retry < 4; retry++) {
    const { data: current, error } = await admin.from('user_points').select('total').eq('user_id', userId).maybeSingle();
    if (error) return { state: 'pending' };
    const before = current?.total ?? 0, after = before + amount;
    const write = current
      ? await admin.from('user_points').update({ total: after, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('total', before).select('total').maybeSingle()
      : await admin.from('user_points').insert({ user_id: userId, total: after, updated_at: new Date().toISOString() }).select('total').maybeSingle();
    if (write.error?.code === '23505') continue;
    if (write.error) return { state: 'pending' };
    if (!write.data) continue;
    const { error: insertError } = await admin.from('points_log').insert({ user_id: userId, delta: amount, reason });
    if (insertError) return { state: 'review', before, after, reason, amount: amount };
    return { state: 'done', points: after, amount: amount };
  }
  return { state: 'pending' };
}
