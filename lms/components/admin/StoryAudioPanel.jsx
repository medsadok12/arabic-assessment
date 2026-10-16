'use client';
import { useEffect, useRef, useState } from 'react';
import { STORY_AUDIO_MAX_MB, splitStoryPages, normalizePageAudio } from '../../lib/story-audio';
import {
  STORY_AUDIO_ACCEPT, checkStoryAudioFile, uploadStoryPageAudio,
  useStoryAudioRecorder, formatRecSecs,
} from '../../lib/story-audio-client';

/* ════════════════════════════════════════════════════════════════
   لوحة أصوات صفحات القصة (تبويب القصص في bogga) — صوت مستقل لكل صفحة
   • لكل صفحة: تسجيل مباشر (مع عرض نص الصفحة لقراءته) أو رفع ملف يُحفظ فوراً، حذف
   • بعد حفظ تسجيل صفحة: زر «سجّل الصفحة التالية» لمتابعة القصة بلا توقف
   • رفع ملفات عدة صفحات دفعة واحدة: تُرتَّب بأسمائها (1، 2، 3…) وتُربط بالترتيب
   التسجيل والرفع من lib/story-audio-client.js (مشترك مع محرر القصص الكامل)،
   ثم الحفظ عبر PUT /api/stories/[id] { page_audio }
════════════════════════════════════════════════════════════════ */

const GOLD = '#E8B84B';
const NAVY = '#1A2B4A';
const SAND = '#EDE5D8';

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

