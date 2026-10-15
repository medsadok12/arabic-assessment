'use client';
import { useEffect, useRef, useState } from 'react';
import {
  STORY_AUDIO_MAX_MB, normalizeStoryAudioType, splitStoryPages, normalizePageAudio,
} from '../../lib/story-audio';

/* ════════════════════════════════════════════════════════════════
   لوحة أصوات صفحات القصة (تبويب القصص في bogga) — صوت مستقل لكل صفحة
   • لكل صفحة: تسجيل مباشر (مع عرض نص الصفحة لقراءته) أو رفع ملف، معاينة، حذف
   • بعد حفظ تسجيل صفحة: زر «سجّل الصفحة التالية» لمتابعة القصة بلا توقف
   • رفع ملفات عدة صفحات دفعة واحدة: تُرتَّب بأسمائها (1، 2، 3…) وتُربط بالترتيب
   الرفع: رابط موقَّع من /api/stories/audio-upload-url ← الملف يذهب مباشرة
   إلى Supabase Storage (بلا حد Vercel 4.5MB) ← PUT /api/stories/[id] { page_audio }
════════════════════════════════════════════════════════════════ */

const GOLD = '#E8B84B';
const NAVY = '#1A2B4A';
const SAND = '#EDE5D8';
const MAX_REC_SECS = 10 * 60;

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

/* نص الصفحة وصورتها الأولى من HTML المحفوظ — بلا DOM (يعمل في أي بيئة) */
function pageSummary(html) {
  const img  = html.match(/<img[^>]+src="([^"]+)"/i)?.[1] || null;
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
  return { img, text };
}

const BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  minHeight: 44, borderRadius: 12, padding: '8px 14px',
  fontSize: '.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};
const BTN_GOLD  = { ...BTN, border: 'none', background: GOLD, color: NAVY, boxShadow: '0 3px 10px rgba(232,184,75,.35)' };
const BTN_LIGHT = { ...BTN, border: `2px solid ${SAND}`, background: '#fff', color: NAVY };
const BTN_RED   = { ...BTN, border: 'none', background: '#fee2e2', color: '#b91c1c' };

