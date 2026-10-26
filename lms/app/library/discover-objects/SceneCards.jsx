'use client';
import { useEffect, useRef } from 'react';
import { Check, Lock, Sparkles } from 'lucide-react';
import { discoverSceneCover } from '../../../lib/discover-objects-journey';

export default function SceneCards({ scenes, journey, active, onSelect, ready, staff, preview, onPreview }) {
  const grid = useRef(null);
  useEffect(() => {
    const row = grid.current, card = row?.querySelector('[aria-current="step"]');
    if (!card) return;
    const bounds = row.getBoundingClientRect(), tile = card.getBoundingClientRect();
    if (tile.left < bounds.left) row.scrollBy({ left: tile.left - bounds.left });
    else if (tile.right > bounds.right) row.scrollBy({ left: tile.right - bounds.right });
  }, [active]);
  return <section className="wd-scene-cards" aria-label="اختر مشهدك">
    <div className="wd-world-heading"><div><h2>رحلتي مع فهيم</h2><p>أكمل ألغاز المشهد لتفتح مغامرتك التالية.</p></div>{staff && <button type="button" className="wd-preview-worlds" aria-pressed={preview} onClick={onPreview}><Sparkles size={15} />{preview ? 'العودة لمسار الطالب' : 'معاينة كل المشاهد'}</button>}</div>
    <div className="wd-world-grid" ref={grid}>{scenes.map((scene, i) => {
      const state = journey.find(s => s.id === scene.id);
      const locked = !ready || !state?.unlocked;
      return <button type="button" key={scene.id} className={`wd-world-card${active === scene.id ? ' current' : ''}${locked ? ' locked' : ''}${state?.complete ? ' complete' : ''}`} disabled={locked} aria-current={active === scene.id ? 'step' : undefined} aria-label={`${scene.title}، المشهد ${i + 1}${locked ? '، مقفل' : state?.complete ? '، مكتمل' : '، مفتوح'}`} onClick={() => onSelect(scene.id)}>
        <span className="wd-world-picture"><img src={discoverSceneCover(scene)} alt="" loading="lazy" decoding="async" onError={e => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = '/faheem.png'; } }} /><span className="wd-world-number">{i + 1}</span>{locked ? <span className="wd-world-state"><Lock size={14} /></span> : state?.complete ? <span className="wd-world-state done"><Check size={15} /></span> : null}</span>
        <span className="wd-world-name">{scene.title}</span><span className="wd-world-status">{!ready ? 'نجهّز مسارك…' : locked ? 'أكمل المشهد السابق' : state?.complete ? 'أحسنت، مكتمل!' : active === scene.id ? 'أنت هنا' : 'هيا نكتشف'}</span>
      </button>;
    })}</div>
    {preview && <p className="wd-world-preview-note">معاينة المعلم: المشاهد مفتوحة للتجربة، دون نقاط أو حفظ إنجازات للطلاب.</p>}
  </section>;
}
