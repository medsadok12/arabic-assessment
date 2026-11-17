// Each video has one owner: a late play() rejection must never affect a newer round.
const owners = new WeakMap();

export function playCelebrationVideo(video, {
  isCurrent = () => true, onReady, onFinish, onFade,
  durationMs = 3000, fadeMs = 400, timeoutMs = 5000,
} = {}) {
  owners.get(video)?.();
  let cancelled = false, ready = false, frameId = null, frameFallback = null, watchdog;
  const timers = new Set();
  const current = () => !cancelled && owners.get(video) === cancel && isCurrent();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); if (current()) fn(); }, ms);
    timers.add(id);
    return id;
  };
  function cancel() {
    if (cancelled) return;
    cancelled = true;
    timers.forEach(clearTimeout);
    timers.clear();
    video.removeEventListener('playing', playing);
    video.removeEventListener('ended', finish);
    video.removeEventListener('error', finish);
    if (frameId !== null) video.cancelVideoFrameCallback?.(frameId);
    if (owners.get(video) === cancel) {
      owners.delete(video);
      video.pause();
    }
  }
  function finish() {
    if (!current()) return;
    cancel();
    onFinish?.();
  }
  function firstFrame() {
    if (!current() || ready) return;
    ready = true;
    if (frameId !== null) video.cancelVideoFrameCallback?.(frameId);
    frameId = null;
    clearTimeout(frameFallback);
    timers.delete(frameFallback);
    clearTimeout(watchdog);
    timers.delete(watchdog);
    onReady?.();
    if (!current()) return;
    later(() => onFade?.(), Math.max(0, durationMs - fadeMs));
    later(finish, durationMs);
  }
  const hasCurrentFrame = () => !video.paused && !video.ended && !video.seeking && video.readyState >= 2;
  function playing() {
    if (!current() || ready || frameFallback !== null) return;
    // Hidden media may not receive a frame callback. Only reveal its decoded current
    // frame once playback is active; never use loadeddata or play() alone as readiness.
    frameFallback = later(() => {
      frameFallback = null;
      if (hasCurrentFrame()) firstFrame();
    }, 200);
    // `playing` alone may precede the first decoded frame on a cold load.
    if (typeof video.requestVideoFrameCallback === 'function') {
      try {
        if (frameId === null) frameId = video.requestVideoFrameCallback(() => { frameId = null; firstFrame(); });
      }
      catch { /* The bounded current-frame fallback still applies. */ }
    } else if (hasCurrentFrame()) firstFrame();
  }
  function play(muted) {
    if (!current()) return;
    video.muted = muted;
    const failed = error => {
      if (!current()) return;
      if (!muted && error?.name === 'NotAllowedError') play(true);
      else finish();
    };
    try {
      video.play()?.then(() => {
        // An already-playing warmup does not necessarily emit another playing event.
        if (current() && !video.paused && !video.ended) playing();
      }, failed);
    }
    catch (error) { failed(error); }
  }
  owners.set(video, cancel);
  video.addEventListener('playing', playing);
  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  watchdog = later(finish, timeoutMs);
  play(false);
  return cancel;
}
