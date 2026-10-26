import { DISCOVER_BACKGROUNDS, DISCOVER_SUCCESSES, normalizeDiscoverSound } from './discover-objects-sounds';

// مشغّل خاص بالتدريب: خلفية تتوقف أثناء الكلام والنجاح، وصوت كلام واحد فقط.
// لا TTS. generation يحمي من انتهاء/رفض play قديم بعد ضغط زر آخر.
export function createDiscoverAudio(options = {}) {
  const makeAudio = options.makeAudio || (() => new Audio());
  const makeContext = options.makeContext || (() => {
    const Context = window.AudioContext || window.webkitAudioContext;
    return Context ? new Context() : null;
  });
  const later = options.later || setTimeout, cancel = options.cancel || clearTimeout;
  let settings = normalizeDiscoverSound(), context = null, voice = null, background = null, backgroundSource = '';
  let unlocked = false, muted = false, visible = true, disposed = false, foreground = false;
  let generation = 0, bgGeneration = 0, bgTimer = null, endTimer = null;
  const melodyNodes = new Set(), bgNodes = new Set();

  function stopNodes(nodes) {
    for (const node of nodes) { try { node.stop(); } catch {} try { node.disconnect(); } catch {} }
    nodes.clear();
  }
  function stopBackground() {
    bgGeneration++;
    if (bgTimer !== null) { cancel(bgTimer); bgTimer = null; }
    background?.pause(); stopNodes(bgNodes);
  }
  function interrupt() {
    generation++; foreground = false;
    if (endTimer !== null) { cancel(endTimer); endTimer = null; }
    if (voice) { voice.onended = null; voice.onerror = null; voice.pause(); }
    stopNodes(melodyNodes);
  }
  function getContext() {
    if (disposed) return null;
    try {
      context ||= makeContext();
      if (context?.state === 'suspended') context.resume()?.catch(() => {});
      return context;
    } catch { return null; }
  }
  function schedule(track, volume, nodes, start) {
    const ctx = getContext();
    if (!ctx) return 0;
    let time = start ?? ctx.currentTime + .025;
    for (const [note, beats] of track.notes) {
      const length = beats * 60 / track.bpm;
      if (note !== null) {
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.type = track.tone;
        oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
        const peak = volume * .14;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(peak, time + .025);
        gain.gain.exponentialRampToValueAtTime(.0001, time + Math.max(.06, length * .9));
        oscillator.connect(gain); gain.connect(ctx.destination);
        nodes.add(oscillator);
        oscillator.onended = () => { nodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(time); oscillator.stop(time + length);
      }
      time += length;
    }
    return time - (start ?? ctx.currentTime + .025);
  }
  function startBackground() {
    if (disposed || !unlocked || muted || !visible || foreground || settings.background === 'off' || !settings.backgroundVolume) return;
    // لا نعيد بدء الخلفية بسبب كل ضغطة حرف؛ مؤقت واحد أو ملف واحد.
    if (bgTimer !== null || (background && !background.paused)) return;
    if (settings.background === 'custom') {
      if (!settings.backgroundUrl) return;
      background ||= makeAudio();
      if (backgroundSource !== settings.backgroundUrl) { background.src = settings.backgroundUrl; backgroundSource = settings.backgroundUrl; }
      background.loop = true; background.volume = settings.backgroundVolume;
      background.play()?.catch(() => {});
      return;
    }
    const track = DISCOVER_BACKGROUNDS.find(t => t.id === settings.background);
    if (!track) return;
    const token = ++bgGeneration;
    const loop = () => {
      if (disposed || token !== bgGeneration || muted || !visible || foreground) return;
      const seconds = schedule(track, settings.backgroundVolume, bgNodes);
      if (seconds) bgTimer = later(() => { bgTimer = null; loop(); }, (seconds + .35) * 1000);
    };
    loop();
  }
  function complete(token) {
    if (disposed || token !== generation) return;
    if (endTimer !== null) { cancel(endTimer); endTimer = null; }
    if (voice) { voice.onended = null; voice.onerror = null; voice.pause(); }
    foreground = false; startBackground();
  }
  function cue() {
    interrupt(); stopBackground();
    const token = generation;
    if (disposed || muted || !visible || settings.success === 'off' || !settings.successVolume) { startBackground(); return; }
    foreground = true;
    if (settings.success === 'custom') {
      playFile(settings.successUrl, settings.successVolume, token, () => complete(token));
    } else {
      const track = DISCOVER_SUCCESSES.find(t => t.id === settings.success);
      const seconds = track ? schedule(track, settings.successVolume, melodyNodes) : 0;
      if (seconds) endTimer = later(() => complete(token), (seconds + .1) * 1000);
      else complete(token);
    }
  }
  function playFile(url, volume, token, done) {
    if (!url || !volume) { done(); return; }
    voice ||= makeAudio();
    voice.loop = false; voice.volume = volume;
    let finished = false;
    const finish = () => {
      if (finished || disposed || token !== generation) return;
      finished = true;
      if (endTimer !== null) { cancel(endTimer); endTimer = null; }
      voice.onended = null; voice.onerror = null; voice.pause(); done();
    };
    voice.src = url; voice.onended = finish; voice.onerror = finish;
    // ملف مكسور أو اتصال معلّق لا يحجز الموسيقى إلى الأبد.
    endTimer = later(finish, 180000);
    try { voice.play()?.catch(finish); } catch { finish(); }
  }
  function speak(url, kind, celebrate) {
    interrupt(); stopBackground();
    if (disposed || muted || !visible) return;
    unlocked = true;
    getContext(); // فتح AudioContext داخل اللمسة نفسها، قبل انتهاء تسجيل الكلمة.
    const token = generation;
    foreground = true;
    playFile(url, kind === 'word' ? settings.wordVolume : settings.clueVolume, token, () => {
      if (token !== generation || disposed) return;
      if (celebrate) cue(); else complete(token);
    });
  }
  return {
    configure(value) { settings = normalizeDiscoverSound(value) || normalizeDiscoverSound(); interrupt(); stopBackground(); startBackground(); },
    unlock() { if (disposed || muted || !visible) return; unlocked = true; if (settings.background !== 'off') getContext(); startBackground(); },
    playWord(url) { speak(url, 'word', false); },
    playClue(url) { speak(url, 'clue', false); },
    discovered(url) { speak(settings.autoWord ? url : '', 'word', true); },
    playSuccess() { if (!disposed && !muted && visible) { unlocked = true; getContext(); cue(); } },
    stop() { interrupt(); stopBackground(); },
    reset() { interrupt(); stopBackground(); startBackground(); },
    setMuted(value) { if (muted === !!value) return; muted = !!value; interrupt(); stopBackground(); if (!muted) startBackground(); },
    setVisible(value) { if (visible === !!value) return; visible = !!value; interrupt(); stopBackground(); if (visible) startBackground(); },
    destroy() { disposed = true; interrupt(); stopBackground(); if (context?.close) context.close()?.catch(() => {}); },
  };
}
