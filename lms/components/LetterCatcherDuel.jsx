'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { childFetch, getActiveChildTab } from '../lib/child-fetch';
import { displayNumber } from '../lib/display-number';
import { playLetterCatcherWord } from '../lib/letter-catcher-audio';
import { playAnimalFahimCelebration } from '../lib/letter-catcher-animal-celebration';
import { withSeparatedDammatan } from '../lib/letter-catcher-word-frame';
import GameScene from './GameScene';
import LetterCatcherWordFrame from './LetterCatcherWordFrame';
import LetterCatcherFahimOverlay from './LetterCatcherFahimOverlay';
import LetterCatcherDuelScores, { LetterCatcherDuelResultPlayers } from './LetterCatcherDuelScores';
import LetterCatcherPlayerAvatar from './LetterCatcherPlayerAvatar';
import styles from './LetterCatcherDuel.module.css';

const ENDPOINT = '/api/games/letter-catcher/duel';
const STORAGE_PREFIX = 'lc_duel_room_v1:';
const codeDigits = value => displayNumber(value).replace(/\D/g, '').slice(0, 6);
const storageKey = child => `${STORAGE_PREFIX}${child || 'current'}`;
const duelSettings = value => value?.duel || value || {};
const isAbort = error => error?.name === 'AbortError' || error?.ignored;
const eventId = () => globalThis.crypto?.randomUUID?.() || `duel-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function Speaker() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>;
}

function DuelJoinForm({ code, onCodeChange, onSubmit, disabled, pending, message }) {
  return <form onSubmit={onSubmit} data-lc-duel-join-form="">
    <label htmlFor="lc-duel-code" className={styles.joinLabel}>معك رمز صديقك؟</label>
    <div className={styles.joinForm}>
      <input id="lc-duel-code" className={styles.joinInput} value={code} onChange={event => onCodeChange(codeDigits(event.target.value))} inputMode="numeric" pattern="[0-9]{6}" autoComplete="off" maxLength={6} placeholder="000000" aria-label="رمز صديقك، ستة أرقام" aria-invalid={message ? true : undefined} aria-describedby={message ? 'lc-duel-join-message' : undefined} disabled={disabled} data-lc-duel-join-code="" />
      <button type="submit" className={styles.secondary} disabled={code.length !== 6 || disabled} data-lc-duel-join-submit="">{pending ? 'لحظة…' : 'انضم'}</button>
    </div>
    <p id="lc-duel-join-message" className={styles.joinMessage} role="status" aria-live="polite" data-lc-duel-join-message="">{message}</p>
  </form>;
}

function AnimalPicture({ question, review }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [question?.image_url, question?.id]);
  return <div className={styles.picture} data-lc-duel-picture="">
    {question?.image_url && !failed
      ? <img src={question.image_url} alt={review?.word || 'صورة حيوان'} onError={() => setFailed(true)} draggable="false" />
      : <span className={styles.pictureFallback} role="img" aria-label="صورة حيوان">{question?.emoji || '🦁'}</span>}
  </div>;
}

export default function LetterCatcherDuel({ settings = {}, currentPlayer, onExit }) {
  const [room, setRoom] = useState(null);
  const [pending, setPending] = useState(null);
  const [connection, setConnection] = useState('online');
  const [notice, setNotice] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [lastCode, setLastCode] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [identityChanged, setIdentityChanged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [uncertainAnswer, setUncertainAnswer] = useState(false);
  const [claim, setClaim] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [reviewReady, setReviewReady] = useState(false);
  const [cheer, setCheer] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [compact, setCompact] = useState(true);
  const roomRef = useRef(null);
  const activeRef = useRef(true);
  const scopeRef = useRef(getActiveChildTab());
  const changedRef = useRef(false);
  const exitingRef = useRef(false);
  const pendingRef = useRef(null);
  const refreshPending = useRef(false);
  const controllers = useRef(new Set());
  const clockOffset = useRef(0);
  const pendingAnswer = useRef(null);
  const refreshRef = useRef(null);
  const claimAttempted = useRef(new Set());
  const copyTimer = useRef(null);
  const wordCancel = useRef(null);
  const mascotCancel = useRef(null);
  const reviewTimers = useRef(new Set());
  const mediaRef = useRef(null);
  const reviewRun = useRef(0);
  const reviewCompletion = useRef(null);
  const mascotStartTimer = useRef(null);

  const abortRequests = useCallback(() => {
    controllers.current.forEach(controller => controller.abort());
    controllers.current.clear();
  }, []);

  const stopMedia = useCallback(() => {
    reviewRun.current += 1;
    wordCancel.current?.(); wordCancel.current = null;
    mascotCancel.current?.(); mascotCancel.current = null;
    reviewTimers.current.forEach(clearTimeout); reviewTimers.current.clear();
    reviewCompletion.current = null; mascotStartTimer.current = null;
    try { mediaRef.current?.pause(); } catch {}
  }, []);

  const checkIdentity = useCallback(() => {
    if (!activeRef.current || changedRef.current) return false;
    if (getActiveChildTab() === scopeRef.current) return true;
    changedRef.current = true;
    abortRequests(); stopMedia();
    roomRef.current = null;
    pendingAnswer.current = null;
    setRoom(null); setIdentityChanged(true); setNotice(null); setPending(null); setCheer(null);
    return false;
  }, [abortRequests, stopMedia]);

  const applyRoom = useCallback((next, started, received, { replace = false, requestedCode } = {}) => {
    if (!next || exitingRef.current || !checkIdentity()) return false;
    const current = roomRef.current;
    if (!replace && requestedCode && current?.code && current.code !== requestedCode) return false;
    if (current?.code === next.code) {
      if (Number.isFinite(Number(next.revision)) && Number.isFinite(Number(current.revision)) && Number(next.revision) < Number(current.revision)) return false;
      if (next.revision == null && Number(next.serverNow) < Number(current.serverNow)) return false;
    }
    if (Number.isFinite(Number(next.serverNow))) {
      clockOffset.current = Number(next.serverNow) - (started + received) / 2;
      setNow(Date.now() + clockOffset.current);
    }
    roomRef.current = next;
    setRoom(next); setConnection('online');
    setNotice(previous => previous?.kind === 'network' ? null : previous);
    if (next.code) {
      const safeCode = codeDigits(next.code);
      setLastCode(safeCode);
      try { sessionStorage.setItem(storageKey(scopeRef.current), safeCode); } catch {}
    }
    const attempt = pendingAnswer.current;
    const own = next.ownAnswer;
    if (attempt && (attempt.questionIndex !== next.questionIndex || own?.tried?.includes(attempt.letter) || own?.letter === attempt.letter || ['review', 'finished', 'cancelled'].includes(next.status))) {
      pendingAnswer.current = null; setUncertainAnswer(false);
      setNotice(previous => previous?.kind === 'answer' ? null : previous);
    }
    return true;
  }, [checkIdentity]);

  const request = useCallback(async (body, { replace = false, timeout = 8000 } = {}) => {
    if (!checkIdentity()) throw Object.assign(new Error(), { ignored: true });
    const scope = scopeRef.current;
    const controller = new AbortController();
    controllers.current.add(controller);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    const started = Date.now();
    const requestedCode = body?.code || null;
    try {
      const response = await childFetch(body?.action ? ENDPOINT : `${ENDPOINT}?code=${encodeURIComponent(requestedCode || '')}`, {
        ...(body?.action ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
        cache: 'no-store', signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!activeRef.current || scope !== getActiveChildTab() || !checkIdentity()) throw Object.assign(new Error(), { ignored: true });
      if (!replace && requestedCode && roomRef.current?.code && requestedCode !== roomRef.current.code) throw Object.assign(new Error(), { ignored: true });
      if (!response.ok) throw Object.assign(new Error(data.error || 'تعذّر الاتصال. حاول مرة أخرى.'), { status: response.status });
      if (!data.room) throw new Error('لم تصل الجولة كاملة. أعد المحاولة.');
      applyRoom(data.room, started, Date.now(), { replace, requestedCode });
      return data;
    } catch (error) {
      if (!replace && requestedCode && roomRef.current?.code && requestedCode !== roomRef.current.code) throw Object.assign(new Error(), { ignored: true });
      if (timedOut && activeRef.current) throw new Error('الاتصال بطيء قليلًا. أعد المحاولة.');
      throw error;
    } finally {
      clearTimeout(timer); controllers.current.delete(controller);
    }
  }, [applyRoom, checkIdentity]);

  const showError = useCallback((error, kind = 'action') => {
    if (!activeRef.current || exitingRef.current || !checkIdentity() || isAbort(error)) return;
    const network = kind === 'network' || !error.status || error.status >= 500;
    if (network) setConnection('offline');
    setNotice({ message: error.message || 'تعذّر الاتصال. حاول مرة أخرى.', kind: network ? 'network' : kind });
  }, [checkIdentity]);

  const sendAction = useCallback(async (action, extra = {}, { onError } = {}) => {
    if (pendingRef.current || !checkIdentity()) return null;
    pendingRef.current = action; setPending(action); setNotice(null);
    try {
      const data = await request({ action, ...(roomRef.current?.code ? { code: roomRef.current.code } : {}), ...extra }, { replace: action === 'create' || action === 'join' });
      return data;
    } catch (error) {
      if (onError) {
        if (activeRef.current && !exitingRef.current && checkIdentity() && !isAbort(error)) onError(error);
      } else showError(error);
      return null;
    }
    finally {
      if (pendingRef.current === action) {
        pendingRef.current = null;
        if (activeRef.current && !changedRef.current) setPending(null);
      }
    }
  }, [checkIdentity, request, showError]);

  const refresh = useCallback(async () => {
    const code = roomRef.current?.code;
    if (!code || pendingRef.current || refreshPending.current || !checkIdentity()) return;
    refreshPending.current = true;
    try { await request({ code }, { timeout: 6500 }); }
    catch (error) { if (roomRef.current?.code === code) showError(error, 'network'); }
    finally { refreshPending.current = false; }
  }, [checkIdentity, request, showError]);
  refreshRef.current = refresh;

  useEffect(() => {
    activeRef.current = true;
    const saved = (() => { try { return codeDigits(sessionStorage.getItem(storageKey(scopeRef.current)) || ''); } catch { return ''; } })();
    if (saved.length === 6) {
      setLastCode(saved); setRestoring(true);
      request({ code: saved }, { replace: true }).catch(error => {
        if ([403, 404].includes(error.status)) {
          try { sessionStorage.removeItem(storageKey(scopeRef.current)); } catch {}
          if (activeRef.current) setLastCode('');
        }
        showError(error);
      }).finally(() => { if (activeRef.current) setRestoring(false); });
    }
    const updateClock = window.setInterval(() => {
      if (checkIdentity()) setNow(Date.now() + clockOffset.current);
    }, 100);
    const focused = () => { if (checkIdentity()) void refreshRef.current?.(); };
    const visible = () => { if (document.visibilityState === 'visible') focused(); };
    const storage = event => { if (!event.key || event.key === 'aa_active_child') focused(); };
    window.addEventListener('focus', focused);
    window.addEventListener('storage', storage);
    window.addEventListener('active-child-changed', focused);
    window.addEventListener('aa:active-child-changed', focused);
    document.addEventListener('visibilitychange', visible);
    return () => {
      activeRef.current = false; abortRequests(); stopMedia();
      clearInterval(updateClock); clearTimeout(copyTimer.current);
      window.removeEventListener('focus', focused);
      window.removeEventListener('storage', storage);
      window.removeEventListener('active-child-changed', focused);
      window.removeEventListener('aa:active-child-changed', focused);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [abortRequests, checkIdentity, request, showError, stopMedia]);

  useEffect(() => {
    const query = window.matchMedia?.('(max-height: 920px)');
    if (!query) return undefined;
    const update = () => setCompact(query.matches);
    update(); query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const roomCode = room?.code || '';
  useEffect(() => setJoinMessage(''), [roomCode, room?.players?.length]);
  const terminal = room?.status === 'finished' || room?.status === 'cancelled';
  useEffect(() => {
    if (!roomCode || terminal || identityChanged) return undefined;
    let cancelled = false, timer = null;
    const poll = async () => {
      if (cancelled || !activeRef.current) return;
      await refreshRef.current?.();
      if (!cancelled) timer = setTimeout(poll, 1000);
    };
    timer = setTimeout(poll, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [roomCode, terminal, identityChanged]);

  const config = { ...duelSettings(settings), ...duelSettings(room?.settings) };
  const soundEnabled = config.soundEnabled !== false;
  const motionEnabled = config.motionEnabled !== false;
  const mascotEnabled = config.encouragementEnabled !== false;
  const question = room?.currentQuestion;
  const review = question?.review;
  const reviewKey = review ? `${room?.id || roomCode}:${room?.questionIndex}` : '';
  useEffect(() => setShowResults(false), [roomCode, question?.id]);

  useEffect(() => {
    stopMedia(); setCheer(null); setReviewReady(false);
    if (!reviewKey || !checkIdentity()) return undefined;
    const run = reviewRun.current;
    const began = Date.now();
    const later = (fn, delay) => {
      const timer = setTimeout(() => { reviewTimers.current.delete(timer); if (activeRef.current && run === reviewRun.current && checkIdentity()) fn(); }, delay);
      reviewTimers.current.add(timer); return timer;
    };
    let wordEnded = false;
    const afterWord = () => {
      if (wordEnded || !activeRef.current || run !== reviewRun.current) return;
      wordEnded = true;
      later(() => setReviewReady(true), Math.max(0, 1350 - (Date.now() - began)));
      if (!mascotEnabled) return;
      mascotStartTimer.current = later(() => {
        mascotStartTimer.current = null;
        mascotCancel.current = playAnimalFahimCelebration(soundEnabled ? mediaRef.current : null, {
          isCurrent: () => activeRef.current && run === reviewRun.current && getActiveChildTab() === scopeRef.current,
          onReady: () => setCheer('in'), onFade: () => setCheer('out'), onFinish: () => setCheer(null),
        });
      }, 180);
    };
    reviewCompletion.current = afterWord;
    const currentReview = roomRef.current?.currentQuestion?.review;
    if (soundEnabled && currentReview?.word) {
      wordCancel.current = playLetterCatcherWord({ text: currentReview.word, url: currentReview.audio_url, onEnd: afterWord });
    } else afterWord();
    return stopMedia;
  }, [reviewKey, soundEnabled, mascotEnabled, checkIdentity, stopMedia]);

  const claimResult = useCallback(async () => {
    if (!checkIdentity() || pendingRef.current || roomRef.current?.status !== 'finished') return;
    setClaimError(''); pendingRef.current = 'result'; setPending('result');
    try {
      const result = await request({ action: 'result', code: roomRef.current.code });
      setClaim(result.award ? { ...result.award, amount: result.awarded ?? result.award.amount } : { state: 'pending', amount: 0 });
    } catch (error) {
      if (!isAbort(error) && activeRef.current && checkIdentity()) setClaimError('أعد تأكيد نجومك؛ لن تُضاف مرتين.');
    } finally {
      if (pendingRef.current === 'result') {
        pendingRef.current = null;
        if (activeRef.current && !changedRef.current) setPending(null);
      }
    }
  }, [checkIdentity, request]);

  useEffect(() => {
    if (room?.status !== 'finished' || !roomCode || pending || claimAttempted.current.has(roomCode)) return;
    claimAttempted.current.add(roomCode); void claimResult();
  }, [room?.status, roomCode, pending, claimResult]);

  const newRoom = async () => {
    if (pendingRef.current || !checkIdentity()) return;
    abortRequests(); stopMedia(); pendingAnswer.current = null;
    roomRef.current = null; setRoom(null); setUncertainAnswer(false); setClaim(null); setClaimError('');
    setJoinCode(''); setJoinMessage('');
    await sendAction('create');
  };

  const join = async event => {
    event?.preventDefault();
    if (joinCode.length !== 6 || pendingRef.current || restoring || !checkIdentity()) return;
    const current = roomRef.current;
    if (current && (current.status !== 'waiting' || current.players?.length !== 1)) {
      setJoinMessage('صديقك انضم إلى تحدّيك. أكملا اللعب معًا، أو عُد إلى اللعبة للمغادرة.');
      return;
    }
    if (current?.code === joinCode) {
      setJoinMessage('هذا رمز تحدّيك. أرسله لصديقك، أو أدخل رمز صديقك هنا.');
      return;
    }
    setJoinMessage('');
    const result = await sendAction('join', { code: joinCode }, { onError: error => {
      setJoinMessage(!error.status || error.status >= 500 ? current ? 'تعذّر الاتصال بتحدّي صديقك. رمزك الحالي محفوظ؛ حاول مرة أخرى.' : 'تعذّر الاتصال بتحدّي صديقك. حاول مرة أخرى.' : error.message || 'لم نصل إلى تحدّي صديقك. تحقّق من الرمز وحاول مرة أخرى.');
      if (!error.status || error.status >= 500) setConnection('offline');
    } });
    if (result && activeRef.current && !exitingRef.current && checkIdentity()) { setJoinCode(''); setJoinMessage(''); }
  };

  const changeJoinCode = code => { setJoinCode(code); setJoinMessage(''); };

  const resume = async () => {
    if (pendingRef.current || !lastCode || !checkIdentity()) return;
    pendingRef.current = 'sync'; setPending('sync'); setNotice(null);
    try { await request({ code: lastCode }, { replace: true }); }
    catch (error) { showError(error); }
    finally { if (pendingRef.current === 'sync') { pendingRef.current = null; if (activeRef.current && !changedRef.current) setPending(null); } }
  };

  const leave = async () => {
    if (pendingRef.current === 'leave') return;
    const code = roomRef.current?.code;
    exitingRef.current = true;
    pendingRef.current = 'leave'; setPending('leave');
    stopMedia(); setCheer(null); abortRequests();
    if (code && checkIdentity()) {
      try { await request({ action: 'leave', code }, { timeout: 3500 }); } catch {}
    }
    abortRequests();
    try { sessionStorage.removeItem(storageKey(scopeRef.current)); } catch {}
    activeRef.current = false;
    onExit?.();
  };

  const copyCode = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(roomCode);
      if (!activeRef.current) return;
      setCopied(true); clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => { if (activeRef.current) setCopied(false); }, 2400);
    } catch { setNotice({ kind: 'copy', message: 'اضغط مطولًا على الرمز لنسخه.' }); }
  };

  const players = Array.isArray(room?.players) ? room.players : [];
  const me = room?.meId ? players.find(player => player.id === room.meId) : players.find(player => player.isSelf);
  const opponent = me ? players.find(player => player.id !== me.id) : undefined;
  const own = room?.ownAnswer || {};
  const countdown = Math.max(0, Math.ceil((Number(room?.countdownUntil || room?.startsAt) - now) / 1000));
  const remaining = room?.status === 'paused' ? Math.ceil(Math.max(0, Number(room.remainingMs) || 0) / 1000) : Math.max(0, Math.ceil((Number(room?.deadlineAt) - now) / 1000));
  const waiting = room?.status === 'waiting';
  const isReview = room?.status === 'review';
  const settled = Boolean(review) && ['review', 'finished'].includes(room?.status);
  const showResultScreen = room?.status === 'finished' && showResults;
  const paused = room?.status === 'paused';
  const locallyOffline = connection === 'offline';
  const cooldown = Number(own.cooldownUntil || 0) > now;
  const activeQuestion = ['playing', 'countdown'].includes(room?.status) && now >= Number(room?.startsAt || 0) && remaining > 0;
  const canAnswer = Boolean(me) && activeQuestion && !own.done && !pending && !cooldown && !uncertainAnswer && !locallyOffline && !identityChanged;
  const title = displayNumber(config.title || 'تحدي صديق');
  const total = room?.totalQuestions || config.questionCount || 10;

  const answer = async (letter, retry = false) => {
    if ((!canAnswer && !retry) || pendingRef.current || !checkIdentity()) return;
    const command = retry ? pendingAnswer.current : { action: 'answer', code: roomCode, questionIndex: room.questionIndex, eventId: eventId(), letter };
    if (!command) return;
    pendingAnswer.current = command;
    pendingRef.current = 'answer'; setPending('answer'); setNotice(null);
    try {
      await request(command);
      pendingAnswer.current = null; setUncertainAnswer(false);
    } catch (error) {
      if (!isAbort(error) && activeRef.current && checkIdentity()) {
        setUncertainAnswer(true);
        showError(error, 'answer');
      }
    } finally {
      if (pendingRef.current === 'answer') {
        pendingRef.current = null;
        if (activeRef.current && !changedRef.current) setPending(null);
      }
    }
  };

  let playStatus = 'انظر إلى الصورة، واختر الحرف الناقص.';
  if (pending === 'answer') playStatus = 'نحفظ اختيارك…';
  else if (own.done && !settled) playStatus = own.right ? 'أحسنت! ننتظر صديقك.' : 'ننتظر صديقك لنسمع الكلمة معًا.';
  else if (cooldown || own.tried?.length && !own.done && !settled) playStatus = 'حاول مرة أخرى، أنت تستطيع!';
  else if (settled) playStatus = own.right ? `أحسنت يا ${me?.name || 'بطل'}!` : 'تعلّمنا كلمة جديدة معًا!';
  if (remaining === 0 && !settled && activeQuestion === false && room?.status === 'playing') playStatus = 'انتهى الوقت، نسمع الكلمة معًا…';
  const tied = players.length === 2 && Number(players[0].score) === Number(players[1].score);
  const ownWon = !tied && Number(me?.score) > Number(opponent?.score);

  return <div className={`${styles.root} game-font`} data-lc-duel="" data-status={room?.status || 'lobby'} data-motion={motionEnabled ? 'on' : 'off'} dir="rtl">
    <GameScene category="الحيوانات" />
    <div className={styles.shell}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={leave} disabled={pending === 'leave'} aria-label="العودة إلى اللعبة" title="العودة إلى اللعبة">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /><path d="M16 12H3" /></svg>
        </button>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.worldBadge} role="img" aria-label="الحيوانات">🦁</span>
      </header>

      {notice && !identityChanged && <div className={styles.banner} role="status" aria-live="polite">
        <p>{displayNumber(notice.message)}</p>
        {uncertainAnswer && pendingAnswer.current ? <button type="button" className={styles.linkButton} disabled={Boolean(pending)} onClick={() => answer(null, true)}>تأكيد الاختيار</button>
          : room && notice.kind !== 'copy' ? <button type="button" className={styles.linkButton} disabled={Boolean(pending)} onClick={() => refresh()}>أعد الاتصال</button> : null}
      </div>}

      {identityChanged ? <div className={styles.lobbyWrap}><section className={styles.lobby}>
        <div className={styles.currentPlayer}><LetterCatcherPlayerAvatar size={64} /></div><h2>تغيّر اللاعب</h2>
        <p className={styles.intro}>لنفتح التحدي من جديد باسم اللاعب الحالي.</p>
        <button type="button" className={styles.primary} onClick={() => onExit?.()}>العودة إلى اللعبة</button>
      </section></div> : !room ? <div className={styles.lobbyWrap}><section className={styles.lobby} aria-busy={restoring || Boolean(pending)}>
        <div className={styles.currentPlayer} data-lc-duel-current-player=""><LetterCatcherPlayerAvatar player={currentPlayer} className={`${styles.currentPlayerAvatar} ${styles.selfAvatar}`} />{currentPlayer?.name && <strong>{displayNumber(currentPlayer.name)}</strong>}</div>
        <h2>نلعب معًا!</h2>
        <p className={styles.intro}>{displayNumber(config.subtitle || 'العب مع صديقك واجمع النجوم')}</p>
        <div className={styles.facts}><span className={styles.fact}>🦁 الحيوانات</span><span className={styles.fact}><bdi>{displayNumber(total)}</bdi> كلمات</span><span className={styles.fact}><bdi>20</bdi> ثانية</span></div>
        <button type="button" className={styles.primary} disabled={Boolean(pending) || restoring} onClick={newRoom}>{pending === 'create' ? 'نجهّز رمزك…' : restoring ? 'نستعيد جولتك…' : 'أنشئ تحديًا لصديقي'}</button>
        <div className={styles.divider}>أو</div>
        <DuelJoinForm code={joinCode} onCodeChange={changeJoinCode} onSubmit={join} disabled={Boolean(pending) || restoring} pending={pending === 'join'} message={joinMessage} />
        {lastCode && !restoring && <div className={styles.saved}><p>رمز جولتك محفوظ: <bdi>{displayNumber(lastCode)}</bdi></p><button type="button" className={styles.linkButton} disabled={Boolean(pending)} onClick={resume}>العودة إلى جولتي</button></div>}
      </section></div> : waiting ? <div className={styles.lobbyWrap}><section className={styles.lobby}>
        <h2>{opponent ? 'صديقك هنا!' : 'ادعُ صديقك'}</h2>
        <p className={styles.codeLabel}>رمز تحدّيك</p>
        <bdi className={styles.code} style={{ userSelect: 'all' }} data-lc-duel-room-code="">{displayNumber(roomCode)}</bdi>
        <button type="button" className={styles.copy} onClick={copyCode}>{copied ? 'تم نسخ الرمز ✓' : 'انسخ الرمز'}</button>
        {players.length === 1 && <div className={styles.waitingJoin}><div className={styles.divider}>أو</div><DuelJoinForm code={joinCode} onCodeChange={changeJoinCode} onSubmit={join} disabled={Boolean(pending)} pending={pending === 'join'} message={joinMessage} /></div>}
        <div className={styles.lobbyPlayers}>
          <div className={styles.lobbyPlayer}><LetterCatcherPlayerAvatar player={me} className={`${styles.lobbyAvatar} ${styles.selfAvatar}`} /><strong>{displayNumber(me?.name || 'أنت')}</strong><small className={me?.ready ? styles.readyTag : ''}>{me?.ready ? 'أنت جاهز ✓' : 'أنت'}</small></div>
          <div className={`${styles.lobbyPlayer} ${styles.otherLobby}`}><LetterCatcherPlayerAvatar player={opponent} className={`${styles.lobbyAvatar} ${styles.otherAvatar}`} /><strong>{displayNumber(opponent?.name || 'صديقك')}</strong><small className={opponent?.ready ? styles.readyTag : ''}>{opponent?.ready ? 'جاهز ✓' : opponent ? 'انضم إليك' : 'ننتظر انضمامه'}</small></div>
        </div>
        <p className={styles.lobbyNote} role="status">{!opponent ? 'أعطِ الرمز لصديقك ليفتحه على شاشته.' : me?.ready ? `ننتظر ${opponent.name} ليكون جاهزًا.` : 'عندما تكونان جاهزين، نبدأ معًا!'}</p>
        <button type="button" className={styles.primary} disabled={!opponent || me?.ready || Boolean(pending) || locallyOffline} onClick={() => sendAction('ready', { questionIndex: -1 })}>{pending === 'ready' ? 'لحظة…' : me?.ready ? 'أنا جاهز ✓' : 'أنا جاهز!'}</button>
        {locallyOffline && <button type="button" className={styles.linkButton} disabled={Boolean(pending)} onClick={refresh}>أعد الاتصال</button>}
      </section></div> : room.status === 'cancelled' ? <div className={styles.lobbyWrap}><section className={styles.lobby}>
        <div className={styles.lobbyIcon} aria-hidden="true">🤝</div><h2>نكمل اللعب لاحقًا</h2>
        <p className={styles.intro}>{room.cancelReason === 'reconnect_expired' ? 'لم يعد الاتصال بعد. نلتقي في تحدٍّ جديد.' : ['waiting_expired', 'match_expired'].includes(room.cancelReason) ? 'انتهى وقت هذه الجولة. لنبدأ تحديًا جديدًا!' : 'غادر صديقك التحدي. يمكنك بدء تحدٍّ جديد.'}</p>
        <button type="button" className={styles.primary} disabled={Boolean(pending)} onClick={newRoom}>تحدٍّ جديد</button>
        <button type="button" className={styles.linkButton} onClick={leave}>العودة إلى اللعبة</button>
      </section></div> : <>
        {!showResultScreen && <LetterCatcherDuelScores me={me} opponent={opponent} award={room.roundAwards?.[me?.id] ?? own.award ?? 0} awardKey={reviewKey} settled={settled} motionEnabled={motionEnabled && pending !== 'leave'} />}
        {!showResultScreen && <div className={styles.roundBar}><span>الكلمة <bdi>{displayNumber((room.questionIndex || 0) + 1)}</bdi> من <bdi>{displayNumber(total)}</bdi></span><span className={`${styles.clock} ${remaining <= 5 && activeQuestion ? styles.urgent : ''}`} aria-label={settled ? 'اكتملت إجابتكما' : `الوقت المتبقي ${displayNumber(Number.isFinite(remaining) ? remaining : 20)} ثانية`}><bdi>{settled ? '✓' : displayNumber(Number.isFinite(remaining) ? remaining : 20)}</bdi><span aria-hidden="true">⏱</span></span></div>}
        <main className={styles.playArea}>
          {showResultScreen ? <section className={styles.result}>
            <h2>{tied ? 'نجومكما متساوية!' : ownWon ? `أحسنت يا ${me?.name || 'بطل'}!` : 'أحسنتما اللعب معًا!'}</h2>
            <LetterCatcherDuelResultPlayers me={me} opponent={opponent} />
            <p>{tied ? 'تعلّمنا وربحنا معًا.' : ownWon ? 'جمعت نجومًا رائعة مع صديقك.' : `${opponent?.name || 'صديقك'} جمع نجومًا أكثر هذه المرة. نلعب من جديد!`}</p>
            <div className={styles.awardNote} role="status" aria-live="polite">{claim?.state === 'done' ? claim.preview ? 'اكتملت جولة المعاينة.' : `أُضيفت ${displayNumber(claim.amount || 0)} نجمة إلى رصيدك ⭐` : pending === 'result' ? 'نحفظ نجومك…' : claimError || 'حُفظت النتيجة؛ نؤكّد نجومك.'}</div>
            {claim?.state !== 'done' && pending !== 'result' && <button type="button" className={styles.secondary} disabled={Boolean(pending)} onClick={claimResult}>تأكيد نجومي</button>}
            <button type="button" className={styles.primary} disabled={Boolean(pending)} onClick={newRoom}>تحدٍّ جديد</button>
            <button type="button" className={styles.linkButton} disabled={Boolean(pending)} onClick={leave}>العودة إلى اللعبة</button>
          </section> : <section className={styles.gameCard} aria-label="سؤال الحرف الناقص">
            <div className={styles.questionHeading}><h2>ما الحرف الناقص؟</h2></div>
            <AnimalPicture question={question} review={review} />
            <div className={styles.wordControls}>
              <button type="button" className={styles.listen} onClick={() => {
                if (!review || !soundEnabled || !checkIdentity()) return;
                mascotCancel.current?.(); mascotCancel.current = null; setCheer(null);
                if (mascotStartTimer.current) { clearTimeout(mascotStartTimer.current); reviewTimers.current.delete(mascotStartTimer.current); mascotStartTimer.current = null; }
                wordCancel.current?.();
                wordCancel.current = playLetterCatcherWord({ text: review.word, url: review.audio_url, onEnd: reviewCompletion.current });
              }} disabled={!review || !soundEnabled || locallyOffline || paused} aria-label="اسمع الكلمة" title={review ? 'اسمع الكلمة' : 'نسمع الكلمة بعد إجابتكما'}><Speaker /></button>
              <div className={styles.word}>
                {review ? <LetterCatcherWordFrame word={{ category: 'الحيوانات', word: review.word, missing_letter: review.correctLetter }} revealed compact={compact} /> : <LetterCatcherWordFrame word={{ category: 'الحيوانات' }} preparedFrame={question?.frame} retryKey={motionEnabled ? own.tried?.length || 0 : 0} compact={compact} />}
              </div>
              <span aria-hidden="true" />
            </div>
            <div className={styles.choices} data-locked={!canAnswer}>
              {(question?.options || []).slice(0, 3).map((option, index) => {
                const letter = typeof option === 'string' ? option : option.letter || option.label || option.value;
                const wrong = own.tried?.includes(letter) && !(own.right && own.letter === letter);
                const right = own.right === true && own.letter === letter || settled && review?.correctLetter === letter;
                const isPending = pending === 'answer' && pendingAnswer.current?.letter === letter;
                return <button type="button" key={`${index}:${letter}`} className={`${styles.choice} ${right ? styles.correct : wrong ? styles.wrong : ''} ${isPending ? styles.pendingChoice : ''}`} disabled={!canAnswer || Boolean(wrong)} onClick={() => answer(letter)} aria-label={`الحرف ${letter}`} data-letter={letter}>
                  {withSeparatedDammatan(letter || '')}{(right || wrong) && <span className={styles.choiceMark} aria-hidden="true">{right ? '✓' : '×'}</span>}
                </button>;
              })}
            </div>
            {countdown > 0 && room.status === 'countdown' && <div className={styles.countdown} role="status" aria-live="assertive"><span>نبدأ معًا!</span><strong key={countdown}><bdi>{displayNumber(countdown)}</bdi></strong></div>}
            {(paused || locallyOffline) && <div className={styles.overlay} role="status" aria-live="polite"><div className={styles.overlayIcon} aria-hidden="true">🤝</div><h2>نعود للّعب معًا</h2><p>{locallyOffline ? 'تعذّر الاتصال قليلًا. رمزك محفوظ.' : opponent?.connected === false ? 'ننتظر اتصال صديقك، ثم نكمل معًا.' : 'نتأكد من اتصالكما، ثم نكمل معًا.'}</p><p>رمز التحدي: <bdi>{displayNumber(roomCode)}</bdi></p><button type="button" className={styles.secondary} disabled={Boolean(pending)} onClick={refresh}>أعد الاتصال</button></div>}
          </section>}
          {mascotEnabled && <div className={styles.fahimAnchor}>
            {motionEnabled ? <LetterCatcherFahimOverlay cheer={cheer} mediaRef={mediaRef} wordKey={reviewKey} /> : <>
              {cheer && <div className={styles.stillFahim} role="img" aria-label="فهيم يشجّعك"><img src="/media/fahim-cheer-frames.webp" alt="" /></div>}
              <audio ref={mediaRef} src="/media/fahim-cheer.mp3" preload="auto" aria-hidden="true" />
            </>}
          </div>}
        </main>
        {!showResultScreen && <>
          <p className={styles.status} data-tone={own.right ? 'success' : ''} role="status" aria-live="polite">{displayNumber(playStatus)}</p>
          <div className={styles.nextArea}>{settled ? <button type="button" className={styles.primary} disabled={Boolean(pending) || !reviewReady || isReview && me?.ready || locallyOffline} onClick={() => room.status === 'finished' ? setShowResults(true) : sendAction('next', { questionIndex: room.questionIndex })}>{pending === 'next' ? 'لحظة…' : room.status === 'finished' ? 'شاهد نجومنا!' : me?.ready ? 'جاهز ✓ ننتظر صديقي' : 'أنا جاهز للكلمة التالية'}</button> : <div className={styles.waitNext}>{own.done ? 'ننتقل عندما تكونان جاهزين.' : 'لكلٍّ منكما شاشته ونجومه ⭐'}</div>}</div>
        </>}
      </>}
    </div>
  </div>;
}
