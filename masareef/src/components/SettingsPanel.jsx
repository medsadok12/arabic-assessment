import { useState } from 'react';
import ShareInvite from './ShareInvite.jsx';
import { CURRENCIES, DEFAULT_TITLE } from '../config.js';

export default function SettingsPanel({ space, spaceKey, name, pending, onSave, onLeave }) {
  const [title, setTitle] = useState(space?.title ?? DEFAULT_TITLE);
  const [weddingDate, setWeddingDate] = useState(space?.wedding_date ?? '');
  const [currency, setCurrency] = useState(space?.currency ?? 'USD');
  const [myName, setMyName] = useState(name ?? '');
  const [confirmLeave, setConfirmLeave] = useState(false);

  function save(event) {
    event.preventDefault();
    onSave({ title: title.trim() || DEFAULT_TITLE, wedding_date: weddingDate || null, currency }, myName.trim());
  }

  return (
    <div className="settings">
      <section className="settings-section">
        <h3>شارك الدفتر مع شريك حياتك 🤍</h3>
        <p className="muted">كل ما يضيفه أحدكما يظهر عند الآخر فوراً. احتفظا بالرمز في مكان آمن.</p>
        <ShareInvite spaceKey={spaceKey} />
      </section>

      <form className="settings-section" onSubmit={save}>
        <h3>معلومات الدفتر</h3>
        <label className="field">
          <span className="field-label">اسم الدفتر</span>
          <input type="text" value={title} maxLength={60} onChange={e => setTitle(e.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field-label">موعد الزفاف</span>
            <input type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">العملة</span>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <option key={code} value={code}>{c.name} ({c.symbol})</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field-label">اسمك على هذا الجهاز <small>(يظهر بجانب ما تضيفه)</small></span>
          <input type="text" value={myName} maxLength={40} placeholder="مثال: محمد" onChange={e => setMyName(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-block">حفظ الإعدادات</button>
      </form>

      <section className="settings-section settings-leave">
        {confirmLeave ? (
          <div className="leave-confirm" role="alert">
            <p>
              {pending > 0
                ? '⚠️ بعض تعديلاتك لم تُرسَل بعد لعدم الاتصال، وستضيع إن خرجت الآن.'
                : 'ستبقى بيانات الدفتر محفوظة، ويمكنك العودة إليه في أي وقت بالرمز نفسه.'}
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-danger" onClick={onLeave}>نعم، اخرج من الدفتر</button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmLeave(false)}>تراجع</button>
            </div>
          </div>
        ) : (
          <button type="button" className="link-btn link-danger" onClick={() => setConfirmLeave(true)}>
            الخروج من الدفتر على هذا الجهاز
          </button>
        )}
      </section>
    </div>
  );
}
