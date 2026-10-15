'use client';
import { useEffect, useRef, useState } from 'react';
import { STORY_AUDIO_MAX_MB, normalizeStoryAudioType } from '../../lib/story-audio';

/* ════════════════════════════════════════════════════════════════
   لوحة صوت القصة (تبويب القصص في bogga)
   ① رفع ملف صوتي جاهز  ② تسجيل قراءة القصة مباشرة من الميكروفون
   الرفع: رابط موقَّع من /api/stories/audio-upload-url ← الملف يذهب مباشرة
   إلى Supabase Storage (بلا حد Vercel 4.5MB) ← PUT /api/stories/[id] { audio_url }
════════════════════════════════════════════════════════════════ */

const GOLD = '#E8B84B';
const NAVY = '#1A2B4A';
const SAND = '#EDE5D8';
const MAX_REC_SECS = 20 * 60;

/* أول صيغة تسجيل يدعمها المتصفح — AAC/MP4 أولاً لأنها تعمل على كل أجهزة
   الطلاب (آيباد/آيفون/أندرويد/حاسوب)، ثم WEBM/OGG كبديل */
const REC_TYPES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];
function pickRecorderType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return REC_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || '';
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  minHeight: 48, borderRadius: 14, padding: '10px 18px',
  fontSize: '.9rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};
const BTN_GOLD  = { ...BTN, border: 'none', background: GOLD, color: NAVY, boxShadow: '0 4px 14px rgba(232,184,75,.35)' };
const BTN_LIGHT = { ...BTN, border: `2px solid ${SAND}`, background: '#fff', color: NAVY };
const BTN_RED   = { ...BTN, border: 'none', background: '#fee2e2', color: '#b91c1c' };

