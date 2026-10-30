'use client';

/*
  معاينة مبسّطة لشكل السؤال — تُظهر المحتوى الفعلي كما سيراه الطالب هيكلياً
  (نص/خيارات/أزواج/مقاطع...)، وليست نسخة مطابقة بكسل للمكوّن الحقيقي في
  تطبيق التقييم (ذاك تطبيق Vite منفصل — ربطه بمعاينة حيّة مطابقة تماماً
  خطوة لاحقة بعد ربط تطبيق التقييم بقاعدة البيانات، القسم 15 من خطة العمل).
  هذه المعاينة كافية للتأكد من صحة المحتوى قبل الحفظ: النص، الخيارات،
  الإجابة الصحيحة، ترتيب العناصر.
*/
export default function QuestionPreview({ type, payload }) {
  const box = { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18, fontFamily: 'Tajawal, sans-serif' };
  const qText = { fontWeight: 800, fontSize: '1.05rem', color: '#1A2B4A', marginBottom: 14 };
  const opt = ok => ({
    display: 'block', width: '100%', textAlign: 'right', padding: '10px 14px', marginBottom: 8,
    borderRadius: 10, border: ok ? '2px solid #2ABB7A' : '1.5px solid #E2E8F0',
    background: ok ? '#EAFBF3' : '#fff', fontWeight: 600,
  });

  if (payload?.text) {
    // fallthrough rendered below per-type
  }

  switch (type) {
    case 'mcq':
    case 'listening-comprehension':
      return (
        <div style={box}>
          {payload.audioText && <div style={{ marginBottom: 10, color: '#7C5CD9', fontWeight: 700 }}>🔊 {payload.audioText}</div>}
          <div style={qText}>{payload.text || '—'}</div>
          {(payload.options || []).map((o, i) => <div key={i} style={opt(!!o.correct)}>{o.text || '—'}</div>)}
        </div>
      );
    case 'listen-choose':
      return (
        <div style={box}>
          <div style={{ marginBottom: 10, color: '#7C5CD9', fontWeight: 700 }}>🔊 {payload.audioText || payload.word}</div>
          <div style={qText}>{payload.text || '—'}</div>
          {(payload.options || []).map((o, i) => <div key={i} style={opt(i === Number(payload.correct))}>{o}</div>)}
        </div>
      );
    case 'matching':
    case 'image-matching':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {(payload.pairs || []).map((p, i) => (
              <div key={i} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem' }}>{p.emoji}</div>
                <div style={{ fontWeight: 700, marginTop: 4 }}>{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'syllable-order':
    case 'syllable-reading':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          {payload.word && <div style={{ marginBottom: 10, color: '#7C5CD9', fontWeight: 700 }}>الكلمة: {payload.word}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(payload.syllables || []).map((s, i) => (
              <span key={i} style={{ background: '#E8B84B33', border: '1.5px solid #E8B84B', borderRadius: 10, padding: '8px 14px', fontWeight: 800, fontSize: '1.1rem' }}>{s}</span>
            ))}
          </div>
        </div>
      );
    case 'dialogue-order':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          {(payload.lines || []).map((l, i) => (
            <div key={i} style={{ marginBottom: 8 }}><strong style={{ color: '#7C5CD9' }}>{l.speaker}:</strong> {l.text}</div>
          ))}
        </div>
      );
    case 'letter-listen-choose':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          {(payload.items || []).map((it, i) => (
            <div key={i} style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800 }}>🔊 {it.letter}</span>
              <span style={{ color: '#64748B' }}>خيارات: {(it.choices || []).join(' / ')}</span>
            </div>
          ))}
        </div>
      );
    case 'listen-speak':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          <ol style={{ paddingInlineStart: 20 }}>
            {(payload.items || []).map((it, i) => <li key={i} style={{ marginBottom: 6 }}>{it.text}</li>)}
          </ol>
        </div>
      );
    case 'speaking':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          <div style={{ fontWeight: 700, color: '#7C5CD9' }}>🎙️ {payload.prompt || '—'}</div>
        </div>
      );
    case 'photo-writing':
      return <div style={box}><div style={qText}>{payload.text || '—'}</div></div>;
    case 'word-order':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {(payload.words || []).map((w, i) => <span key={i} style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '6px 12px' }}>{w}</span>)}
          </div>
          <div style={{ color: '#2ABB7A', fontWeight: 700 }}>✓ {payload.answer}</div>
        </div>
      );
    case 'correction':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          <div style={{ marginBottom: 8, color: '#DC2626' }}>❌ {payload.wrongSentence}</div>
          <div style={{ color: '#2ABB7A', fontWeight: 700 }}>✓ {payload.correctAnswer}</div>
          {payload.hint && <div style={{ marginTop: 8, color: '#64748B' }}>💡 {payload.hint}</div>}
        </div>
      );
    case 'fill':
      return (
        <div style={box}>
          <div style={qText}>{payload.text || '—'}</div>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>{payload.sentence}</div>
          <div style={{ color: '#2ABB7A' }}>الإجابات المقبولة: {(payload.answers || []).join(' / ')}</div>
        </div>
      );
    default:
      return (
        <div style={box}>
          <div style={{ color: '#92400E' }}>تدريب ثابت البنية — لا معاينة محتوى (المحتوى مبرمج داخل تطبيق التقييم نفسه).</div>
        </div>
      );
  }
}
