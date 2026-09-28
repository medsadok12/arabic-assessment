import { useState, useRef } from 'react';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ستة ألوان باستيل هادئة مخصَّصة حصراً لتمييز أزواج الربط هنا — بطلب صريح
// من الأستاذ محمد ("بطاقة الماء ونقطة الماء تتحولان معاً لنفس اللون")،
// وهو الاستثناء الصريح الذي تسمح به قاعدة اللوحة الخماسية في القسم 2.1 من
// CLAUDE.md. اللون يُحدَّد بترتيب إنشاء الربط (لا بمعرّف الزوج الصحيح)،
// فزوج خاطئ يحصل أيضاً على لون مشترك — لا علاقة للون بصحة الإجابة إطلاقاً،
// حفاظاً على قاعدة "صفر إحباط".
const LINK_PALETTE = [
  { bg: '#eaf6ff', border: '#7dc4f0' },
  { bg: '#eafbf3', border: '#7fdfb0' },
  { bg: '#f4f1fb', border: '#b9a8e8' },
  { bg: '#fff4e6', border: '#f5b878' },
  { bg: '#fdeef3', border: '#f0a8c4' },
  { bg: '#e8faf7', border: '#7ddfd0' },
];

/**
 * مكوّن مطابقة عام قابل لإعادة الاستخدام (التدريبان الثاني والثالث في
 * الاختبار الترويجي) — يعرض عموداً للصور وعموداً للكلمات، كل منهما بترتيب
 * عشوائي مستقل، ويربط الطفل بينهما بالنقر المتتابع. لا خطوط SVG بين
 * البطاقات (تعقيد غير ضروري لعمودين متجاوبين مستقلَّي الترتيب على الجوال)
 * — الربط يُعرَض بدلاً من ذلك بتلوين مشترك (LINK_PALETTE أعلاه) لبطاقتَي
 * الصورة والكلمة معاً، بالضبط كما طلب الأستاذ محمد صراحةً في هذه الدفعة.
 * أيقونة 🔗 في منتصف الشبكة زخرفية بحتة (تعبّر عن فكرة الربط عموماً) — لا
 * تشير لصف بعينه، لأن ترتيب عمودَي الصور والكلمات مستقل ومختلط، فلا يوجد
 * "صف" واحد يقابل زوجاً فعلياً لتُميَّزه.
 *
 * قاعدة "صفر إحباط": لا يظهر أي مؤشر صح/خطأ أثناء اللعب مهما كان الربط —
 * الصحة تُحسَب بصمت فقط عند "متابعة" وتُمرَّر عبر onComplete بنفس شكل
 * AlphabetGridAssessment.jsx (correctWords/needsReviewWords).
 */
export default function MatchingAssessment({ pairs, title, subtitle, label, questionId, skillTag, onComplete }) {
  const [imageOrder] = useState(() => shuffle(pairs.map((_, i) => i)));
  const [wordOrder]  = useState(() => shuffle(pairs.map((_, i) => i)));

  const [selected, setSelected] = useState(null); // { type:'image'|'word', idx }
  const [links, setLinks] = useState({}); // { [imageIdx]: { wordIdx, colorIdx } }
  const nextColorSeq = useRef(0);

  const linkedCount = Object.keys(links).length;
  const allLinked = linkedCount === pairs.length;

  function imageIsLinked(imageIdx) {
    return links[imageIdx] !== undefined;
  }
  function findLinkForWord(wordIdx) {
    const entry = Object.entries(links).find(([, v]) => v.wordIdx === wordIdx);
    return entry ? { imageIdx: Number(entry[0]), ...entry[1] } : null;
  }

  function formLink(imageIdx, wordIdx) {
    const colorIdx = nextColorSeq.current % LINK_PALETTE.length;
    nextColorSeq.current += 1;
    setLinks(prev => {
      const next = { ...prev };
      delete next[imageIdx];
      for (const k of Object.keys(next)) {
        if (next[k].wordIdx === wordIdx) delete next[k];
      }
      next[imageIdx] = { wordIdx, colorIdx };
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
    const existing = findLinkForWord(wordIdx);
    if (existing) { unlinkImage(existing.imageIdx); setSelected(null); return; }
    if (selected?.type === 'image') { formLink(selected.idx, wordIdx); setSelected(null); return; }
    setSelected(prev => (prev?.type === 'word' && prev.idx === wordIdx) ? null : { type: 'word', idx: wordIdx });
  }

  function handleContinue() {
    const correctWords = [];
    const needsReviewWords = [];
    pairs.forEach((p, i) => {
      if (links[i]?.wordIdx === i) correctWords.push(p.word);
      else needsReviewWords.push(p.word);
    });
    onComplete({ type: 'matching', questionId, skillTag, label, correctWords, needsReviewWords });
  }

  const SELECTED_GLOW = { border: '#E8B84B', bg: '#FFF8E8' };

  // بطاقة الصورة وبطاقة الكلمة بعرض ثابت متساوٍ (150px) — لا تمدُّد على
  // كامل عرض العمود (كان يُنتج فراغاً جانبياً حول الكلمات القصيرة) ولا
  // حجم مختلف من بطاقة لأخرى، بل عرض وارتفاع موحَّدان "من جميع النواحي"
  // لكل بطاقات التمرين معاً، بحسب طلب الأستاذ محمد صراحة. تُوسَّط كل بطاقة
  // أفقياً داخل عمودها عبر alignItems:center على حاوية العمود (flex).
  function cardStyle({ isImage, isSelected, colorIdx }) {
    const base = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 18, cursor: 'pointer', border: '2.5px solid var(--border)',
      background: '#FAF7F2', transition: 'transform .15s, background .15s, border-color .15s, box-shadow .15s',
      textAlign: 'center', transform: 'scale(1)', minHeight: 56, width: '100%', maxWidth: 150,
      padding: isImage ? 2 : '6px 10px',
    };
    if (colorIdx !== undefined) {
      const c = LINK_PALETTE[colorIdx];
      return { ...base, background: c.bg, borderColor: c.border };
    }
    if (isSelected) {
      return { ...base, background: SELECTED_GLOW.bg, borderColor: SELECTED_GLOW.border, transform: 'scale(1.05)', boxShadow: '0 0 14px rgba(232,184,75,.5)' };
    }
    return base;
  }

  return (
    <div className="page-content">
      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 6 }}>
        {label}
      </p>
      <h2 className="page-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>{title}</h2>
      <p className="page-subtitle" style={{ marginBottom: 16 }}>{subtitle}</p>

      <div style={{ position: 'relative' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            width: 38, height: 38, borderRadius: '50%', background: '#fff',
            border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', zIndex: 1, boxShadow: '0 2px 8px rgba(26,43,74,.15)',
          }}
        >
          🔗
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {imageOrder.map(idx => {
              const link = links[idx];
              const isSelected = selected?.type === 'image' && selected.idx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => tapImage(idx)}
                  aria-label={`صورة: ${pairs[idx].word}`}
                  style={{ ...cardStyle({ isImage: true, isSelected, colorIdx: link?.colorIdx }), fontSize: '2.3rem' }}
                >
                  {pairs[idx].emoji}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {wordOrder.map(idx => {
              const linkEntry = findLinkForWord(idx);
              const isSelected = selected?.type === 'word' && selected.idx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => tapWord(idx)}
                  style={{ ...cardStyle({ isImage: false, isSelected, colorIdx: linkEntry?.colorIdx }), fontSize: '1.15rem', fontWeight: 800 }}
                >
                  {pairs[idx].word}
                </button>
              );
            })}
          </div>
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
