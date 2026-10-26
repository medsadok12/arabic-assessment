'use client';
export default function ActivityProgress({ progress, ready, detail = false }) {
  if (!ready) return <span className="lib-activity-progress loading" role="status">نجهّز مسارك…</span>;
  const p = progress || { status: 'unknown', label: 'تعذّر تحميل التقدّم', detail: 'أعد المحاولة لعرض إنجازاتك.' };
  const finite = Number.isInteger(p.total) && p.total > 0;
  return <span className={`lib-activity-progress ${p.status}`}>
    <span className="lib-activity-label">{p.status === 'completed' ? '✓ ' : p.status === 'in-progress' ? '✦ ' : ''}{p.label}</span>
    {finite && <span className="lib-activity-meter" role="progressbar" aria-label="التقدّم في التدريب" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.completed} aria-valuetext={`${p.completed} من ${p.total}`}><span style={{ width: `${p.percent}%` }} /></span>}
    {detail && <span className="lib-activity-detail">{p.detail}</span>}
  </span>;
}
