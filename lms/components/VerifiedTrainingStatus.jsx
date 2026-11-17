'use client';
export default function VerifiedTrainingStatus({ training, compact = false }) {
  if (!training.note && !training.saved) return null;
  return <div role="status" style={{ width: '100%', maxWidth: 560, margin: compact ? '2px auto' : '8px auto', padding: compact ? '4px 10px' : '10px 12px', boxSizing: 'border-box', borderRadius: 12, background: '#FAF7F1', color: '#1A2B4A', fontSize: compact ? '.78rem' : '.85rem', lineHeight: compact ? 1.5 : 1.8, textAlign: 'center', flexShrink: compact ? 0 : undefined }}>
    {training.note}
    {training.summary?.complete&&training.game!=='word_wheel'&&<div>من أول محاولة: {training.summary.correct} من {training.summary.total}</div>}
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {training.pending && !training.busy && <button type="button" onClick={training.retry} style={button}>أعد تأكيد الحفظ</button>}
      {training.saved && !training.busy && !training.pending && !training.ready && <button type="button" onClick={training.resume} style={button}>أكمل جولتك المحفوظة</button>}
      {training.saved && !training.busy && !training.ready && <button type="button" onClick={() => { training.forget(); location.reload(); }} style={button}>ابدأ جولة جديدة</button>}
      {training.pending && !training.busy && <button type="button" onClick={() => { training.reset(); location.reload(); }} style={button}>العودة للتدريب</button>}
      {!training.ready&&!training.busy&&!training.pending&&training.note&&<button type="button" onClick={()=>location.reload()} style={button}>تحديث المحتوى</button>}
    </div>
  </div>;
}
const button = { minHeight: 44, background: '#fff', border: '1px solid #7C5CD9', borderRadius: 10, padding: '6px 12px', font: 'inherit', color: '#1A2B4A', cursor: 'pointer' };
