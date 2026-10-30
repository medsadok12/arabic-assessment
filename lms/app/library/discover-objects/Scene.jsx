'use client';
export function ObjectArt({ object }) {
  if (object.image) return <img src={object.image} alt="" draggable="false" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
  switch (object.art) {
    case 'ball': return <span className="wd-ball-shape" />;
    case 'flower': return <><span className="wd-flower-stem" /><span className="wd-leaf" /><span className="wd-flower-petals" /><span className="wd-flower-center" /></>;
    case 'book': return <span className="wd-book-shape"><b>ع</b></span>;
    case 'bird': return <span className="wd-bird-body"><b /><i /></span>;
    case 'can': return <span className="wd-can-shape"><b /><i /></span>;
    default: return <span>{object.label}</span>;
  }
}
export default function Scene({ scene, onPick, found = [], highlighted, disabled = false }) {
  return <div className="wd-scene" style={{ background: scene.background ? `url("${scene.background}") center / 100% 100% no-repeat` : `linear-gradient(${scene.sky} 0%, #ddf1e6 60%, #b5d297 60%, ${scene.grass} 100%)` }} aria-label={scene.title}>
    {!scene.background && <><div className="wd-sun" aria-hidden="true" /><div className="wd-cloud cloud-a" aria-hidden="true" /><div className="wd-cloud cloud-b" aria-hidden="true" /><div className="wd-hill hill-a" aria-hidden="true" /><div className="wd-hill hill-b" aria-hidden="true" /><div className="wd-fence" aria-hidden="true" /><div className="wd-tree" aria-hidden="true"><div /><span /><b /></div><div className="wd-path" aria-hidden="true" /><div className="wd-bench" aria-hidden="true"><b /><span /></div><div className="wd-grass g-a" aria-hidden="true">⌁</div><div className="wd-grass g-b" aria-hidden="true">⌁</div></>}
    <span className="wd-scene-caption">{scene.title}</span>
    {scene.objects.map(o => <button key={o.id} type="button" disabled={disabled} className={`wd-object wd-${o.art}${highlighted === o.id ? ' hinted' : ''}`} style={{ left: `${o.x}%`, top: `${o.y}%`, right: 'auto', bottom: 'auto', width: `${o.size}%`, height: `${o.size}%`, transform: 'translate(-50%, -50%)' }} aria-label={o.label} onClick={() => onPick(o.id)}><ObjectArt object={o} />{found.includes(o.id) && <span className="wd-object-check">✓</span>}</button>)}
  </div>;
}
