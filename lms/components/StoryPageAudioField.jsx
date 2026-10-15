'use client';
import { useEffect, useRef, useState } from 'react';
import { STORY_AUDIO_MAX_MB } from '../lib/story-audio';
import {
  STORY_AUDIO_ACCEPT, checkStoryAudioFile, uploadStoryPageAudio,
  useStoryAudioRecorder, formatRecSecs,
} from '../lib/story-audio-client';

/* ════════════════════════════════════════════════════════════════
   حقل صوت قراءة الصفحة — داخل محرر القصص الكامل (إنشاء وتعديل)
   تسجيل من الميكروفون أو رفع ملف ← معاينة ← «اعتمد هذا الصوت» يرفع
   الملف ويضعه في الصفحة ← يُحفظ مع القصة عند «حفظ التغييرات».
   يُركَّب بـ key={رقم الصفحة}: الانتقال لصفحة أخرى يوقف أي تسجيل جارٍ.
════════════════════════════════════════════════════════════════ */

const GOLD = '#E8B84B';
const NAVY = '#1A2B4A';
const SAND = '#EDE5D8';

const BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  minHeight: 44, borderRadius: 12, padding: '8px 14px',
  fontSize: '.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
};
const BTN_GOLD  = { ...BTN, border: 'none', background: GOLD, color: NAVY, boxShadow: '0 3px 10px rgba(232,184,75,.35)' };
const BTN_LIGHT = { ...BTN, border: `2px solid ${SAND}`, background: '#fff', color: NAVY };
const BTN_RED   = { ...BTN, border: 'none', background: '#fee2e2', color: '#b91c1c' };

