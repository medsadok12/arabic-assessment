// The animal mascot is an independent sprite: missing or blocked audio must not
// delay its appearance. Each audio element still belongs to only one run.
const owners = new WeakMap();

export function playAnimalFahimCelebration(media, {
  isCurrent = () => true, onReady, onFade, onFinish,
  durationMs = 3000, fadeMs = 400, timeoutMs = 4500,
} = {}) {
  const audio = media && typeof media.play === 'function' ? media : null;
  if (audio) owners.get(audio)?.();
  let cancelled = false, fading = false, started = false, unavailable = false;
  let fallback = null;
  const timers = new Set();
  const shownAt = Date.now();
  const current = () => !cancelled && (!audio || owners.get(audio) === cancel) && isCurrent();
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.clear();
    fallback = null;
  };
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (current()) fn();
      else cancel();
    }, Math.max(0, ms));
    timers.add(id);
    return id;
  };
  const pause = () => { try { audio?.pause(); } catch {} };
  // A play promise may settle after cancellation. Stop that late playback only
  // when no newer run owns the same element.
  const pauseLatePlayback = () => {
    if (audio && (!owners.has(audio) || owners.get(audio) === cancel)) pause();
  };
  function cancel() {
    if (cancelled) return;
    cancelled = true;
    clearTimers();
    if (audio) {
      audio.removeEventListener('playing', playing);
      audio.removeEventListener('ended', ended);
      audio.removeEventListener('error', failed);
      if (owners.get(audio) === cancel) {
        owners.delete(audio);
        pause();
      }
    }
  }
  function finish() {
    if (!current()) { cancel(); return; }
    cancel();
    onFinish?.();
  }
  function fade() {
    if (!current()) { cancel(); return; }
    if (fading) return;
    fading = true;
    clearTimers();
    // This also stops a stalled recording before the watchdog's visual exit.
    pause();
    onFade?.();
    if (current()) later(finish, fadeMs);
  }
  function playing() {
    if (!current()) { cancel(); pauseLatePlayback(); return; }
    if (fading || unavailable) { pause(); return; }
    if (started) return;
    started = true;
    if (fallback !== null) { clearTimeout(fallback); timers.delete(fallback); fallback = null; }
    // Count from real playback, not from the click or a pending play promise.
    later(fade, timeoutMs);
  }
  function ended() {
    if (!current()) { cancel(); return; }
    if (!unavailable) fade();
  }
  function failed() {
    if (!current()) { cancel(); return; }
    if (fading || unavailable) return;
    unavailable = true;
    clearTimers();
    pause();
    // Preserve the ordinary sprite duration if sound fails partway through.
    fallback = later(fade, durationMs - (Date.now() - shownAt));
  }

  if (audio) {
    owners.set(audio, cancel);
    audio.addEventListener('playing', playing);
    audio.addEventListener('ended', ended);
    audio.addEventListener('error', failed);
  }
  if (!current()) { cancel(); return cancel; }
  fallback = later(fade, durationMs);
  onReady?.();
  if (!current()) { cancel(); return cancel; }
  if (audio) {
    // A not-yet-loaded recording may reject seeking without rejecting playback.
    try { audio.currentTime = 0; } catch {}
    try {
      audio.muted = false;
      audio.play()?.then(() => {
        if (!current()) { cancel(); pauseLatePlayback(); return; }
        // Some already-unlocked browsers resolve play without another event.
        if (!audio.paused && !audio.ended) playing();
      }, failed);
    } catch { failed(); }
  }
  return cancel;
}
