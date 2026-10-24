'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

/* البطل ثلاثي الأبعاد داخل لوحة رسم — يحمّل three.js كسولاً عند الظهور فقط.
   ref ← { jump(), peek(), snapshot() } ليتحكم به الاستوديو. */
const HeroAvatar3D = forwardRef(function HeroAvatar3D({ look, interactive = true, onTap, onReady, label, style }, ref) {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const lookRef = useRef(look);
  const tapRef = useRef(onTap);
  const readyRef = useRef(onReady);
  const [failed, setFailed] = useState(false);
  lookRef.current = look;
  tapRef.current = onTap;
  readyRef.current = onReady;

  useImperativeHandle(ref, () => ({
    jump: () => stageRef.current?.jump(),
    peek: () => stageRef.current?.peek(),
    snapshot: (size) => stageRef.current?.snapshot(size) ?? null,
  }), []);

  useEffect(() => {
    let alive = true;
    import('../lib/hero-avatar3d').then(({ createHeroStage, webglAvailable }) => {
      if (!alive || !canvasRef.current) return;
      if (!webglAvailable()) { setFailed(true); return; }
      try {
        stageRef.current = createHeroStage(canvasRef.current, {
          look: lookRef.current, interactive, onTap: () => tapRef.current?.(),
        });
        readyRef.current?.();
      } catch { setFailed(true); }
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; stageRef.current?.dispose(); stageRef.current = null; };
  }, [interactive]);

  useEffect(() => { stageRef.current?.setLook(look); }, [look]);

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