/* رفع ملف واحد: رابط موقَّع ثم PUT مباشر إلى التخزين، يُرجع الرابط العام */
async function uploadPageFile(storyId, page, blob, onProgress) {
  const res = await fetch('/api/stories/audio-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId, page, type: blob.type, fileName: blob.name || '' }),
  });
  const up = await res.json().catch(() => ({}));
  if (!res.ok || !up.signedUrl) throw new Error(up.error || 'تعذّر تجهيز الرفع');

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress?.(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(new Error(`فشل رفع الملف (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('انقطع الاتصال أثناء الرفع'));
    xhr.open('PUT', up.signedUrl);
    xhr.setRequestHeader('Content-Type', up.contentType);
    xhr.send(blob);
  });
  return up.publicUrl;
}

function checkFile(file) {
  if (!normalizeStoryAudioType(file.type, file.name))
    return `«${file.name}» ليس ملفاً صوتياً مدعوماً — اختر MP3 أو M4A أو WAV أو WEBM أو OGG`;
  if (file.size > STORY_AUDIO_MAX_MB * 1024 * 1024)
    return `«${file.name}» أكبر من ${STORY_AUDIO_MAX_MB}MB`;
  return null;
}

export default function StoryAudioPanel({ story, onSaved }) {
  const pages = splitStoryPages(story.content);
  const audio = normalizePageAudio(story.page_audio, pages.length);
  const withAudio = audio.filter(Boolean).length;

  const [active,    setActive]    = useState(null);  // رقم الصفحة المفتوحة للتسجيل/المعاينة
  const [pending,   setPending]   = useState(null);  // { blob, url, name }
  const [recording, setRecording] = useState(false);
  const [recSecs,   setRecSecs]   = useState(0);
  const [progress,  setProgress]  = useState(null);  // null | 0..100
  const [busy,      setBusy]      = useState(false);
  const [msg,       setMsg]       = useState(null);  // { ok, text, page?, next? }
  const [bulkInfo,  setBulkInfo]  = useState('');

  const fileRef     = useRef(null);
  const bulkRef     = useRef(null);
  const filePageRef = useRef(null);
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

  const closeActive = () => { setPendingClip(null); setActive(null); };

  /* ── حفظ مصفوفة الأصوات كاملة ── */
  const saveAudio = async (next) => {
    const res = await fetch(`/api/stories/${story.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_audio: next }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.story) throw new Error(j.error || 'فشل حفظ الصوت');
    onSaved?.(j.story);
  };

  /* ── رفع ملف لصفحة واحدة ── */
  const pickFile = (page) => {
    filePageRef.current = page;
    fileRef.current?.click();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const page = filePageRef.current;
    if (!file || page === null) return;
    const err = checkFile(file);
    if (err) { setMsg({ ok: false, text: err }); return; }
    setMsg(null);
    setActive(page);
    setPendingClip({ blob: file, url: URL.createObjectURL(file), name: file.name });
  };

  /* ── التسجيل ── */
  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  };

  const startRecording = async (page) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMsg({ ok: false, text: 'هذا المتصفح لا يدعم التسجيل الصوتي — جرّب Chrome أو Safari حديثاً، أو ارفع ملفاً صوتياً' });
      return;
    }
    setMsg(null);
    setPendingClip(null);
    setActive(page);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setMsg({ ok: false, text: 'تعذّر الوصول إلى الميكروفون — اسمح للمتصفح باستخدامه ثم أعد المحاولة' });
      setActive(null);
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
        setActive(null);
        return;
      }
      setPendingClip({ blob, url: URL.createObjectURL(blob), name: `تسجيل الصفحة ${page + 1}` });
    };
    recorderRef.current = mr;
    mr.start(1000);
    setRecording(true);
    setRecSecs(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setRecSecs(secs);
      if (secs >= MAX_REC_SECS) stopRecording();
    }, 1000);
  };

  /* ── حفظ الصوت المعلَّق للصفحة المفتوحة ── */
  const handleSavePending = async () => {
    if (!pending || active === null || busy) return;
    const page = active;
    setBusy(true); setMsg(null); setProgress(0);
    try {
      const url = await uploadPageFile(story.id, page, pending.blob, setProgress);
      const next = [...audio];
      next[page] = url;
      await saveAudio(next);
      closeActive();
      const nextPage = page + 1 < pages.length ? page + 1 : null;
      setMsg({ ok: true, page, next: nextPage, text: `✅ أُضيف صوت الصفحة ${page + 1}` });
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || 'فشل الحفظ'} — حاول مرة أخرى` });
    }
    setProgress(null);
    setBusy(false);
  };

  const handleRemove = async (page) => {
    if (busy || !confirm(`حذف صوت الصفحة ${page + 1}؟`)) return;
    setBusy(true); setMsg(null);
    try {
      const next = [...audio];
      next[page] = null;
      await saveAudio(next);
      setMsg({ ok: true, text: `🗑 حُذف صوت الصفحة ${page + 1}` });
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || 'فشل الحذف'}` });
    }
    setBusy(false);
  };

  /* ── رفع ملفات عدة صفحات دفعة واحدة (ترتيب طبيعي بالأسماء: 1، 2، … 10) ── */
  const handleBulk = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const bad = files.map(checkFile).find(Boolean);
    if (bad) { setMsg({ ok: false, text: bad }); return; }

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    const used = files.slice(0, pages.length);
    const lines = used.map((f, i) => `الصفحة ${i + 1} ← ${f.name}${audio[i] ? ' (استبدال)' : ''}`).join('\n');
    const extra = files.length > pages.length ? `\n\n⚠️ ${files.length - pages.length} ملف زائد لن يُستخدم (القصة ${pages.length} صفحات فقط)` : '';
    if (!confirm(`سيُربط كل ملف بصفحة بالترتيب:\n\n${lines}${extra}\n\nمتابعة؟`)) return;

    closeActive();
    setBusy(true); setMsg(null);
    const next = [...audio];
    let done = 0;
    try {
      for (let i = 0; i < used.length; i++) {
        setBulkInfo(`⏳ جارٍ رفع الصفحة ${i + 1} من ${used.length}...`);
        next[i] = await uploadPageFile(story.id, i, used[i]);
        done++;
      }
    } catch (err) {
      setMsg({ ok: false, text: `❌ توقف الرفع عند الصفحة ${done + 1}: ${err.message || 'خطأ'} — حُفظ ما رُفع قبلها` });
    }
    if (done > 0) {
      try {
        await saveAudio(next);
        if (done === used.length) setMsg({ ok: true, text: `✅ أُضيفت أصوات ${done} صفحات` });
      } catch (err) {
        setMsg({ ok: false, text: `❌ ${err.message || 'فشل الحفظ'}` });
      }
    }
    setBulkInfo('');
    setBusy(false);
  };

  /* ══ القصة بلا صفحات بعد ══ */
  if (!pages.length) {
    return (
      <div style={{ direction: 'rtl', background: '#FAF7F2', border: `2px dashed ${SAND}`, borderRadius: 16, padding: 18, color: NAVY, fontWeight: 700, fontSize: '.9rem', lineHeight: 1.8 }}>
        📭 هذه القصة لا تحتوي صفحات بعد — أضف صفحاتها أولاً من «فتح محرر القصص الكامل»، ثم عُد هنا لإضافة صوت لكل صفحة.
      </div>
    );
  }

  const locked = busy || recording;

  return (
    <div style={{
      direction: 'rtl', background: '#FAF7F2', border: `2px dashed ${SAND}`, borderRadius: 16,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <style>{`@keyframes sapPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}`}</style>
      <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac" onChange={handleFile} style={{ display: 'none' }} />
      <input ref={bulkRef} type="file" multiple accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac" onChange={handleBulk} style={{ display: 'none' }} />

      {/* الرأس */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 900, color: NAVY, fontSize: '.95rem' }}>🔊 صوت كل صفحة</div>
          <div style={{ color: '#64748b', fontSize: '.78rem', marginTop: 2 }}>
            {withAudio} من {pages.length} صفحات بصوت — يسمع الطالب صوت الصفحة التي أمامه فقط
          </div>
        </div>
        <button type="button" onClick={() => bulkRef.current?.click()} disabled={locked} style={{ ...BTN_LIGHT, opacity: locked ? .55 : 1 }}>
          📁 رفع ملفات عدة صفحات دفعة واحدة
        </button>
      </div>
      {bulkInfo && <div style={{ color: NAVY, fontWeight: 800, fontSize: '.85rem' }}>{bulkInfo}</div>}

      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          borderRadius: 12, padding: '10px 14px', fontSize: '.85rem', fontWeight: 700,
          background: msg.ok ? '#ecfdf5' : '#fef2f2', color: msg.ok ? '#065f46' : '#b91c1c',
          border: `1.5px solid ${msg.ok ? '#86efac' : '#fecaca'}`,
        }}>
          <span style={{ flex: 1 }}>{msg.text}</span>
          {msg.ok && msg.next !== undefined && msg.next !== null && !locked && (
            <button type="button" onClick={() => startRecording(msg.next)} style={BTN_GOLD}>
              🎙️ سجّل الصفحة {msg.next + 1} الآن
            </button>
          )}
        </div>
      )}

      {/* الصفحات */}
      {pages.map((html, i) => {
        const { img, text } = pageSummary(html);
        const isActive = active === i;
        return (
          <div key={i} style={{
            background: '#fff', borderRadius: 14, padding: 12,
            border: `2px solid ${isActive ? GOLD : audio[i] ? '#cdeedd' : '#f1f5f9'}`,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ background: NAVY, color: '#fff', borderRadius: 10, padding: '4px 10px', fontSize: '.78rem', fontWeight: 900, flexShrink: 0 }}>
                صفحة {i + 1}
              </span>
              {img && <img src={img} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />}
              <span style={{ flex: '1 1 160px', minWidth: 0, color: '#475569', fontSize: '.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {text ? text.replace(/\n/g, ' ') : '🖼 صفحة صورة بلا نص'}
              </span>
              <span style={{ fontSize: '.75rem', fontWeight: 900, color: audio[i] ? '#047857' : '#94a3b8', flexShrink: 0 }}>
                {audio[i] ? '✅ بصوت' : '— بلا صوت'}
              </span>
            </div>

            {!isActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {audio[i] && <audio controls preload="none" src={audio[i]} style={{ flex: '1 1 220px', minWidth: 0, maxWidth: '100%', height: 40 }} />}
                <button type="button" onClick={() => startRecording(i)} disabled={locked} style={{ ...(audio[i] ? BTN_LIGHT : BTN_GOLD), opacity: locked ? .55 : 1 }}>
                  🎙️ {audio[i] ? 'إعادة التسجيل' : 'سجّل'}
                </button>
                <button type="button" onClick={() => pickFile(i)} disabled={locked} style={{ ...BTN_LIGHT, opacity: locked ? .55 : 1 }}>
                  📁 {audio[i] ? 'استبدال بملف' : 'ارفع ملفاً'}
                </button>
                {audio[i] && (
                  <button type="button" onClick={() => handleRemove(i)} disabled={locked} aria-label={`حذف صوت الصفحة ${i + 1}`} style={{ ...BTN_RED, opacity: locked ? .55 : 1 }}>
                    🗑
                  </button>
                )}
              </div>
            )}

            {/* أثناء التسجيل: نص الصفحة كبيراً لقراءته مباشرة */}
            {isActive && recording && (
              <>
                <div style={{ background: '#fffdf5', border: `1.5px solid ${SAND}`, borderRadius: 12, padding: '12px 16px', maxHeight: 240, overflowY: 'auto', whiteSpace: 'pre-line', fontSize: '1.25rem', lineHeight: 2, color: '#2d1f0e', fontWeight: 600 }}>
                  {text || '🖼 هذه الصفحة صورة بلا نص — صِف الصورة أو اقرأ ما يناسبها'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '2px solid #fecaca', borderRadius: 12, padding: '8px 12px' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#dc2626', animation: 'sapPulse 1.1s ease infinite', flexShrink: 0 }} />
                  <span style={{ fontWeight: 900, color: '#b91c1c', fontSize: '1rem', direction: 'ltr' }}>{fmt(recSecs)}</span>
                  <span style={{ color: '#64748b', fontSize: '.82rem', flex: 1 }}>جارٍ تسجيل الصفحة {i + 1}... اقرأ بصوت واضح وهادئ</span>
                  <button type="button" onClick={stopRecording} style={{ ...BTN, border: 'none', background: '#dc2626', color: '#fff' }}>
                    ⏹ إيقاف
                  </button>
                </div>
              </>
            )}

            {/* معاينة قبل الحفظ */}
            {isActive && !recording && pending && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 800, color: NAVY, fontSize: '.85rem' }}>👂 استمع قبل الحفظ: {pending.name}</div>
                <audio controls src={pending.url} style={{ width: '100%' }} />
                {progress !== null && (
                  <div style={{ height: 10, borderRadius: 99, background: SAND, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: NAVY, transition: 'width .2s' }} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={handleSavePending} disabled={busy} style={{ ...BTN_GOLD, flex: '1 1 180px', opacity: busy ? .7 : 1 }}>
                    {busy ? `⏳ جارٍ الرفع ${progress ?? 0}%` : `💾 حفظ صوت الصفحة ${i + 1}`}
                  </button>
                  <button type="button" onClick={() => startRecording(i)} disabled={busy} style={BTN_LIGHT}>
                    🎙️ أعد التسجيل
                  </button>
                  <button type="button" onClick={() => { closeActive(); setMsg(null); }} disabled={busy} style={BTN_LIGHT}>
                    ✖ إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p style={{ margin: 0, color: '#94a3b8', fontSize: '.75rem', lineHeight: 1.7 }}>
        الحد الأقصى {STORY_AUDIO_MAX_MB}MB للملف. لأفضل توافق مع أجهزة آيباد وآيفون يُفضَّل MP3 أو M4A.
        عند الرفع الجماعي سمِّ الملفات بأرقام الصفحات (1، 2، 3…) لتُربط كل واحدة بصفحتها.
        نقل الصفحات أو حذفها من المحرر الكامل يحمل صوت كل صفحة معها.
      </p>
    </div>
  );
}
