import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * يلخّص دورة حياة تسجيل صوت واحد عبر MediaRecorder — مستخرَج من نسختين
 * شبه متطابقتين كانتا مكرَّرتين في AudioQuestion وListenSpeak (وغائبة كلياً
 * عن OralAssessment). لا يرفع التسجيل تلقائياً — `onStop` (إن مُرِّر) يُستدعى
 * من داخل معالج حدث `MediaRecorder.onstop` نفسه (لا من useEffect)، فيستطيع
 * المستدعي بدء الرفع فوراً دون كسر قاعدة "لا setState متزامن داخل effect".
 */
export function useAudioRecorder({ onStop } = {}) {
  const [recording, setRecording] = useState(false);
  const [audioUrl,  setAudioUrl]  = useState(null);
  const [micError,  setMicError]  = useState(false);
  const [noSupport, setNoSupport] = useState(false);

  const recRef    = useRef(null);
  const chunksRef = useRef([]);
  const blobRef   = useRef(null);
  const onStopRef = useRef(onStop);

  useEffect(() => { onStopRef.current = onStop; });

  useEffect(() => () => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setMicError(false);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNoSupport(true);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      recRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        onStopRef.current?.(blob, url);
      };

      mr.start(200);
      blobRef.current = null;
      setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      setRecording(true);
      return true;
    } catch {
      setMicError(true);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
  }, []);

  const reset = useCallback(() => {
    setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    blobRef.current = null;
    setMicError(false);
  }, []);

  const getBlob = useCallback(() => blobRef.current, []);

  return { recording, audioUrl, micError, noSupport, start, stop, reset, getBlob };
}
