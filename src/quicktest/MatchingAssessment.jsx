import { useState } from 'react';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * مكوّن مطابقة عام قابل لإعادة الاستخدام (التدريبان الثاني والثالث في
 * الاختبار الترويجي) — يعرض عموداً للصور وعموداً للكلمات، كل منهما بترتيب
 * عشوائي مستقل، ويربط الطفل بينهما بالنقر المتتابع (صورة ثم كلمة، أو
 * العكس). لا خطوط SVG بين البطاقات — بدلاً من ذلك تُستخدَم نفس آلية
 * "التظليل المحايد" المعتمدة أصلاً في QuickQuestion.jsx (نفس حدود/خلفية
 * الخيار المُختار) للإشارة للربط، وهو البديل الذي طرحه الأستاذ محمد صراحةً
 * في المواصفات ("أو يتغير لون خلفية البطاقتين بنفس اللون"). هذا يتجنّب
 * عمداً اختراع لون منفصل لكل زوج (خارج اللوحة الخماسية المعتمدة، القسم 2.1
 * من CLAUDE.md) وتعقيد حساب إحداثيات خطوط بين عمودين متجاوبين على الجوال.
 *
 * قاعدة "صفر إحباط": لا يظهر أي مؤشر صح/خطأ أثناء اللعب مهما كان الربط —
 * الصحة تُحسَب بصمت فقط عند "متابعة" (كل صورة "صحيحة" إن رُبطت بكلمتها
 * الأصلية في `pairs`، بما أن كل عنصر يحمل زوجه الصحيح أصلاً) وتُمرَّر عبر
 * onComplete بنفس شكل AlphabetGridAssessment.jsx (correctWords/
 * needsReviewWords) ليعرضها LeadDetailsModal بنفس الأسلوب.
 */
export default function MatchingAssessment({ pairs, title, subtitle, label, questionId, skillTag, onComplete }) {
  const [imageOrder] = useState(() => shuffle(pairs.map((_, i) => i)));
  const [wordOrder]  = useState(() => shuffle(pairs.map((_, i) => i)));

  const [selected, setSelected] = useState(null); // { type:'image'|'word', idx }
  const [links, setLinks] = useState({}); // { [imageIdx]: wordIdx }

  const linkedCount = Object.keys(links).length;
  const allLinked = linkedCount === pairs.length;

  function imageIsLinked(imageIdx) {
    return links[imageIdx] !== undefined;
  }
  function imageLinkedToWord(wordIdx) {
    const entry = Object.entries(links).find(([, w]) => w === wordIdx);
    return entry ? Number(entry[0]) : null;
  }

  function formLink(imageIdx, wordIdx) {
    setLinks(prev => {
      const next = { ...prev };
      delete next[imageIdx];
      for (const k of Object.keys(next)) {
        if (next[k] === wordIdx) delete next[k];
      }
      next[imageIdx] = wordIdx;
      return next;
    });
  }

  function unlinkImage(imageIdx) {
    setLinks(prev => {
      const next = { ...prev };
      delete next[imageIdx];
      return next;
    });
  }

  // النقر على عنصر مربوط بالفعل يُلغي الربط فوراً (تغيير سهل للإجابة).
  // النقر على عنصر غير مربوط بلا تحديد سابق يحدّده وينتظر الطرف الآخر.
  function tapImage(imageIdx) {
    if (imageIsLinked(imageIdx)) { unlinkImage(imageIdx); setSelected(null); return; }
    if (selected?.type === 'word') { formLink(imageIdx, selected.idx); setSelected(null); return; }
    setSelected(prev => (prev?.type === 'image' && prev.idx === imageIdx) ? null : { type: 'image', idx: imageIdx });
  }

  function tapWord(wordIdx) {
    const linkedImage = imageLinkedToWord(wordIdx);
    if (linkedImage !== null) { unlinkImage(linkedImage); setSelected(null); return; }
    if (selected?.type === 'image') { formLink(selected.idx, wordIdx); setSelected(null); return; }
    setSelected(prev => (prev?.type === 'word' && prev.idx === wordIdx) ? null : { type: 'word', idx: wordIdx });
  }

  function handleContinue() {
    const correctWords = [];
    const needsReviewWords = [];
    pairs.forEach((p, i) => {
      if (links[i] === i) correctWords.push(p.word);
      else needsReviewWords.push(p.word);
    });
    onComplete({ type: 'matching', questionId, skillTag, label, correctWords, needsReviewWords });
  }

  const cardBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '14px 10px', borderRadius: 14, cursor: 'pointer',
    border: '2px solid var(--border)', background: '#fff',
    transition: 'all .15s', textAlign: 'center', minHeight: 64,
  };

  function activeStyle(isActive) {
    return isActive
      ? { border: '2.5px solid var(--primary)', background: '#efe9f9', boxShadow: '0 0 10px rgba(26,43,74,.22)' }
      : {};
  }

  return (
    <div className="page-content">
      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 6 }}>
        {label}
      </p>
      <h2 className="page-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>{title}</h2>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>{subtitle}</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {imageOrder.map(idx => {
            const active = imageIsLinked(idx) || (selected?.type === 'image' && selected.idx === idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => tapImage(idx)}
                aria-label={`صورة: ${pairs[idx].word}`}
                style={{ ...cardBase, ...activeStyle(active), fontSize: 'clamp(1.8rem, 8vw, 2.4rem)' }}
              >
                {pairs[idx].emoji}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {wordOrder.map(idx => {
            const active = imageLinkedToWord(idx) !== null || (selected?.type === 'word' && selected.idx === idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => tapWord(idx)}
                style={{ ...cardBase, ...activeStyle(active), fontSize: 'clamp(.95rem, 4vw, 1.1rem)', fontWeight: 800 }}
              >
                {pairs[idx].word}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 16 }}>
        تم ربط {linkedCount} من {pairs.length}
      </p>

      <button className="btn-primary" type="button" onClick={handleContinue} disabled={!allLinked}>
        متابعة ←
      </button>
    </div>
  );
}