export default function StoryAudioPanel({ story, onSaved }) {
  const [pending,   setPending]   = useState(null);  // { blob, url, name }
  const [recording, setRecording] = useState(false);
  const [recSecs,   setRecSecs]   = useState(0);
  const [progress,  setProgress]  = useState(null);  // null | 0..100
  const [busy,      setBusy]      = useState(false);
  const [msg,       setMsg]       = useState(null);  // { ok, text }

  const fileRef     = useRef(null);
  const recorderRef = useRef(null);
  const streamRef   = useRef(null);
  const chunksRef   = useRef([]);
  const timerRef    = useRef(null);
  const pendingRef  = useRef(null);

  /* تحرير رابط المعاينة القديم كلما تغيّر الملف المعلَّق */
  const setPendingClip = (clip) => {
    if (pendingRef.current?.url) URL.revokeObjectURL(pendingRef.current.url);
    pendingRef.current = clip;
    setPending(clip);
  };

  /* تنظيف كامل عند إغلاق اللوحة: إيقاف الميكروفون والمؤقت ورابط المعاينة */
  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (pendingRef.current?.url) URL.revokeObjectURL(pendingRef.current.url);
  }, []);

  /* ── ① اختيار ملف ── */
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!normalizeStoryAudioType(file.type, file.name)) {
      setMsg({ ok: false, text: 'هذا ليس ملفاً صوتياً مدعوماً — اختر MP3 أو M4A أو WAV أو WEBM أو OGG' });
      return;
    }
    if (file.size > STORY_AUDIO_MAX_MB * 1024 * 1024) {
      setMsg({ ok: false, text: `حجم الملف أكبر من ${STORY_AUDIO_MAX_MB}MB — اختر ملفاً أصغر` });
      return;
    }
    setMsg(null);
    setPendingClip({ blob: file, url: URL.createObjectURL(file), name: file.name });
  };

  /* ── ② التسجيل ── */
  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMsg({ ok: false, text: 'هذا المتصفح لا يدعم التسجيل الصوتي — جرّب Chrome أو Safari حديثاً، أو ارفع ملفاً صوتياً' });
      return;
    }
    setMsg(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setMsg({ ok: false, text: 'تعذّر الوصول إلى الميكروفون — اسمح للمتصفح باستخدامه ثم أعد المحاولة' });
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = pickRecorderType();
    const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const type = (mr.mimeType || mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size === 0) {
        setMsg({ ok: false, text: 'لم يُلتقط أي صوت — تأكد من الميكروفون وأعد التسجيل' });
        return;
      }
      setPendingClip({ blob, url: URL.createObjectURL(blob), name: 'تسجيل قراءة القصة' });
    };
    recorderRef.current = mr;
    mr.start(1000);
    setPendingClip(null);
    setRecording(true);
    setRecSecs(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setRecSecs(secs);
      if (secs >= MAX_REC_SECS) stopRecording();
    }, 1000);
  };

  /* ── الحفظ: رفع مباشر ثم ربط الرابط بالقصة ── */
  const saveStoryAudio = async (audio_url) => {
    const res = await fetch(`/api/stories/${story.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.story) throw new Error(j.error || 'فشل حفظ الصوت');
    onSaved?.(j.story);
  };

  const handleUpload = async () => {
    if (!pending || busy) return;
    setBusy(true); setMsg(null); setProgress(0);
    try {
      const res = await fetch('/api/stories/audio-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, type: pending.blob.type, fileName: pending.blob.name || '' }),
      });
      const up = await res.json().catch(() => ({}));
      if (!res.ok || !up.signedUrl) throw new Error(up.error || 'تعذّر تجهيز الرفع');

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(new Error(`فشل رفع الملف (${xhr.status})`)));
        xhr.onerror = () => reject(new Error('انقطع الاتصال أثناء الرفع'));
        xhr.open('PUT', up.signedUrl);
        xhr.setRequestHeader('Content-Type', up.contentType);
        xhr.send(pending.blob);
      });

      await saveStoryAudio(up.publicUrl);
      setPendingClip(null);
      setMsg({ ok: true, text: '✅ تمت إضافة الصوت للقصة — يظهر الآن زر «استمع إلى القصة» للطلاب' });
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || 'فشل الحفظ'} — حاول مرة أخرى` });
    }
    setProgress(null);
    setBusy(false);
  };

  const handleRemove = async () => {
    if (busy || !confirm('حذف صوت هذه القصة؟')) return;
    setBusy(true); setMsg(null);
    try {
      await saveStoryAudio(null);
      setMsg({ ok: true, text: '🗑 تم حذف الصوت' });
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || 'فشل الحذف'}` });
    }
    setBusy(false);
  };

  return (
    <div style={{
      direction: 'rtl', background: '#FAF7F2', border: `2px dashed ${SAND}`, borderRadius: 16,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <style>{`@keyframes sapPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}`}</style>

      {/* الصوت الحالي */}
      <div>
        <div style={{ fontWeight: 800, color: NAVY, fontSize: '.9rem', marginBottom: 8 }}>🔊 صوت القصة الحالي</div>
        {story.audio_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <audio controls preload="none" src={story.audio_url} style={{ flex: '1 1 240px', minWidth: 0, maxWidth: '100%' }} />
            <button type="button" onClick={handleRemove} disabled={busy} style={{ ...BTN_RED, opacity: busy ? .6 : 1 }}>
              🗑 حذف الصوت
            </button>
          </div>
        ) : (
          <p style={{ margin: 0, color: '#64748b', fontSize: '.85rem' }}>لا يوجد صوت بعد — ارفع ملفاً أو سجّل قراءتك للقصة.</p>
        )}
      </div>

      {/* أزرار الإضافة */}
      {!recording && !pending && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} style={{ ...BTN_GOLD, flex: '1 1 180px' }}>
            📁 رفع ملف صوتي
          </button>
          <button type="button" onClick={startRecording} disabled={busy} style={{ ...BTN_LIGHT, flex: '1 1 180px' }}>
            🎙️ تسجيل قراءة القصة
          </button>
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac" onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}

      {/* أثناء التسجيل */}
      {recording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#fff', border: '2px solid #fecaca', borderRadius: 14, padding: '10px 14px' }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#dc2626', animation: 'sapPulse 1.1s ease infinite', flexShrink: 0 }} />
          <span style={{ fontWeight: 900, color: '#b91c1c', fontSize: '1rem', direction: 'ltr' }}>{fmt(recSecs)}</span>
          <span style={{ color: '#64748b', fontSize: '.82rem', flex: 1 }}>جارٍ التسجيل... اقرأ القصة بصوت واضح وهادئ</span>
          <button type="button" onClick={stopRecording} style={{ ...BTN, border: 'none', background: '#dc2626', color: '#fff' }}>
            ⏹ إيقاف التسجيل
          </button>
        </div>
      )}

      {/* معاينة قبل الحفظ */}
      {pending && !recording && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#fff', border: `2px solid ${GOLD}`, borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 800, color: NAVY, fontSize: '.85rem' }}>👂 استمع قبل الحفظ: {pending.name}</div>
          <audio controls src={pending.url} style={{ width: '100%' }} />
          {progress !== null && (
            <div style={{ height: 10, borderRadius: 99, background: SAND, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: NAVY, transition: 'width .2s' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleUpload} disabled={busy} style={{ ...BTN_GOLD, flex: '1 1 180px', opacity: busy ? .7 : 1 }}>
              {busy ? `⏳ جارٍ الرفع ${progress ?? 0}%` : story.audio_url ? '💾 حفظ واستبدال الصوت الحالي' : '💾 حفظ وإضافته للقصة'}
            </button>
            <button type="button" onClick={() => { setPendingClip(null); setMsg(null); }} disabled={busy} style={{ ...BTN_LIGHT, flex: '0 1 auto' }}>
              ✖ إلغاء
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div style={{
          borderRadius: 12, padding: '10px 14px', fontSize: '.85rem', fontWeight: 700,
          background: msg.ok ? '#ecfdf5' : '#fef2f2', color: msg.ok ? '#065f46' : '#b91c1c',
          border: `1.5px solid ${msg.ok ? '#86efac' : '#fecaca'}`,
        }}>
          {msg.text}
        </div>
      )}

      <p style={{ margin: 0, color: '#94a3b8', fontSize: '.75rem', lineHeight: 1.7 }}>
        الحد الأقصى {STORY_AUDIO_MAX_MB}MB. لأفضل توافق مع أجهزة آيباد وآيفون يُفضَّل رفع ملف MP3 أو M4A.
      </p>
    </div>
  );
}
