'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase';
import { getRole } from '../../../../lib/auth-role';
import { childFetch } from '../../../../lib/child-fetch';
import {
  WW_MODES, MODE_INFO, CHALLENGE_LEVELS, starsFor, cardFor, resolveTheme,
  WW_PROGRESS_KEY, WW_LEGACY_PROGRESS_KEY, progressKey, legacyProgressKey,
} from '../../../../lib/word-wheel';
import WordRound from './_word-round';
import ChallengeRound from './_challenge-round';
import { WW_CSS, themeVars, useWordVoice, Stars, WordVisual, WordCard, Confetti } from './_ui';

/* ════════════════════════════════════════════════════════════════
   «عجلة الكلمات» — ثلاثة أنماط لكل الأعمار، ومحتوى يديره المعلم بالكامل
   من /library/games/word-wheel/settings (العجلات، بطاقات الكلمات، الألوان،
   المساعدة والمكافآت). البيانات تُجلب حيّة وتتجدّد عند العودة للتبويب
   خارج اللعب (القسم 9.5). نجوم كل عجلة محفوظة في المتصفح.
════════════════════════════════════════════════════════════════ */

const STAFF = ['teacher', 'admin', 'super_admin'];

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
}

export default function WordWheelGame() {
  const [data, setData]         = useState(null);
  const [failed, setFailed]     = useState(false);
  const [view, setView]         = useState({ name: 'lobby' }); // lobby | mode | play | results
  const [progress, setProgress] = useState({});
  const [legacy, setLegacy]     = useState({});
  const [role, setRole]         = useState(null);
  const [points, setPoints]     = useState(null);
  const [replay, setReplay]     = useState(null);
  const voice = useWordVoice();

  const load = useCallback(() => {
    fetch(`/api/word-wheel?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (Array.isArray(j.wheels)) { setData(j); setFailed(false); } else setFailed(true); })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    setProgress(readJson(WW_PROGRESS_KEY));
    setLegacy(readJson(WW_LEGACY_PROGRESS_KEY));
    createClient().auth.getUser().then(({ data: d }) => setRole(getRole(d?.user) || null)).catch(() => {});
    childFetch('/api/points').then(r => r.json()).then(j => setPoints(j.points ?? 0)).catch(() => {});
  }, [load]);

  // تعديلات المعلم تصل حيّة عند العودة للتبويب — خارج اللعب فقط كي لا تنقطع الجولة
  useEffect(() => {
    const onBack = () => { if (document.visibilityState === 'visible' && (view.name === 'lobby' || view.name === 'mode')) load(); };
    document.addEventListener('visibilitychange', onBack);
    return () => document.removeEventListener('visibilitychange', onBack);
  }, [view.name, load]);

  const wheels = data?.wheels || [];
  const settings = data?.settings || {};
  const lobbyTheme = data?.theme || resolveTheme(null);
  const starsOf = useCallback((w) => {
    const lk = legacyProgressKey(w);
    return Math.max(progress[progressKey(w)] ?? 0, lk ? (legacy[lk] ?? 0) : 0);
  }, [progress, legacy]);

  const cardOf = (word) => data?.cards?.[word] || cardFor(word);

  const award = useCallback(() => {
    childFetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'word_wheel' }) })
      .then(r => r.json()).then(j => { if (j.points != null) setPoints(j.points); }).catch(() => {});
  }, []);

  const finishWheel = useCallback((wheel, result) => {
    const stars = starsFor(result.solved, result.total, wheel.settings);
    setProgress(prev => {
      const k = progressKey(wheel);
      if ((prev[k] ?? 0) >= stars) return prev;
      const next = { ...prev, [k]: stars };
      try { localStorage.setItem(WW_PROGRESS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    if (stars > 0 && settings.win_points > 0) {
      childFetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'word_wheel_win' }) })
        .then(r => r.json()).then(j => { if (j.points != null) setPoints(j.points); }).catch(() => {});
    }
    childFetch('/api/game-results', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: 'word_wheel', category: wheel.name || MODE_INFO[wheel.mode].title, correct: result.solved, wrong: result.total - result.solved, total: result.total }),
    }).catch(() => {});
    setView({ name: 'results', wheel, result, stars });
  }, [settings.win_points]);

  const pageStyle = themeVars(view.wheel?.theme || lobbyTheme);
  const isStaff = STAFF.includes(role);

  let body;
  if (!data) {
    body = (
      <div className="ww-wrap" style={{ alignItems: 'center', paddingTop: 60 }}>
        <div className="ww-hero">
          <span className="ww-hero-icon">🎡</span>
          <h1>عجلة الكلمات</h1>
          <p>{failed ? 'تعذّر تجهيز اللعبة الآن — جرّب مرة أخرى بعد لحظة 🌟' : 'نجهّز العجلات…'}</p>
        </div>
        {failed && <button type="button" className="ww-btn" onClick={load}>🔄 حاول مرة أخرى</button>}
      </div>
    );
  } else if (view.name === 'lobby') {
    body = (
      <div className="ww-wrap">
        <div className="ww-top">
          <Link href="/library" className="ww-back">→ المكتبة</Link>
          <span style={{ flex: 1 }} />
          {points != null && <span className="ww-pill">⭐ {points}</span>}
        </div>
        <div className="ww-hero">
          <span className="ww-hero-icon">🎡</span>
          <h1>عجلة الكلمات</h1>
          <p>اختر طريقة اللعب التي تحبّها!</p>
        </div>
        <div className="ww-modes">
          {WW_MODES.map(mode => {
            const list = wheels.filter(w => w.mode === mode);
            if (!list.length) return null;
            const info = MODE_INFO[mode];
            const stars = list.reduce((n, w) => n + starsOf(w), 0);
            const done = list.filter(w => starsOf(w) > 0).length;
            return (
              <button key={mode} type="button" className={`ww-mode m-${mode}`} onClick={() => setView({ name: 'mode', mode })}>
                <span className="ww-mode-icon" aria-hidden="true">{info.icon}</span>
                <span className="ww-mode-stage">{info.stage}</span>
                <span className="ww-mode-title">{info.title}</span>
                <span className="ww-mode-desc">{info.desc}</span>
                <span className="ww-mode-progress">⭐ {stars}/{list.length * 3} · {done}/{list.length} عجلة</span>
              </button>
            );
          })}
        </div>
        {isStaff && (
          <Link href="/library/games/word-wheel/settings" className="ww-admin-link">
            ⚙️ إدارة اللعبة: العجلات، بطاقات الكلمات، الألوان، المساعدة والمكافآت
          </Link>
        )}
      </div>
    );
  } else if (view.name === 'mode') {
    const info = MODE_INFO[view.mode];
    const list = wheels.filter(w => w.mode === view.mode);
    const groups = view.mode === 'challenge'
      ? CHALLENGE_LEVELS.map(l => ({ level: l, items: list.filter(w => w.level === l.id) })).filter(g => g.items.length)
      : [{ level: null, items: list }];
    body = (
      <div className="ww-wrap">
        <div className="ww-top">
          <button type="button" className="ww-back" onClick={() => setView({ name: 'lobby' })}>→ الأنماط</button>
          <div className="ww-top-title">{info.icon} {info.title}</div>
          {points != null && <span className="ww-pill">⭐ {points}</span>}
        </div>
        <p style={{ margin: 0, textAlign: 'center', color: 'rgba(255,255,255,.9)', fontWeight: 700 }}>{info.desc}</p>
        {groups.map(g => (
          <div key={g.level?.id || 'all'} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.level && <div className="ww-level">{g.level.icon} {g.level.label}</div>}
            <div className="ww-wheels">
              {g.items.map(w => (
                <button key={w.id} type="button" className="ww-wheel" style={themeVars(w.theme)} onClick={() => setView({ name: 'play', wheel: w, run: Date.now() })}>
                  <div className="ww-wheel-art">
                    {w.mode === 'picture'
                      ? w.words.slice(0, 3).map(word => <WordVisual key={word} card={cardOf(word)} size="sm" />)
                      : <span className="ww-wheel-center">{w.center}</span>}
                  </div>
                  <span className="ww-wheel-name">{w.name}</span>
                  <span className="ww-wheel-meta">{w.words.length} كلمات{w.mode === 'challenge' && w.time ? ` · ${w.time}ث` : ''}</span>
                  <Stars count={starsOf(w)} size="1.1rem" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (view.name === 'play') {
    const w = view.wheel;
    const props = {
      wheel: w, cards: data.cards || {}, voice, pointsPerWord: settings.points_per_word || 0,
      onAward: award, onExit: () => setView({ name: 'mode', mode: w.mode }), onFinish: (r) => finishWheel(w, r),
    };
    body = w.mode === 'challenge' ? <ChallengeRound key={view.run} {...props} /> : <WordRound key={view.run} {...props} />;
  } else {
    const { wheel: w, result, stars } = view;
    const list = wheels.filter(x => x.mode === w.mode);
    const next = list[list.findIndex(x => x.id === w.id) + 1];
    const earned = result.solved * (settings.points_per_word || 0) + (stars > 0 ? settings.win_points || 0 : 0);
    const title = stars === 3 ? 'أداء مذهل يا بطل! 🏆' : stars === 2 ? 'أحسنت! أنت تتقدّم بسرعة 👏' : stars === 1 ? 'بداية جميلة! 🌱' : 'لا بأس، المحاولة القادمة أجمل 💪';
    body = (
      <div className="ww-wrap">
        <div className="ww-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          {stars > 0 && <Confetti count={28} />}
          <div className="ww-result-emoji">{stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🎡'}</div>
          <Stars count={stars} size="2.2rem" />
          <h2 className="ww-result-title">{title}</h2>
          <div className="ww-stats">
            <div className="ww-stat"><b>{result.solved}/{result.total}</b><span>كلمات</span></div>
            {earned > 0 && <div className="ww-stat"><b>+{earned}</b><span>نقطة</span></div>}
            {result.score != null && <div className="ww-stat"><b>{result.score}</b><span>نتيجة التحدي</span></div>}
          </div>
          {result.words.length > 0 && (
            <div className="ww-found">
              {result.words.map(({ word, status }) => {
                const info = cardOf(word);
                return (
                  <button key={word} type="button" className="ww-chip" title={status === 'revealed' ? 'تعلّمناها معاً' : 'اكتشفتها'}
                    onClick={() => { voice(info, { fallback: w.settings.voice_fallback }); setReplay(info); }}>
                    <WordVisual card={info} size="sm" />{info.vocalized}{status === 'revealed' ? ' 🌱' : ''}
                  </button>
                );
              })}
            </div>
          )}
          {next && <button type="button" className="ww-btn ww-btn-wide" onClick={() => setView({ name: 'play', wheel: next, run: Date.now() })}>العجلة التالية ←</button>}
          <div className="ww-controls">
            <button type="button" className="ww-btn-soft" onClick={() => setView({ name: 'play', wheel: w, run: Date.now() })}>🔄 العب مرة أخرى</button>
            <button type="button" className="ww-btn-soft" onClick={() => setView({ name: 'mode', mode: w.mode })}>كل العجلات</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ww" style={pageStyle}>
      <style dangerouslySetInnerHTML={{ __html: WW_CSS }} />
      {body}
      {replay && (
        <WordCard card={replay} onReplay={() => voice(replay)} onClose={() => setReplay(null)} />
      )}
    </div>
  );
}
