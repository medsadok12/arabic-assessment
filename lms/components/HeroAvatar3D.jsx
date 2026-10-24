'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

/* البطل ثلاثي الأبعاد داخل لوحة رسم — يحمّل three.js كسولاً عند الظهور فقط.
   level: مستوى الطالب (منصة البطل)، letters: الحروف المتقنة (هالة الحروف).
   ref ← { jump, peek, wave, emote, special, eggProgress, hatch, snapshot, portraits, poster } ليتحكم به الاستوديو. */
const HeroAvatar3D = forwardRef(function HeroAvatar3D({ look, level = 0, letters, interactive = true, onTap, onReady, label, style }, ref) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const init = useRef({ look, level, letters });
  const tapRef = useRef(onTap);
  const readyRef = useRef(onReady);
  const [failed, setFailed] = useState(false);
  init.current = { look, level, letters };
  tapRef.current = onTap;
  readyRef.current = onReady;

  useImperativeHandle(ref, () => {
    const s = () => stageRef.current;
    return {
      jump: () => s()?.jump(),
      peek: () => s()?.peek(),
      wave: () => s()?.wave(),
      emote: (id) => s()?.emote(id),
      special: () => s()?.special(),
      eggProgress: (f) => s()?.eggProgress(f),
      hatch: (cb) => (s() ? s().hatch(cb) : cb?.()),
      snapshot: (size) => s()?.snapshot(size) ?? null,
      portraits: (base, size) => s()?.portraits(base, size) ?? {},
      poster: (opts) => s()?.poster(opts) ?? null,
    };
  }, []);

  useEffect(() => {
    let alive = true;
    import('../lib/hero-avatar3d').then(({ createHeroStage, webglAvailable }) => {
      if (!alive || !canvasRef.current) return;
      if (!webglAvailable()) { setFailed(true); return; }
      try {
        const { look: l0, level: lv0, letters: lt0 } = init.current;
        stageRef.current = createHeroStage(canvasRef.current, {
          look: l0, level: lv0, letters: lt0, interactive, onTap: () => tapRef.current?.(),
        });
        readyRef.current?.();
      } catch { setFailed(true); }
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; stageRef.current?.dispose(); stageRef.current = null; };
  }, [interactive]);

  useEffect(() => { stageRef.current?.setLook(look); }, [look]);
  useEffect(() => { stageRef.current?.setLevel(level); }, [level]);
  useEffect(() => { stageRef.current?.setLetters(letters); }, [letters]);

  if (failed) {
    return (
      <div role="img" aria-label={label} style={{ ...style, display: 'grid', placeItems: 'center', textAlign: 'center', fontFamily: 'Cairo, sans-serif', color: '#52627E', fontWeight: 800 }}>
        <div><div style={{ fontSize: 64, lineHeight: 1.2 }}>🦸</div>بَطَلُكَ يَنْتَظِرُكَ هُنَا!</div>
      </div>
    );
  }
  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: interactive ? 'pan-y' : 'auto', cursor: interactive ? 'grab' : 'pointer', ...style }}
    />
  );
});

export default HeroAvatar3D;
