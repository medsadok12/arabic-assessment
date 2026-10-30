'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { childFetch } from '../../../../lib/child-fetch';
import { speakArabic } from '../../../../lib/speak-arabic';
import { resizeImageToWebp } from '../../../../lib/image-resize';
import { useStoryAudioRecorder, formatRecSecs } from '../../../../lib/story-audio-client';
import {
  sceneApi, uploadSceneFile, readSceneDraft, writeSceneDraft, markReviewSeen,
} from '../../../../lib/scene-story-client';
import {
  MODE_INFO, BAND_INFO, FEELINGS, HELP_CARDS_TITLE,
  AUDIO_MAX_SECS, countWords, wordNoun, LISTEN_TITLE, LISTEN_FALLBACK,
} from '../../../../lib/scene-story';
import { SC_CSS, SceneImage, ReviewCard, StarRow, RecordingPlayer, feelingOf } from '../_ui';

/* ════════════════════════════════════════════════════════════════
   «مشهدٌ وحكاية» — شاشة الطفل: ينظر للمشهد، يفتح عدسات المحقّق، يختار
   شعور الشخصية، ويستعين ببطاقات المساعدة (أفكار المعلم)، ثم يحكي بالكتابة
   أو بصوته أو بصورة ورقته. ردّ واحد نهائي لكل مشهد: بعد «أرسل» يرى عمله فقط
   ولا يغيّره، ثم يرى نجوم معلمه وملصقاته.
   التسجيل والصورة يبقيان في الجهاز حتى «أرسل» ثم يُرفعان لدلو خاص.
════════════════════════════════════════════════════════════════ */

const CONFETTI = ['#F59E0B', '#3FA796', '#7C5CD9', '#E8B84B', '#2ABB7A', '#EC4899'];

