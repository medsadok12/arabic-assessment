'use client';
import { useEffect, useRef, useState } from 'react';
import { childFetch, getActiveChildTab } from './child-fetch';
import { applyTrainingEvent, trainingSummary, trainingStars } from './verified-training';

export default function useVerifiedTraining(game, { onStart, onPoints, onIdentityChange } = {}) {
  const handlers = useRef({}); handlers.current = { onStart, onPoints, onIdentityChange };
  const session = useRef(null), request = useRef(null), locked = useRef(false), ticket = useRef(0), scope = useRef(null);
  const [busy, setBusy] = useState(false), [note, setNote] = useState(''), [pending, setPending] = useState(false), [saved, setSaved] = useState(null);
  const [summary,setSummary]=useState(null);
  const storageKey = () => `verified:${game}:${getActiveChildTab() || 'active'}`;
  const remember = id => { try { if (id) sessionStorage.setItem(storageKey(), id); else sessionStorage.removeItem(storageKey()); } catch {} setSaved(id); };
  useEffect(() => {
    scope.current = getActiveChildTab();
    try { setSaved(sessionStorage.getItem(storageKey())); } catch {}
    const check = () => {
      if (scope.current === getActiveChildTab()) return;
      scope.current = getActiveChildTab(); ticket.current++; session.current = null; request.current = null; locked.current = false;
      setBusy(false); setPending(false);setSummary(null); setNote('تغيّر الطفل المختار. ابدأ جولة جديدة لهذا الطفل.');
      try { setSaved(sessionStorage.getItem(storageKey())); } catch { setSaved(null); }
      handlers.current.onIdentityChange?.();
    };
    window.addEventListener('focus', check); document.addEventListener('visibilitychange', check);
    return () => { ticket.current++; session.current=null;request.current=null;locked.current=false;window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [game]);
  const run = async (body, callback) => {
    if (locked.current) return null;
    locked.current = true; setBusy(true); setPending(false); setNote('نؤكّد الحفظ…');
    const t = ++ticket.current, child = getActiveChildTab(); request.current = { body, callback };
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      let j;
      if (session.current?.preview && !['start', 'resume'].includes(body.action)) {
        const r = applyTrainingEvent(session.current, body); session.current = r.round;
        j = { right: r.event.right, questionDone: r.event.done, outcome: r.event.status, expired: r.event.expired, message: r.event.message,
          summary: trainingSummary(r.round), answers: r.round.answers, clock: r.round.clock, stars: trainingStars(r.round), preview: true, awarded: 0 };
      } else {
        const response = await childFetch('/api/games/verified', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal, cache: 'no-store' });
        j = await response.json(); if (!response.ok) throw Object.assign(new Error(j.error), { status: response.status });
      }
      if (t !== ticket.current || child !== getActiveChildTab()) return null;
      if(j.summary)setSummary(j.summary);
      const retryable = j.reward === 'pending' || j.result === 'pending' || j.bonus === 'pending' || ['reward', 'result', 'bonus'].some(k => j.confirmation?.[k] === 'pending');
      if (body.action === 'start' || body.action === 'resume') {
        session.current = j.snapshot; if (!j.preview) remember(j.summary.complete && !retryable ? null : j.roundId);
      }
      if (j.summary?.complete && !j.preview && !retryable) remember(null);
      if (retryable) { setPending(true); setNote('حُفظت الإجابة؛ نحتاج تأكيد مزامنة المكافأة أو التقرير. أعد التأكيد.'); return null; }
      const review = ['reward', 'result', 'bonus'].some(k => ['working', 'review'].includes(j[k]));
      setNote(session.current?.demo ? 'تدريب تجريبي: بلا نقاط أو نتائج رسمية.' : j.preview || session.current?.preview ? 'معاينة المعلم: بلا نقاط أو نتائج طلاب.' : review ? 'حُفظت إجابتك. بعض المكافآت تنتظر تأكيدًا دون احتسابها مرتين.' : body.action==='start'?'جولتك جاهزة. لنبدأ!':body.action==='resume'?'استعدنا جولتك المحفوظة.':j.summary?.complete?'حُفظت نتيجة الجولة بعد التحقق.':body.action==='answer'?'حُفظت الإجابة بعد التحقق منها.':'جولتك محفوظة.');
      request.current = null; setPending(false);
      const pts = j.points ?? j.confirmation?.points; if (Number.isFinite(pts)) handlers.current.onPoints?.(pts);
      callback?.(j); return j;
    } catch (e) {
      if (t === ticket.current && child === getActiveChildTab()) { if(body.action==='start'&&e.status===409){request.current=null;setPending(false);}else setPending(true); setNote(e.name === 'AbortError' ? 'لم يصل تأكيد الحفظ. أعد المحاولة؛ لن نحتسب الإجابة مرتين.' : e.message || 'تعذّر تأكيد الحفظ. أعد المحاولة.'); }
      return null;
    } finally { clearTimeout(timer); if (t === ticket.current) { locked.current = false; setBusy(false); } }
  };
  const event = (body, callback) => {
    if (!session.current || scope.current !== getActiveChildTab() || locked.current || pending) return Promise.resolve(null);
    return run({ ...body, game, roundId: session.current.id, eventId: crypto.randomUUID() }, callback);
  };
  return { game,summary,busy, pending, note, saved, ready: !!session.current, preview: !!session.current?.preview, snapshot: session.current,
    canAct: () => !!session.current && !locked.current && !pending && scope.current === getActiveChildTab(),
    start: (ids, category, filters = {}, extra = {}) => {
      if (locked.current || pending) return Promise.resolve(null);
      return run({ action: 'start', game, roundId: crypto.randomUUID(), ids, category, filters, ...extra }, j => handlers.current.onStart?.(j));
    },
    event, answer: (index, value, callback, extra = {}) => event({ action: 'answer', index, value, ...extra }, callback),
    demo: (items,category='عام') => {
      const r={id:crypto.randomUUID(),game,category,preview:true,demo:true,items,questions:items.map(x=>({id:String(x.id),expected:game==='letter_catcher'?x.missing_letter:x.correct_option})),answers:items.map(()=>({done:false,right:false,wrong:0,hints:0,status:'play'})),events:[],closed:false,revision:0,points:0};
      session.current=r;setNote('تدريب تجريبي: بلا نقاط أو نتائج رسمية.');handlers.current.onStart?.({items,category,preview:true,summary:trainingSummary(r),answers:r.answers,snapshot:r});
    },
    retry: () => request.current ? run(request.current.body, request.current.callback) : null,
    resume: () => saved ? run({ action: 'resume', game, roundId: saved }, j => handlers.current.onStart?.(j)) : null,
    hasSaved: () => { try { return !!sessionStorage.getItem(storageKey()); } catch { return false; } },
    forget: () => remember(null),
    reset: () => { if (locked.current) return; ticket.current++; session.current = null; request.current = null; setPending(false);setSummary(null); setNote(''); },
  };
}
