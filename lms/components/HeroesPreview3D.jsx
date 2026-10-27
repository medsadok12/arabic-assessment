'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './HeroesPreview.module.css';

export default function HeroesPreview3D({ hero, outfit, action, fallback }) {
  const canvas = useRef(null), stage = useRef(null);
  const latest = useRef({ hero, outfit }); latest.current = { hero, outfit };
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let live = true;
    import('../lib/heroes-preview3d').then(({ createPreviewStage }) => {
      if (!live) return;
      try {
        stage.current = createPreviewStage(canvas.current, { ...latest.current, onFailure: () => live && setStatus('failed') });
        setStatus('ready');
      } catch { setStatus('failed'); }
    }).catch(() => live && setStatus('failed'));
    return () => { live = false; stage.current?.dispose(); stage.current = null; };
  }, []);
  useEffect(() => { stage.current?.update({ hero, outfit, onFailure: () => setStatus('failed') }); }, [hero, outfit]);
  useEffect(() => { if (action?.kind === 'reset') stage.current?.reset(); else stage.current?.play(action?.kind); }, [action]);
  return <div className={styles.stage3d} data-preview-status={status}>
    <canvas ref={canvas} role="img" aria-label="مجسم البطل؛ اسحب لتدويره أو استخدم زري التدوير" style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} />
    {status !== 'ready' && <div className={styles.stageFallback}>{fallback}<span role="status">{status === 'loading' ? 'نجهّز رفيقك…' : 'هذا رسم رفيقك. العرض المجسم غير متاح على هذا الجهاز.'}</span></div>}
    {status === 'ready' && <div className={styles.rotateControls}><button type="button" aria-label="تدوير البطل يمينًا" onClick={() => stage.current?.rotate(-Math.PI / 6)}>↻</button><span>اسحب لتدير بطلك</span><button type="button" aria-label="تدوير البطل يسارًا" onClick={() => stage.current?.rotate(Math.PI / 6)}>↺</button></div>}
  </div>;
}
