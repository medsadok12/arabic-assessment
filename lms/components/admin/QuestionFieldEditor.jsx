'use client';

import { FIELD_SCHEMAS } from '../../lib/assessment-question-types';

const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '.9rem' };
const rowBox = { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, background: '#F8FAFC', padding: 8, borderRadius: 8 };
const smallBtn = { background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontWeight: 700, flexShrink: 0 };
const addBtn = { background: '#E0E7FF', color: '#3730A3', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '.85rem' };

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontWeight: 700, fontSize: '.85rem', color: '#334155', marginBottom: 6 }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function StringList({ value = [], onChange, placeholder }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, v) => onChange(items.map((x, idx) => (idx === i ? v : x)));
  const remove = i => onChange(items.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      {items.map((v, i) => (
        <div key={i} style={rowBox}>
          <button type="button" style={{ ...smallBtn, background: '#E2E8F0', color: '#334155' }} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
          <button type="button" style={{ ...smallBtn, background: '#E2E8F0', color: '#334155' }} onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</button>
          <input style={{ ...inputStyle, flex: 1 }} value={v} placeholder={placeholder} onChange={e => update(i, e.target.value)} />
          <button type="button" style={smallBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtn} onClick={() => onChange([...items, ''])}>+ إضافة</button>
    </div>
  );
}

function OptionsMcq({ value = [], onChange }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = i => onChange(items.filter((_, idx) => idx !== i));
  const setCorrect = i => onChange(items.map((x, idx) => ({ ...x, correct: idx === i })));
  return (
    <div>
      {items.map((opt, i) => (
        <div key={i} style={rowBox}>
          <input
            type="radio"
            name="mcq-correct"
            checked={!!opt.correct}
            onChange={() => setCorrect(i)}
            title="الإجابة الصحيحة"
          />
          <input style={{ ...inputStyle, flex: 1 }} value={opt.text ?? ''} placeholder="نص الخيار" onChange={e => update(i, { text: e.target.value })} />
          <button type="button" style={smallBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtn} onClick={() => onChange([...items, { text: '', correct: items.length === 0 }])}>+ خيار جديد</button>
    </div>
  );
}

function Pairs({ value = [], onChange }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = i => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div>
      {items.map((p, i) => (
        <div key={i} style={rowBox}>
          <input style={{ ...inputStyle, width: 60, textAlign: 'center', fontSize: '1.3rem' }} value={p.emoji ?? ''} placeholder="🔤" onChange={e => update(i, { emoji: e.target.value })} />
          <input style={{ ...inputStyle, flex: 1 }} value={p.name ?? ''} placeholder="الاسم" onChange={e => update(i, { name: e.target.value })} />
          <button type="button" style={smallBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtn} onClick={() => onChange([...items, { id: `p${Date.now()}_${items.length}`, emoji: '', name: '' }])}>+ زوج جديد</button>
    </div>
  );
}

function DialogueLines({ value = [], onChange }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = i => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div>
      {items.map((l, i) => (
        <div key={i} style={rowBox}>
          <input style={{ ...inputStyle, width: 90 }} value={l.speaker ?? ''} placeholder="المتحدّث" onChange={e => update(i, { speaker: e.target.value })} />
          <input style={{ ...inputStyle, flex: 1 }} value={l.text ?? ''} placeholder="الجملة" onChange={e => update(i, { text: e.target.value })} />
          <button type="button" style={smallBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtn} onClick={() => onChange([...items, { id: String.fromCharCode(97 + items.length), speaker: '', text: '' }])}>+ جملة جديدة</button>
    </div>
  );
}

function LetterChoices({ value = [], onChange }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, patch) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = i => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={rowBox}>
          <input style={{ ...inputStyle, width: 60, textAlign: 'center' }} value={it.letter ?? ''} placeholder="الحرف" onChange={e => update(i, { letter: e.target.value })} />
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={(it.choices ?? []).join('، ')}
            placeholder="الخيارات مفصولة بفاصلة، مثال: ب، ن، ت"
            onChange={e => update(i, { choices: e.target.value.split(/[،,]/).map(s => s.trim()).filter(Boolean) })}
          />
          <button type="button" style={smallBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtn} onClick={() => onChange([...items, { letter: '', choices: [] }])}>+ عنصر جديد</button>
    </div>
  );
}

function ItemsText({ value = [], onChange }) {
  const items = Array.isArray(value) ? value : [];
  const update = (i, text) => onChange(items.map((x, idx) => (idx === i ? { text } : x)));
  const remove = i => onChange(items.filter((_, idx) => idx !== i));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={rowBox}>
          <input style={{ ...inputStyle, flex: 1 }} value={it.text ?? ''} placeholder="نص السؤال الشفهي" onChange={e => update(i, e.target.value)} />
          <button type="button" style={smallBtn} onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" style={addBtn} onClick={() => onChange([...items, { text: '' }])}>+ سؤال جديد</button>
    </div>
  );
}

/** يبني نموذج التحرير كاملاً لسؤال من نوع معيّن اعتماداً على FIELD_SCHEMAS. */
export default function QuestionFieldEditor({ type, payload, onChange }) {
  const schema = FIELD_SCHEMAS[type] || [];
  if (schema.length === 0) {
    return (
      <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, padding: 14, color: '#92400E', fontSize: '.88rem' }}>
        هذا النوع تدريب ثابت البنية (الحروف/الحركات/السكون...) — محتواه مبرمج داخل تطبيق التقييم نفسه ولا يُحرَّر من هنا.
        يمكنك فقط ضبط المهارة والترتيب والتفعيل والوزن أدناه.
      </div>
    );
  }

  const setField = (key, v) => onChange({ ...payload, [key]: v });

  return (
    <div>
      {schema.map(f => {
        const val = payload?.[f.key];
        return (
          <Field key={f.key} label={f.label} required={f.required}>
            {f.kind === 'text' && (
              <input style={inputStyle} value={val ?? ''} onChange={e => setField(f.key, e.target.value)} />
            )}
            {f.kind === 'textarea' && (
              <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={val ?? ''} onChange={e => setField(f.key, e.target.value)} />
            )}
            {f.kind === 'number' && (
              <input type="number" style={{ ...inputStyle, width: 120 }} value={val ?? 0} onChange={e => setField(f.key, Number(e.target.value))} />
            )}
            {f.kind === 'string-list' && <StringList value={val} onChange={v => setField(f.key, v)} />}
            {f.kind === 'options-mcq'  && <OptionsMcq  value={val} onChange={v => setField(f.key, v)} />}
            {f.kind === 'pairs'        && <Pairs       value={val} onChange={v => setField(f.key, v)} />}
            {f.kind === 'dialogue-lines' && <DialogueLines value={val} onChange={v => setField(f.key, v)} />}
            {f.kind === 'letter-choices' && <LetterChoices value={val} onChange={v => setField(f.key, v)} />}
            {f.kind === 'items-text'     && <ItemsText     value={val} onChange={v => setField(f.key, v)} />}
          </Field>
        );
      })}
    </div>
  );
}
