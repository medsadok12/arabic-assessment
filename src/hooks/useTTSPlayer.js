import { useState, useEffect, useCallback } from 'react';
import { createTTSPlayer } from '../utils/ttsPlayer.js';

/**
 * يلخّص النمط المتكرر حرفياً عبر خمسة مكوّنات صوتية (LetterListenChoose،
 * ListenChoose، AudioQuestion، ListenSpeak، ListeningComprehension): إنشاء
 * مشغّل واحد لكل مكوّن، إيقافه عند تفكيك المكوّن، وتتبّع حالتَي "قيد
 * التشغيل" و"فشل الشبكة" حول كل استدعاء. أي تحسين مستقبلي لهذا السلوك
 * (كإضافة إعادة محاولة تلقائية) يُعدَّل هنا مرة واحدة بدل خمس مرات منفصلة.
 */
export function useTTSPlayer() {
  const [player] = useState(() => createTTSPlayer());
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);

  useEffect(() => () => { player.stop(); }, [player]);

  // كلتا الدالتين تُرجعان true/false (نجاح/فشل) بدل رمي استثناء — بعض
  // المستدعين (مثل عدّاد محاولات الاستماع) يحتاجون التمييز بين النجاح
  // والفشل دون الحاجة لـtry/catch خاص بهم حول كل استدعاء.
  async function playOnce(text) {
    setPlaying(true);
    setAudioError(false);
    try {
      await player.playOnce(text);
      return true;
    } catch {
      setAudioError(true);
      return false;
    } finally {
      setPlaying(false);
    }
  }

  async function playRepeated(text, times, gapMs, onProgress) {
    setPlaying(true);
    setAudioError(false);
    try {
      await player.playRepeated(text, times, gapMs, onProgress);
      return true;
    } catch {
      setAudioError(true);
      return false;
    } finally {
      setPlaying(false);
    }
  }

  const resetError = useCallback(() => setAudioError(false), []);

  // يوقف أي تشغيل جارٍ فوراً *ويعكس ذلك في playing* — عكس استدعاء
  // player.stop() مباشرة، الذي يوقف الصوت لكن لا يلمس حالة React إطلاقاً.
  const stop = useCallback(() => {
    player.stop();
    setPlaying(false);
  }, [player]);

  return { playing, audioError, playOnce, playRepeated, resetError, stop };
}