export default function StoryAudioPanel({ story, onSaved }) {
  const pages = splitStoryPages(story.content);
  const audio = normalizePageAudio(story.page_audio, pages.length);
  const withAudio = audio.filter(Boolean).length;

  const rec = useStoryAudioRecorder();
  const [active,    setActive]    = useState(null);  // رقم الصفحة المفتوحة للتسجيل/المعاينة
  const [pending,   setPending]   = useState(null);  // { blob, url, name }
  const [progress,  setProgress]  = useState(null);  // null | 0..100
  const [busy,      setBusy]      = useState(false);
  const [msg,       setMsg]       = useState(null);  // { ok, text, page?, next? }
  const [bulkInfo,  setBulkInfo]  = useState('');

  const fileRef     = useRef(null);
  const bulkRef     = useRef(null);
  const filePageRef = useRef(null);
  const pendingRef  = useRef(null);
  const audioRef    = useRef(audio);  // أحدث أصوات القصة عند الحفظ (بعد انتهاء تسجيل طويل)
  useEffect(() => { audioRef.current = audio; });

  /* تحرير رابط المعاينة القديم كلما تغيّر الملف المعلَّق */
  const setPendingClip = (clip) => {
    if (pendingRef.current?.url) URL.revokeObjectURL(pendingRef.current.url);
    pendingRef.current = clip;
    setPending(clip);
  };

  /* تحرير رابط المعاينة عند إغلاق اللوحة (الميكروفون يوقفه useStoryAudioRecorder) */
  useEffect(() => () => {
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
    const err = checkStoryAudioFile(file);
    if (err) { setMsg({ ok: false, text: err }); return; }
    savePageClip(page, { blob: file, url: URL.createObjectURL(file), name: file.name });
  };

  /* ── التسجيل ── */
  const startRecording = async (page) => {
    setMsg(null);
    setPendingClip(null);
    setActive(page);
    const err = await rec.start((blob) => {
      if (!blob) {
        setMsg({ ok: false, text: 'لم يُلتقط أي صوت — تأكد من الميكروفون وأعد التسجيل' });
        setActive(null);
        return;
      }
      savePageClip(page, { blob, url: URL.createObjectURL(blob), name: `تسجيل الصفحة ${page + 1}` });
    });
    if (err) { setMsg({ ok: false, text: err }); setActive(null); }
  };

  /* ── حفظ تسجيل/ملف صفحة فوراً (رفع + حفظ في القصة) — بلا خطوة «حفظ» يدوية
        كانت تُفقد التسجيل بصمت إن أُغلقت اللوحة أو فُتحت صفحة أخرى قبلها ── */
  const savePageClip = async (page, clip) => {
    setActive(page);
    setPendingClip(clip);
    setBusy(true); setMsg(null); setProgress(0);
    try {
      const url = await uploadStoryPageAudio(story.id, page, clip.blob, setProgress);
      const next = [...audioRef.current];
      next[page] = url;
      await saveAudio(next);
      closeActive();
      const nextPage = page + 1 < pages.length ? page + 1 : null;
      setMsg({ ok: true, page, next: nextPage, text: `✅ حُفظ صوت الصفحة ${page + 1} — يسمعه الطلاب الآن` });
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message || 'فشل الحفظ'} — التسجيل ما زال هنا، اضغط «أعد محاولة الحفظ»` });
    }
    setProgress(null);
    setBusy(false);
  };

  const handleSavePending = () => {
    if (pending && active !== null && !busy) savePageClip(active, pending);
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
    const bad = files.map(checkStoryAudioFile).find(Boolean);
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
        next[i] = await uploadStoryPageAudio(story.id, i, used[i]);
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

  const locked = busy || rec.recording;

  return (
    <div style={{
      direction: 'rtl', background: '#FAF7F2', border: `2px dashed ${SAND}`, borderRadius: 16,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <style>{`@keyframes sapPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}`}</style>
      <input ref={fileRef} type="file" accept={STORY_AUDIO_ACCEPT} onChange={handleFile} style={{ display: 'none' }} />
      <input ref={bulkRef} type="file" multiple accept={STORY_AUDIO_ACCEPT} onChange={handleBulk} style={{ display: 'none' }} />

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
            {isActive && rec.recording && (
              <>
                <div style={{ background: '#fffdf5', border: `1.5px solid ${SAND}`, borderRadius: 12, padding: '12px 16px', maxHeight: 240, overflowY: 'auto', whiteSpace: 'pre-line', fontSize: '1.25rem', lineHeight: 2, color: '#2d1f0e', fontWeight: 600 }}>
                  {text || '🖼 هذه الصفحة صورة بلا نص — صِف الصورة أو اقرأ ما يناسبها'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', border: '2px solid #fecaca', borderRadius: 12, padding: '8px 12px' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#dc2626', animation: 'sapPulse 1.1s ease infinite', flexShrink: 0 }} />
                  <span style={{ fontWeight: 900, color: '#b91c1c', fontSize: '1rem', direction: 'ltr' }}>{formatRecSecs(rec.secs)}</span>
                  <span style={{ color: '#64748b', fontSize: '.82rem', flex: 1 }}>جارٍ تسجيل الصفحة {i + 1}... اقرأ بصوت واضح وهادئ</span>
                  <button type="button" onClick={rec.stop} style={{ ...BTN, border: 'none', background: '#dc2626', color: '#fff' }}>
                    ⏹ إيقاف
                  </button>
                </div>
              </>
            )}

            {/* يُحفظ الآن تلقائياً — أو فشل الحفظ فيبقى التسجيل مع إعادة المحاولة */}
            {isActive && !rec.recording && pending && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontWeight: 800, color: NAVY, fontSize: '.85rem' }}>
                  {busy ? `⏳ جارٍ حفظ «${pending.name}» ${progress ?? 0}%` : `🎙️ ${pending.name} — لم يُحفظ بعد`}
                </div>
                <audio controls src={pending.url} style={{ width: '100%' }} />
                {progress !== null && (
                  <div style={{ height: 10, borderRadius: 99, background: SAND, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: NAVY, transition: 'width .2s' }} />
                  </div>
                )}
                {!busy && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleSavePending} style={{ ...BTN_GOLD, flex: '1 1 180px' }}>
                      🔁 أعد محاولة الحفظ
                    </button>
                    <button type="button" onClick={() => startRecording(i)} style={BTN_LIGHT}>
                      🎙️ أعد التسجيل
                    </button>
                    <button type="button" onClick={() => { closeActive(); setMsg(null); }} style={BTN_LIGHT}>
                      ✖ إلغاء
                    </button>
                  </div>
                )}
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
