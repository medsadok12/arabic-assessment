import { calcScore, starsFor } from './word-wheel';
export const VERIFIED_GAMES = ['letter_catcher', 'vowel_balloon', 'word_smash', 'word_image_match', 'word_wheel'];
export const verifiedError = (message, status = 400) => Object.assign(new Error(message), { status });
const strip = v => String(v).normalize('NFC').replace(/[ً-ْٰـ]/g, '');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function trainingSummary(r) {
  const done = r.answers.filter(a => a.done).length;
  const solved = r.answers.filter(a => a.right).length;
  const first = r.answers.filter(a => a.right && !a.wrong && !a.hints).length;
  return { correct: r.game === 'word_wheel' ? solved : first, wrong: done - (r.game === 'word_wheel' ? solved : first), solved, done,
    total: r.questions.length, attempts: r.events.filter(e => e.action === 'answer').length, assisted: r.answers.filter(a => a.hints > 0).length,
    complete: r.closed, cursor: r.answers.findIndex(a => !a.done), score: r.game === 'word_wheel' && r.wheel.mode === 'challenge' ? r.questions.reduce((n, q, i) => n + (r.answers[i].right ? calcScore(q.expected, [...r.wheel.letters, r.wheel.center]) : 0), 0) : undefined };
}
// يعيد تشغيل حركات الكلمة وفق إعدادات المعلم؛ الكشف ليس إجابة صحيحة.
export function verifyWheelTrace(word, wheel, trace) {
  if (!Array.isArray(trace) || trace.length > 1000) throw verifiedError('أعد المحاولة من العجلة.');
  const s = wheel.settings, style = wheel.mode === 'picture' ? 'picture' : s.complete_style;
  const hidden = style === 'missing' ? (wheel.missingIndices?.[word] ?? Math.floor(word.length/2)) : -1;
  let filled = [...word].map((ch, i) => style === 'missing' && i !== hidden ? ch : null), wrong = 0, hints = 0, status = 'play';
  const miss = () => { wrong++; if (s.max_attempts > 0 && wrong >= s.max_attempts) status = 'revealed'; };
  for (const event of trace) {
    if (status !== 'play') throw verifiedError('انتهت هذه الكلمة بالفعل.');
    if (event.type === 'hint') {
      if (!s.hints_enabled || hints >= s.hints_limit) throw verifiedError('انتهت تلميحات هذه الكلمة.');
      hints++;
      if (style !== 'missing') { const pos = [...word].findIndex((c, i) => filled[i] !== c); filled = [...word].map((c, i) => i <= pos ? c : null); if (!filled.includes(null)) status = 'solved'; }
    } else if (event.type === 'undo') {
      const last = filled.map(Boolean).lastIndexOf(true); if (last >= 0) filled[last] = null;
    } else if (event.type === 'letter') {
      const letter = event.letter;
      if (typeof letter !== 'string' || ![...wheel.letters, wheel.center].includes(letter)) throw verifiedError('اختر حرفًا من العجلة.');
      if (style === 'missing') { if (letter === word[hidden]) status = 'solved'; else miss(); }
      else {
        const pos = filled.indexOf(null); if (pos < 0) throw verifiedError('أعد المحاولة من العجلة.');
        if (s.instant_check && letter !== word[pos]) miss();
        else { filled[pos] = letter; if (!filled.includes(null)) { if (filled.join('') === word) status = 'solved'; else { miss(); filled = Array(word.length).fill(null); } } }
      }
    } else throw verifiedError('أعد المحاولة من العجلة.');
  }
  if (status === 'play') throw verifiedError('أكمل حروف الكلمة أولًا.');
  return { right: status === 'solved', status, wrong, hints };
}
export function applyTrainingEvent(round, body, now = Date.now()) {
  if (typeof body.eventId !== 'string' || !/^[\da-f-]{36}$/i.test(body.eventId)) throw verifiedError('أعد المحاولة من التدريب.');
  const command = { action: body.action, index: body.index, value: body.value, trace: body.trace };
  const old = round.events.find(e => e.id === body.eventId);
  if (old) { if (!equal(old.command, command)) throw verifiedError('هذا الطلب يخص إجابة أخرى.', 409); return { round, event: old, repeated: true }; }
  if (round.events.length >= 10000) throw verifiedError('ابدأ جولة جديدة؛ نتائجك السابقة محفوظة.', 409);
  const r = structuredClone(round), event = { id: body.eventId, action: body.action, command, at: now, right: false, reward: 0 };
  const challenge = r.game === 'word_wheel' && r.wheel.mode === 'challenge';
  if (challenge && r.clock.running) { r.clock.left = Math.max(0, r.clock.left - (now - r.clock.at)); r.clock.at = now; }
  if (r.closed) {
    if (body.action !== 'finish') throw verifiedError('انتهت الجولة. ابدأ جولة جديدة.', 409);
  } else if (body.action === 'begin' && challenge) {
    if (!r.clock.started) { r.clock.started = true; r.clock.running = true; r.clock.at = now; }
  } else if (body.action === 'continue' && challenge) {
    if (!r.clock.started) throw verifiedError('ابدأ التحدي أولًا.', 409);
    r.clock.running = true; r.clock.at = now;
  } else if (body.action === 'hint' && challenge) {
    if (!r.wheel.settings.hints_enabled || r.hints >= r.wheel.settings.hints_limit) throw verifiedError('انتهت التلميحات.');
    r.hints++;
  } else if (body.action === 'finish') {
    if (!challenge && !r.answers.every(a => a.done)) throw verifiedError('أكمل أسئلة الجولة أولًا.', 409);
    r.closed = true;
  } else if (body.action === 'answer') {
    let index = body.index;
    if (challenge) {
      if (!r.clock.started || !r.clock.running) throw verifiedError('أغلق بطاقة الكلمة ثم أكمل التحدي.', 409);
      if (r.wheel.time && r.clock.left <= 0) { r.closed = true; event.expired = true; }
      index = r.questions.findIndex(q => q.expected === body.value);
      if (!event.expired && index < 0) { event.message = 'ليست في قائمة هذه العجلة. جرّب كلمة أخرى.'; }
    }
    if (!event.expired && index >= 0) {
      if (!Number.isInteger(index) || !r.questions[index]) throw verifiedError('سؤال غير موجود.');
      const q = r.questions[index], a = r.answers[index];
      if (a.done) throw verifiedError('سبق تسجيل هذا السؤال.', 409);
      if (!['word_image_match', 'word_wheel'].includes(r.game) && index !== r.answers.findIndex(x => !x.done)) throw verifiedError('أكمل السؤال الحالي أولًا.', 409);
      if (r.game === 'word_wheel' && !challenge && index !== r.answers.findIndex(x => !x.done)) throw verifiedError('أكمل الكلمة الحالية أولًا.', 409);
      let right;
      if (r.game === 'word_wheel' && !challenge) {
        const verdict = verifyWheelTrace(q.expected, r.wheel, body.trace); right = verdict.right; a.wrong = verdict.wrong; a.hints = verdict.hints; a.status = verdict.status; a.done = true;
      } else {
        if (r.game === 'word_smash') { if (!Array.isArray(body.value) || body.value.some(x => typeof x !== 'string')) throw verifiedError('اختر إجابة معروضة.'); right = equal(body.value, q.expected); }
        else { if (typeof body.value !== 'string' || body.value.length > 200) throw verifiedError('اختر إجابة معروضة.');
          right = r.game === 'letter_catcher' ? strip(body.value) === strip(q.expected) : body.value === q.expected; }
        if (r.game === 'word_image_match' && !r.questions.some(x => x.id === body.value)) throw verifiedError('اختر صورة من الجولة.');
        if (!right) a.wrong++;
        if (right || r.game === 'word_smash' || (r.game === 'letter_catcher' && a.wrong >= 2)) a.done = true;
        a.status = right ? 'solved' : a.done ? 'revealed' : 'play';
      }
      a.right = !!right;
      event.index = index; event.right = !!right; event.done = a.done; event.status = a.status;
      if (right && (r.game !== 'letter_catcher' || a.wrong === 0)) event.reward = r.points;
      if (challenge && right && r.wheel.settings.show_card) r.clock.running = false;
      if (r.answers.every(x => x.done)) r.closed = true;
    } else if (!challenge) throw verifiedError('سؤال غير موجود.');
  } else throw verifiedError('طلب غير صالح.');
  r.events.push(event); r.revision++; if (r.closed) { r.completedAt ||= new Date(now).toISOString(); if (r.clock) r.clock.running = false; }
  return { round: r, event, repeated: false };
}
export const trainingStars = r => r.game === 'word_wheel' ? starsFor(trainingSummary(r).solved, r.questions.length, r.wheel.settings) : 0;
