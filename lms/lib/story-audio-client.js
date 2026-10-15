'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { STORY_AUDIO_MAX_MB, normalizeStoryAudioType } from './story-audio';

/* ════════════════════════════════════════════════════════════════
   صوت صفحات القصص — مساعدات المتصفح المشتركة
   تستخدمها لوحة الأصوات في bogga (StoryAudioPanel) وحقل صوت الصفحة في
   محرر القصص الكامل (StoryPageAudioField) — مصدر واحد للتسجيل والرفع.
════════════════════════════════════════════════════════════════ */

export const STORY_AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac';

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

export const formatRecSecs = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* يُرجع رسالة خطأ ودودة أو null إن كان الملف مقبولاً */
export function checkStoryAudioFile(file) {
  if (!normalizeStoryAudioType(file.type, file.name))
    return `«${file.name}» ليس ملفاً صوتياً مدعوماً — اختر MP3 أو M4A أو WAV أو WEBM أو OGG`;
  if (file.size > STORY_AUDIO_MAX_MB * 1024 * 1024)
    return `«${file.name}» أكبر من ${STORY_AUDIO_MAX_MB}MB`;
  return null;
}

/* رفع صوت صفحة: رابط موقَّع ثم PUT مباشر إلى Supabase Storage، يُرجع الرابط العام.
   storyId = null لقصة جديدة لم تُحفظ بعد. */
export async function uploadStoryPageAudio(storyId, page, blob, onProgress) {
  const res = await fetch('/api/stories/audio-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId: storyId || null, page, type: blob.type, fileName: blob.name || '' }),
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

/* دورة حياة التسجيل من الميكروفون.
   start(onDone) يُرجع رسالة خطأ أو null؛ onDone(blob) عند الإيقاف بتسجيل غير فارغ.
   يوقف الميكروفون تلقائياً عند الوصول للحد الأقصى أو عند إزالة المكوّن. */
export function useStoryAudioRecorder(maxSecs = 10 * 60) {
  const [recording, setRecording] = useState(false);
  const [secs,      setSecs]      = useState(0);
  const recorderRef = useRef(null);
  const streamRef   = useRef(null);
  const timerRef    = useRef(null);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    setRecording(false);
  }, []);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const start = async (onDone) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
      return 'هذا المتصفح لا يدعم التسجيل الصوتي — جرّب Chrome أو Safari حديثاً، أو ارفع ملفاً صوتياً';
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return 'تعذّر الوصول إلى الميكروفون — اسمح للمتصفح باستخدامه ثم أعد المحاولة';
    }
    streamRef.current = stream;
    const chunks   = [];
    const mimeType = pickRecorderType();
    const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const type = (mr.mimeType || mimeType || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks, { type });
      onDone(blob.size > 0 ? blob : null);
    };
    recorderRef.current = mr;
    mr.start(1000);
    setRecording(true);
    setSecs(0);
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setSecs(s);
      if (s >= maxSecs) stop();
    }, 1000);
    return null;
  };

  return { recording, secs, start, stop };
}
