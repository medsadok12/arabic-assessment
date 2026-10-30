// نفس تقسيم حروف اللعبة، مع بقاء الحركة مع حرفها والمسافة حدًا بين الكلمات.
export const SCRAMBLE_GAME = 'word_scramble';
export const SCRAMBLE_POINTS = 5;
export const SCRAMBLE_TTL = 24 * 60 * 60 * 1000;
export const scrambleId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function splitScrambleLetters(word) {
  const chunks = [];
  for (let i = 0; i < word.length; i++) {
    let ch = word[i];
    while (i + 1 < word.length && /[ً-ٰٟ]/.test(word[i + 1])) ch += word[++i];
    chunks.push(ch);
  }
  return chunks;
}
export const scrambleLetters = word => splitScrambleLetters(word.trim()).filter(ch => !/^\s+$/.test(ch));
export function scrambleSummary(round) {
  const solved = round.answers.filter(a => a.solved).length;
  const correct = round.answers.filter(a => a.solved && a.wrong === 0).length;
  return { correct, wrong: solved - correct, solved, total: round.words.length,
    attempts: round.events.length, complete: solved === round.words.length && solved > 0 };
}
export function recordScrambleAttempt(round, body) {
  if (!scrambleId(body?.attemptId) || !Number.isInteger(body.index)) return { error: 'طلب غير صالح', status: 400 };
  const repeated = round.events.find(e => e.id === body.attemptId);
  if (repeated) {
    if (repeated.index !== body.index || JSON.stringify(repeated.order) !== JSON.stringify(body.order)) return { error: 'هذا الطلب يخص إجابة أخرى.', status: 409 };
    return { round, event: repeated, repeated: true };
  }
  if (body.index !== round.cursor || !round.words[body.index]) return { error: 'لنكمل الكلمة الحالية أولًا.', status: 409 };
  if (round.events.length >= 10000) return { error: 'لنبدأ جولة جديدة؛ اكتشافاتك السابقة محفوظة.', status: 409 };
  const letters = scrambleLetters(round.words[body.index].word), order = body.order;
  if (!Array.isArray(order) || order.length !== letters.length || new Set(order).size !== letters.length || order.some(i => !Number.isInteger(i) || i < 0 || i >= letters.length)) return { error: 'أعد ترتيب الحروف المعروضة.', status: 400 };
  const right = order.map(i => letters[i]).join('').normalize('NFC') === letters.join('').normalize('NFC');
  const next = structuredClone(round), event = { id: body.attemptId, index: body.index, order, right };
  next.events.push(event);
  if (right) { next.answers[body.index].solved = true; next.cursor++; }
  else next.answers[body.index].wrong++;
  next.revision++;
  return { round: next, event, repeated: false };
}
