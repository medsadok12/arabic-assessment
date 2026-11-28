// Letter Catcher owns one word at a time. Other exercises' speech is never
// cancelled to make room for our fallback; we wait for an idle speech queue.
let activeWord = null;

export const LC_SUCCESS_SOUND = '/sounds/letter-catcher-carnival-win.mp3';

// Start inside the answer tap. Reuse the unlocked element for pronunciation on
// mobile. Only completing the word satisfies onComplete; the cue cannot unlock
// progression. Both parts share one cancellation.
export function playLetterCatcherSuccess({ audio, text, url, onComplete, onUnavailable }) {
  if (!audio) return playLetterCatcherWord({ text, url, onComplete, onUnavailable });

  let playingCue = true;
  let stopWord;
  const timeout = setTimeout(readWord, 3500);
  function stopCue() {
    playingCue = false;
    clearTimeout(timeout);
    audio.removeEventListener('ended', readWord);
    audio.removeEventListener('error', readWord);
    try { audio.pause(); } catch {}
  }
  function readWord() {
    if (!playingCue) return;
    stopCue();
    audio.src = url;
    stopWord = playLetterCatcherWord({ text, url, audio, onComplete, onUnavailable });
  }
  audio.addEventListener('ended', readWord);
  audio.addEventListener('error', readWord);
  try {
    if (audio.getAttribute('src') !== LC_SUCCESS_SOUND) audio.src = LC_SUCCESS_SOUND;
    audio.muted = false;
    audio.loop = false;
    try { audio.currentTime = 0; } catch {}
    audio.play()?.catch(readWord);
  } catch { readWord(); }
  return () => {
    if (playingCue) stopCue();
    stopWord?.();
  };
}

export function playLetterCatcherWord({ text, url, audio: prepared, onEnd, onStart, onComplete, onUnavailable } = {}) {
  activeWord?.();
  let active = true, mode = 'audio', started = false, notified = false;
  let audio = prepared, synth = null, utterance = null, submitted = false;
  let startupTimer = null, voiceTimer = null, idleTimer = null, needsRewind = false;
  const timers = new Set();
  const later = (fn, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (active) fn(); }, delay);
    timers.add(timer);
    return timer;
  };
  const clearTimer = timer => { clearTimeout(timer); timers.delete(timer); };
  const clearVoiceWait = () => {
    clearTimer(voiceTimer); clearTimer(idleTimer);
    voiceTimer = idleTimer = null;
    synth?.removeEventListener?.('voiceschanged', trySpeech);
  };
  const detachAudio = () => {
    audio?.removeEventListener?.('playing', audioStarted);
    audio?.removeEventListener?.('ended', audioEnded);
    audio?.removeEventListener?.('error', fallback);
    audio?.removeEventListener?.('loadedmetadata', rewind);
  };
  function cancel() {
    if (!active) return;
    active = false;
    if (activeWord === cancel) activeWord = null;
    timers.forEach(clearTimeout); timers.clear();
    clearVoiceWait(); detachAudio();
    try { audio?.pause(); } catch {}
    if (utterance) utterance.onstart = utterance.onend = utterance.onerror = null;
    // Web Speech has no per-utterance stop. Only cancel after this run submitted
    // its own utterance into an idle queue, never while merely waiting for voices.
    if (submitted) { submitted = false; try { synth?.cancel(); } catch {} }
  }
  function finish(completed = false) {
    if (!active) return;
    cancel();
    if (completed) onComplete?.();
    else onUnavailable?.();
    onEnd?.();
  }
  function markStarted() {
    if (!active) return;
    started = true;
    clearTimer(startupTimer); startupTimer = null;
    if (!notified) { notified = true; onStart?.(); }
  }
  function audioStarted() { if (mode === 'audio') markStarted(); }
  function audioEnded() {
    if (active && mode === 'audio') finish(started || audio.currentTime > 0);
  }
  function rewind() {
    if (!active || mode !== 'audio' || !needsRewind) return;
    try { audio.currentTime = 0; needsRewind = false; } catch {}
  }
  function trySpeech() {
    if (!active || mode !== 'speech-wait') return;
    clearVoiceWait();
    if (synth.speaking || synth.pending) {
      idleTimer = later(trySpeech, 100);
      return;
    }
    mode = 'speech';
    try {
      const Utterance = window.SpeechSynthesisUtterance || globalThis.SpeechSynthesisUtterance;
      utterance = new Utterance(text);
      utterance.lang = 'ar-SA'; utterance.rate = 0.82;
      const voice = synth.getVoices().find(v => v.lang?.startsWith('ar'));
      if (voice) utterance.voice = voice;
      utterance.onstart = () => { if (active && mode === 'speech') markStarted(); };
      const speechEnded = () => {
        if (!active || mode !== 'speech') return;
        submitted = false; // The queue may already be starting someone else's speech.
        finish(started);
      };
      utterance.onend = speechEnded;
      utterance.onerror = () => {
        if (!active || mode !== 'speech') return;
        submitted = false;
        finish();
      };
      submitted = true;
      synth.speak(utterance);
    } catch { submitted = false; finish(); }
  }
  function fallback() {
    if (!active || mode !== 'audio') return;
    mode = 'speech-wait'; started = false;
    clearTimer(startupTimer); detachAudio();
    try { audio?.pause(); } catch {}
    if (typeof window === 'undefined' || !window.speechSynthesis || !text ||
        !(window.SpeechSynthesisUtterance || globalThis.SpeechSynthesisUtterance)) {
      finish(); return;
    }
    synth = window.speechSynthesis;
    // This is a startup watchdog, not a maximum word length. Never cut speech
    // already in progress, including browsers that omit the start event.
    startupTimer = later(() => {
      if (submitted && synth.speaking) markStarted();
      else finish();
    }, 6000);
    try {
      if (synth.getVoices().length) trySpeech();
      else {
        synth.addEventListener?.('voiceschanged', trySpeech);
        voiceTimer = later(trySpeech, 500);
      }
    } catch { finish(); }
  }

  activeWord = cancel;
  try {
    if (!audio) {
      const AudioClass = typeof window === 'undefined' ? null : (window.Audio || globalThis.Audio);
      if (!AudioClass || !url) { fallback(); return cancel; }
      audio = new AudioClass(url);
    }
    audio.muted = false; audio.loop = false;
    try { audio.currentTime = 0; } catch { needsRewind = true; }
    audio.addEventListener('playing', audioStarted);
    audio.addEventListener('ended', audioEnded);
    audio.addEventListener('error', fallback);
    audio.addEventListener('loadedmetadata', rewind);
    startupTimer = later(() => {
      if (started) return;
      if (!audio.paused && !audio.ended && audio.currentTime > 0) markStarted();
      else fallback();
    }, 6000);
    // Keep this call synchronous so a direct click can unlock playback.
    audio.play()?.then(() => {
      if (active && mode === 'audio' && !audio.paused && !audio.ended) markStarted();
    }, fallback);
  } catch { fallback(); }
  return cancel;
}