export default function ScenePage() {
  const { id } = useParams();
  const [data, setData]       = useState(null);
  const [failed, setFailed]   = useState(null);
  const [points, setPoints]   = useState(null);
  const [mode, setMode]       = useState('write');
  const [text, setText]       = useState('');
  const [feeling, setFeeling] = useState(null);
  const [audio, setAudio]     = useState(null);   // { path?, url, blob? }
  const [photo, setPhoto]     = useState(null);   // { path?, url, blob? }
  const [playing, setPlaying] = useState(false);
  const [sending, setSending] = useState(null);   // نص حالة الإرسال
  const [msg, setMsg]         = useState(null);   // { ok, text }
  const [done, setDone]       = useState(null);   // { points }
  const [restored, setRestored] = useState(false);
  const rec = useStoryAudioRecorder(AUDIO_MAX_SECS);
  const audioRef = useRef(null);

  const scene    = data?.scene;
  const response = data?.response;
  const reviewed = response?.status === 'reviewed';
  const preview  = data && !data.can_submit;
  const band     = BAND_INFO[data?.band] ? data.band : '2';
  const info     = BAND_INFO[band];
  const modes    = useMemo(() => (scene?.modes?.length ? scene.modes : ['write', 'speak', 'photo']), [scene]);

  /* تعبئة النموذج من ردّ محفوظ، أو من مسودة الجهاز */
  const fillFrom = useCallback((d) => {
    const r = d.response;
    const m = d.scene.modes?.length ? d.scene.modes : ['write'];
    if (r) {
      setText(r.text || '');
      setFeeling(r.feeling || null);
      setAudio(r.audio_path ? { path: r.audio_path, url: r.audio_url } : null);
      setPhoto(r.photo_path ? { path: r.photo_path, url: r.photo_url } : null);
      setMode(r.text ? 'write' : r.audio_path ? 'speak' : r.photo_path ? 'photo' : m[0]);
    } else {
      const draft = readSceneDraft(d.scene.id);
      if (draft?.text || draft?.feeling) {
        setText(draft.text || '');
        setFeeling(draft.feeling || null);
        setRestored(!!draft.text);
      }
      setMode(m[0]);
    }
  }, []);

  const load = useCallback(async () => {
    const { ok, data: d } = await sceneApi(`/api/scenes/${id}?t=${Date.now()}`);
    if (!ok || !d.scene) { setFailed(d.error || 'هذا المشهد غير متاح الآن'); return; }
    setData(d);
    setFailed(null);
    fillFrom(d);
  }, [id, fillFrom]);

  const loadPoints = useCallback(() => {
    childFetch('/api/points').then(r => r.json()).then(j => setPoints(j.points ?? null)).catch(() => {});
  }, []);

  useEffect(() => { load(); loadPoints(); }, [load, loadPoints]);

  // عند العودة للتبويب: إن قيّم المعلم الحكاية تظهر نجومه فوراً (القسم 9.5)
  useEffect(() => {
    const onBack = async () => {
      if (document.visibilityState !== 'visible' || !response || reviewed) return;
      const { ok, data: d } = await sceneApi(`/api/scenes/${id}?t=${Date.now()}`);
      if (ok && d.response?.status === 'reviewed') { setData(d); fillFrom(d); loadPoints(); }
    };
    document.addEventListener('visibilitychange', onBack);
    return () => document.removeEventListener('visibilitychange', onBack);
  }, [id, response, reviewed, fillFrom, loadPoints]);

  // رأى الطفل نجوم معلمه ← لا تُبرَز الحكاية في القائمة بعد الآن
  useEffect(() => {
    if (reviewed && !preview) markReviewSeen(scene?.id, response?.reviewed_at);
  }, [reviewed, preview, scene?.id, response?.reviewed_at]);

  // مسودة النص والشعور في الجهاز (قبل الإرسال فقط)
  useEffect(() => {
    if (!scene || response || preview) return;
    const t = setTimeout(() => writeSceneDraft(scene.id, { text, feeling }), 400);
    return () => clearTimeout(t);
  }, [scene, text, feeling, response, preview]);

  // تسجيل أو صورة لم يُرسلا بعد ← تنبيه قبل مغادرة الصفحة
  const unsent = !!(audio?.blob || photo?.blob);
  useEffect(() => {
    if (!unsent) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsent]);

  // روابط المعاينة المحلية (التسجيل والصورة قبل الإرسال) تُحرَّر عند الخروج
  const localUrls = useRef([]);
  const localUrl = (blob) => { const u = URL.createObjectURL(blob); localUrls.current.push(u); return u; };
  useEffect(() => () => {
    localUrls.current.forEach(u => URL.revokeObjectURL(u));
    audioRef.current?.pause();
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  /* ── الكتابة: عدّاد الكلمات نحو هدف الفئة العمرية ── */
  const helpCards = Array.isArray(scene?.help_cards) ? scene.help_cards : [];
  const n = countWords(text);
  const pct = Math.min(100, Math.round((n / info.goal) * 100));
  const meterStars = pct >= 100 ? 3 : pct >= 60 ? 2 : pct > 0 ? 1 : 0;

  /* ── سؤال المعلم بصوته، وإلا عبارة عامة بصوت الجهاز (داخل اللمسة نفسها لسفاري) ── */
  const listen = () => {
    if (playing) {
      audioRef.current?.pause();
      try { window.speechSynthesis?.cancel(); } catch {}
      setPlaying(false);
      return;
    }
    const say = () => speakArabic(LISTEN_FALLBACK, { onStart: () => setPlaying(true), onEnd: () => setPlaying(false) });
    if (!scene.prompt_audio_url) { say(); return; }
    const a = audioRef.current || (audioRef.current = new Audio());
    a.src = scene.prompt_audio_url;
    a.onended = () => setPlaying(false);
    a.onpause = () => setPlaying(false);
    setPlaying(true);
    a.play().catch(() => { setPlaying(false); say(); });
  };

  /* ── التسجيل ── */
  const startRec = async () => {
    setMsg(null);
    const err = await rec.start((blob) => {
      if (!blob) { setMsg({ ok: false, text: 'لم نسمع صوتاً — اقترب من الميكروفون وجرّب مرة أخرى 🎙️' }); return; }
      setAudio({ blob, url: localUrl(blob) });
      setMsg({ ok: true, text: '✅ سُجّلت حكايتك — استمع إليها، ثم أرسلها لمعلمك' });
    });
    if (err) setMsg({ ok: false, text: err });
  };
  /* حذف ما أُضيف قبل الإرسال (بعده لا تعديل) */
  const deleteAudio = () => {
    if (!confirm('هل تريد حذف التسجيل؟')) return;
    setAudio(null);
    setMsg({ ok: true, text: '🗑 حُذف التسجيل' });
  };
  const reRecord = () => {
    if (!confirm('هل تريد حذف هذا التسجيل والتسجيل من جديد؟')) return;
    setAudio(null);
    startRec();
  };
  const deletePhoto = () => {
    if (!confirm('هل تريد حذف الصورة؟')) return;
    setPhoto(null);
    setMsg({ ok: true, text: '🗑 حُذفت الصورة' });
  };

  /* ── الصورة: تُصغَّر في الجهاز قبل الرفع ── */
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMsg(null);
    try {
      const blob = await resizeImageToWebp(file, 1600, 0.85);
      setPhoto({ blob, url: localUrl(blob) });
      setMsg({ ok: true, text: '✅ صورة جميلة! أرسلها لمعلمك حين تكون جاهزاً' });
    } catch {
      setMsg({ ok: false, text: 'لم نستطع فتح هذه الصورة — جرّب صورة أخرى 📷' });
    }
  };

  /* ── الإرسال ── */
  const has = { write: !!text.trim(), speak: !!audio, photo: !!photo };
  const ready = modes.some(m => has[m]);
  const send = async () => {
    if (!ready || sending || rec.recording || preview || response) return;
    setMsg(null);
    try {
      let audioPath = audio?.path || null;
      let photoPath = photo?.path || null;
      // يُرفع مرة واحدة: إن فشل الحفظ بعد الرفع لا يُعاد رفع الملف نفسه
      if (modes.includes('speak') && audio?.blob && !audio.path) {
        const blob = audio.blob;
        setSending('🎙️ نرسل تسجيلك…');
        audioPath = await uploadSceneFile('audio', blob, { sceneId: scene.id, onProgress: p => setSending(`🎙️ نرسل تسجيلك ${p}%`) });
        setAudio(a => (a?.blob === blob ? { ...a, path: audioPath } : a));
      }
      if (modes.includes('photo') && photo?.blob && !photo.path) {
        const blob = photo.blob;
        setSending('📷 نرسل صورتك…');
        photoPath = await uploadSceneFile('photo', blob, { sceneId: scene.id, onProgress: p => setSending(`📷 نرسل صورتك ${p}%`) });
        setPhoto(ph => (ph?.blob === blob ? { ...ph, path: photoPath } : ph));
      }
      setSending('✨ نحفظ حكايتك…');
      const { ok, data: d } = await sceneApi(`/api/scenes/${scene.id}/response`, {
        method: 'PUT',
        body: {
          text: modes.includes('write') ? text : '',
          audio_path: modes.includes('speak') ? audioPath : null,
          photo_path: modes.includes('photo') ? photoPath : null,
          feeling,
        },
      });
      if (!ok) throw new Error(d.error || 'لم تُحفظ حكايتك — حاول مرة أخرى بعد لحظة');
      writeSceneDraft(scene.id, null);
      setRestored(false);
      setData(cur => ({ ...cur, response: d.response }));
      setAudio(d.response.audio_path ? { path: d.response.audio_path, url: d.response.audio_url } : null);
      setPhoto(d.response.photo_path ? { path: d.response.photo_path, url: d.response.photo_url } : null);
      setDone({ points: d.points });
      loadPoints();
    } catch (e) {
      setMsg({ ok: false, text: `${e.message || 'لم تُحفظ حكايتك'} 🌱` });
    }
    setSending(null);
  };

  /* ════ العرض ════ */
  if (failed && !data) {
    return (
      <div className="sc">
        <style dangerouslySetInnerHTML={{ __html: SC_CSS }} />
        <main className="sc-main" style={{ paddingTop: 40 }}>
          <div className="sc-empty">
            <span className="big" aria-hidden="true">🌥️</span>
            <h3>{failed}</h3>
            <p>ربما أخفاه معلمك أو لم يحن موعده بعد. جرّب مشهداً آخر!</p>
            <Link href="/library/scenes" className="sc-pill gold">📚 كل المشاهد</Link>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sc">
        <style dangerouslySetInnerHTML={{ __html: SC_CSS }} />
        <main className="sc-main" aria-busy="true">
          <div className="sc-skel" style={{ height: 52 }} />
          <div className="sc-skel" style={{ height: 300 }} />
          <div className="sc-skel" style={{ height: 180 }} />
        </main>
      </div>
    );
  }

  const feelingLabel = feelingOf(feeling)?.label;

  return (
    <div className="sc">
      <style dangerouslySetInnerHTML={{ __html: SC_CSS }} />
      <header className="sc-top">
        <div className="sc-top-in">
          <Link href="/library/scenes" className="sc-back">→ المشاهد</Link>
          <h1>{scene.title}</h1>
          {preview
            ? <Link href="/library/scenes/manage" className="sc-pill gold">⚙️ اللوحة</Link>
            : <span className="sc-pill">⭐ {points ?? '…'}</span>}
        </div>
      </header>

      <main className="sc-main">
        {preview && (
          <div className="sc-banner preview"><span aria-hidden="true">👀</span>معاينة المعلم — هكذا يرى الطالب المشهد. جرّب الكتابة والمساعدة؛ التسجيل والإرسال للطلاب فقط.</div>
        )}

        {reviewed && <ReviewCard review={response.review} />}

        <div className="sc-layout">
          <div className="sc-col stick">
            <SceneImage scene={scene} />
            {/* سؤال المعلم يُسمَع بـ🔊 (تسجيله، وإلا عبارة عامة بصوت الجهاز) — والعنوان الظاهر ثابت */}
            <section className="sc-prompt">
              <p>{LISTEN_TITLE}</p>
              <button type="button" className={`sc-listen${playing ? ' playing' : ''}`} onClick={listen}
                aria-label={playing ? 'أوقف الصوت' : 'استمع لسؤال المعلم'}>{playing ? '⏸' : '🔊'}</button>
            </section>
            {!response && scene.hotspots?.length > 0 && (
              <p className="sc-small">🔍 المس العدسات الذهبية على الصورة — في كل واحدة سؤال صغير يساعدك</p>
            )}
          </div>

          <div className="sc-col">
            {response ? (
              // أُرسلت الحكاية: يراها الطفل كما هي فقط — لا تعديل ولا إعادة إرسال
              <section className="sc-box sc-mywork" aria-label="حكايتي">
                <h3>📖 حكايتي {feelingLabel && <span className="sc-mode-tag">{feelingOf(feeling).icon} {feelingLabel}</span>}</h3>
                {response.text && <p className="sc-mywork-text">{response.text}</p>}
                {response.audio_url && <RecordingPlayer src={response.audio_url} />}
                {response.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="sc-photo-prev" src={response.photo_url} alt="صورة حكايتي" />
                )}
                {reviewed ? (
                  <Link href="/library/scenes" className="sc-send" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>📚 مشهد جديد ينتظرك</Link>
                ) : (
                  <>
                    <div className="sc-send sc-locked" role="status" aria-disabled="true">✅ وصلت حكايتك لمعلمك</div>
                    <p className="sc-small">🔒 أرسلتَ حكايتك — سيقرؤها معلمك ويرسل لك نجومه قريباً</p>
                    <Link href="/library/scenes" className="sc-soft sc-more">📚 مشاهد أخرى</Link>
                  </>
                )}
              </section>
            ) : (
              <>
                {restored && (
                  <div className="sc-msg ok">✍️ أعدنا لك ما كتبته من قبل — أكمل حكايتك</div>
                )}

                {scene.feeling_q && (
                  <section className="sc-box">
                    <p className="sc-feel-q">{feelingLabel ? `${feelingLabel} — رائع! احكِ لنا لماذا` : scene.feeling_q}</p>
                    <div className="sc-feel" role="group" aria-label={scene.feeling_q}>
                      {FEELINGS.map(f => (
                        <button key={f.id} type="button" aria-pressed={feeling === f.id} onClick={() => setFeeling(v => (v === f.id ? null : f.id))}>
                          <span aria-hidden="true">{f.icon}</span><small>{f.label}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* أفكار المعلم — تُقرأ ولا تُلمس، وتساعد في الكتابة والحكي والرسم معاً */}
                {helpCards.length > 0 && (
                  <section className="sc-box" aria-label={HELP_CARDS_TITLE}>
                    <h3>💡 {HELP_CARDS_TITLE}</h3>
                    <ul className="sc-help-cards">
                      {helpCards.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </section>
                )}

                {modes.length > 1 && (
                  <div className="sc-tabs" role="tablist" aria-label="كيف تحكي حكايتك؟">
                    {modes.map(m => (
                      <button key={m} type="button" role="tab" className="sc-tab" aria-selected={mode === m}
                        disabled={rec.recording || !!sending} onClick={() => { setMode(m); setMsg(null); }}>
                        <span aria-hidden="true">{MODE_INFO[m].icon}</span>{MODE_INFO[m].label}
                        {has[m] && <i aria-label="جاهز">✓</i>}
                      </button>
                    ))}
                  </div>
                )}

                {mode === 'write' && modes.includes('write') && (
                  <section className="sc-box" aria-label="أكتب حكايتي">
                    <textarea className="sc-text" value={text} lang="ar" dir="rtl" spellCheck={false}
                      onChange={e => setText(e.target.value.slice(0, 3000))} aria-label="حكايتي"
                      placeholder="اكتب حكايتك هنا…" />
                    <div className="sc-meter" aria-live="polite">
                      <span>{n} من {info.goal} {wordNoun(info.goal)}</span>
                      <div className="sc-bar"><div style={{ width: `${pct}%` }} /></div>
                      <StarRow value={meterStars} />
                    </div>
                  </section>
                )}

                {mode === 'speak' && modes.includes('speak') && (
                  <section className="sc-box" aria-label="أحكي بصوتي">
                    <div className="sc-rec">
                      {!audio && (
                        <>
                          <button type="button" className={`sc-rec-btn${rec.recording ? ' on' : ''}`} disabled={preview}
                            onClick={rec.recording ? rec.stop : startRec} aria-label={rec.recording ? 'أوقف التسجيل' : 'ابدأ التسجيل'}>
                            {rec.recording ? '⏹' : '🎙️'}
                          </button>
                          <div className="sc-rec-time">{formatRecSecs(rec.secs)} / {formatRecSecs(AUDIO_MAX_SECS)}</div>
                          <p className="sc-small">
                            {preview ? 'التسجيل للطلاب فقط'
                              : rec.recording ? 'أحكي الآن… المس الزر حين تنتهي'
                              : 'المس الميكروفون واحكِ الحكاية بصوتك (حتى دقيقتين)'}
                          </p>
                        </>
                      )}
                      {audio && (
                        <>
                          <RecordingPlayer src={audio.url} />
                          <div className="sc-row">
                            <button type="button" className="sc-soft" onClick={reRecord} disabled={!!sending}>🔁 سجّل من جديد</button>
                            <button type="button" className="sc-soft del" onClick={deleteAudio} disabled={!!sending}>🗑 احذف التسجيل</button>
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                )}

                {mode === 'photo' && modes.includes('photo') && (
                  <section className="sc-box" aria-label="أصوّر ورقتي">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="sc-photo-prev" src={photo.url} alt="الصورة التي اخترتها" />
                    ) : (
                      <label className={`sc-photo-drop${preview ? ' off' : ''}`}>
                        <span aria-hidden="true">📷</span>
                        صوّر ورقتك أو رسمتك
                        <input type="file" accept="image/*" capture="environment" onChange={pickPhoto} disabled={preview} className="sc-file" />
                      </label>
                    )}
                    <div className="sc-row">
                      {photo && (
                        <label className="sc-soft sc-file-btn">
                          📷 صورة أخرى
                          <input type="file" accept="image/*" capture="environment" onChange={pickPhoto} disabled={!!sending} className="sc-file" />
                        </label>
                      )}
                      <label className={`sc-soft sc-file-btn${preview ? ' off' : ''}`}>
                        🖼️ اختر من الصور
                        <input type="file" accept="image/*" onChange={pickPhoto} disabled={preview || !!sending} className="sc-file" />
                      </label>
                      {photo && <button type="button" className="sc-soft del" onClick={deletePhoto} disabled={!!sending}>🗑 احذف الصورة</button>}
                    </div>
                    <p className="sc-small">لا يرى صورتك إلا معلمك 🔒</p>
                  </section>
                )}

                {msg && <div className={`sc-msg${msg.ok ? ' ok' : ''}`} role="status">{msg.text}</div>}

                <button type="button" className="sc-send" onClick={send} disabled={!ready || !!sending || rec.recording || preview}>
                  {preview ? '🔒 الإرسال للطلاب فقط'
                    : sending || 'أرسل لتقييم عملك ←'}
                </button>
                {!ready && !preview && (
                  <p className="sc-small">
                    {modes.length > 1 ? 'اكتب، أو سجّل بصوتك، أو صوّر ورقتك — ثم أرسل 🌟' : `${MODE_INFO[modes[0]].icon} ${MODE_INFO[modes[0]].label} حكايتك ثم أرسلها 🌟`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {done && (
        <div className="sc-done" role="dialog" aria-modal="true" aria-label="وصلت حكايتك">
          <div className="sc-confetti" aria-hidden="true">
            {Array.from({ length: 26 }, (_, i) => (
              <span key={i} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 7) * 90}ms`, borderRadius: i % 3 ? 3 : '50%' }} />
            ))}
          </div>
          <div className="sc-done-card">
            <span className="big" aria-hidden="true">🌟</span>
            <h2>أحسنت يا حكّاءنا الصغير!</h2>
            <p>وصلت حكايتك لمعلمك، وسيرد عليك بنجومه قريباً</p>
            {done.points > 0 && <span className="pts">+{done.points} نقطة ⭐</span>}
            <Link href="/library/scenes" className="sc-send" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }}>📚 مشاهد أخرى</Link>
            <button type="button" className="sc-soft" onClick={() => setDone(null)} autoFocus>👀 أبقى هنا</button>
          </div>
        </div>
      )}
    </div>
  );
}