export default function StoryPageAudioField({ storyId, page, audioUrl, onChange }) {
  const rec = useStoryAudioRecorder();
  const [pending,  setPending]  = useState(null);  // { blob, url, name }
  const [busy,     setBusy]     = useState(false);
  const [progress, setProgress] = useState(null);
  const [msg,      setMsg]      = useState(null);  // { ok, text }
  const fileRef    = useRef(null);
  const pendingRef = useRef(null);

  const setPendingClip = (clip) => {
    if (pendingRef.current?.url) URL.revokeObjectURL(pendingRef.current.url);
    pendingRef.current = clip;
    setPending(clip);
  };
  useEffect(() => () => {
    if (pendingRef.current?.url) URL.revokeObjectURL(pendingRef.current.url);
  }, []);

  const startRecording = async () => {
    setMsg(null);
    setPendingClip(null);
    const err = await rec.start((blob) => {
      if (!blob) { setMsg({ ok: false, text: 'لم يُلتقط أي صوت — تأكد من الميكروفون وأعد التسجيل' }); return; }
      setPendingClip({ blob, url: URL.createObjectURL(blob), name: `تسجيل الصفحة ${page + 1}` });
    });
    if (err) setMsg({ ok: false, text: err });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = checkStoryAudioFile(file);
    if (err) { setMsg({ ok: false, text: err }); return; }
    setMsg(null);
    setPendingClip({ blob: file, url: URL.createObjectURL(file), name: file.name });
  };

  const accept = async () => {
    if (!pending || busy) return;
    setBusy(true); setMsg(null); setProgress(0);
    try {
      const url = await uploadStoryPageAudio(storyId, page, pending.blob, setProgress);
      onChange(url);
      setPendingClip(null);
      setMsg({ ok: true, text: '✅ أُضيف الصوت لهذه الصفحة — اضغط «حفظ التغييرات» في الأسفل لحفظه مع القصة' });
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || 'فشل الرفع'} — حاول مرة أخرى` });
    }
    setProgress(null);
    setBusy(false);
  };

  const remove = () => {
    if (!confirm(`إزالة صوت الصفحة ${page + 1}؟`)) return;
    onChange(null);
    setMsg({ ok: true, text: '🗑 أُزيل الصوت — يُحذف نهائياً عند «حفظ التغييرات»' });
  };

  const locked = busy || rec.recording;

  return (
    <div style={{
      direction: 'rtl', background: '#FAF7F2', border: `2px dashed ${SAND}`, borderRadius: 14,
      padding: 14, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
      fontFamily: "'Cairo','Tajawal',sans-serif",
    }}>
      <style>{`@keyframes spaPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}`}</style>
      <input ref={fileRef} type="file" accept={STORY_AUDIO_ACCEPT} onChange={handleFile} style={{ display: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 900, color: NAVY, fontSize: '.88rem' }}>🔊 صوت قراءة الصفحة {page + 1}</span>
        <span style={{ fontSize: '.75rem', fontWeight: 800, color: audioUrl ? '#047857' : '#94a3b8' }}>
          {audioUrl ? '✅ لهذه الصفحة صوت' : 'لا يوجد صوت بعد'}
        </span>
      </div>

      {/* الصوت الحالي */}
      {audioUrl && !pending && !rec.recording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <audio controls preload="none" src={audioUrl} style={{ flex: '1 1 220px', minWidth: 0, maxWidth: '100%', height: 40 }} />
          <button type="button" onClick={remove} disabled={locked} style={BTN_RED}>🗑 إزالة الصوت</button>
        </div>
      )}

      {/* أزرار الإضافة */}
      {!pending && !rec.recording && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={startRecording} disabled={locked} style={{ ...BTN_GOLD, flex: '1 1 170px' }}>
            🎙️ {audioUrl ? 'إعادة تسجيل الصفحة' : 'سجّل قراءة الصفحة'}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={locked} style={{ ...BTN_LIGHT, flex: '1 1 170px' }}>
            📁 {audioUrl ? 'استبدال بملف صوتي' : 'ارفع ملفاً صوتياً'}
          </button>
        </div>
      )}

      {/* أثناء التسجيل — نص الصفحة ظاهر في المحرر أعلاه لقراءته */}
      {rec.recording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#fff', border: '2px solid #fecaca', borderRadius: 12, padding: '8px 12px' }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#dc2626', animation: 'spaPulse 1.1s ease infinite', flexShrink: 0 }} />
          <span style={{ fontWeight: 900, color: '#b91c1c', fontSize: '1rem', direction: 'ltr' }}>{formatRecSecs(rec.secs)}</span>
          <span style={{ color: '#64748b', fontSize: '.82rem', flex: 1 }}>جارٍ التسجيل... اقرأ نص الصفحة بصوت واضح وهادئ</span>
          <button type="button" onClick={rec.stop} style={{ ...BTN, border: 'none', background: '#dc2626', color: '#fff' }}>⏹ إيقاف</button>
        </div>
      )}

      {/* معاينة قبل الاعتماد */}
      {pending && !rec.recording && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#fff', border: `2px solid ${GOLD}`, borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 800, color: NAVY, fontSize: '.85rem' }}>👂 استمع قبل الاعتماد: {pending.name}</div>
          <audio controls src={pending.url} style={{ width: '100%' }} />
          {progress !== null && (
            <div style={{ height: 10, borderRadius: 99, background: SAND, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: NAVY, transition: 'width .2s' }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={accept} disabled={busy} style={{ ...BTN_GOLD, flex: '1 1 180px', opacity: busy ? .7 : 1 }}>
              {busy ? `⏳ جارٍ الرفع ${progress ?? 0}%` : '✔ اعتمد هذا الصوت للصفحة'}
            </button>
            <button type="button" onClick={startRecording} disabled={busy} style={BTN_LIGHT}>🎙️ أعد التسجيل</button>
            <button type="button" onClick={() => { setPendingClip(null); setMsg(null); }} disabled={busy} style={BTN_LIGHT}>✖ إلغاء</button>
          </div>
        </div>
      )}

      {msg && (
        <div style={{
          borderRadius: 10, padding: '8px 12px', fontSize: '.82rem', fontWeight: 700,
          background: msg.ok ? '#ecfdf5' : '#fef2f2', color: msg.ok ? '#065f46' : '#b91c1c',
          border: `1.5px solid ${msg.ok ? '#86efac' : '#fecaca'}`,
        }}>
          {msg.text}
        </div>
      )}

      <span style={{ color: '#94a3b8', fontSize: '.72rem', lineHeight: 1.6 }}>
        يسمع الطالب هذا الصوت عندما يكون على هذه الصفحة فقط. الحد الأقصى {STORY_AUDIO_MAX_MB}MB — يُفضَّل MP3 أو M4A لأجهزة آيباد وآيفون.
      </span>
    </div>
  );
}
