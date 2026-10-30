import { useState } from 'react';
import { CURRENCIES, DEFAULT_TITLE, detectCurrency } from '../config.js';
import { KEY_LENGTH, formatKey, generateKey, isValidKey, normalizeKey } from '../lib/spaceKey.js';
import { fetchSpace, saveSpace } from '../lib/api.js';

const NETWORK_ERROR = 'تعذّر الاتصال بالإنترنت، تأكد من الشبكة وحاول مجدداً 🌿';
const UNEXPECTED_ERROR = 'حدث خطأ غير متوقع، حاول مجدداً بعد قليل 🌿';

export default function Welcome({ invite, savedName, onEnter, onBack }) {
  const [mode, setMode] = useState(invite ? 'join' : 'create');
  const [name, setName] = useState(savedName ?? '');
  const [weddingDate, setWeddingDate] = useState('');
  const [currency, setCurrency] = useState(detectCurrency);
  const [code, setCode] = useState(invite ? formatKey(invite) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const key = generateKey();
    const space = { title: DEFAULT_TITLE, currency, wedding_date: weddingDate || null };
    try {
      await saveSpace(key, space);
      onEnter({ key, name: name.trim(), space, created: true });
    } catch (err) {
      setError(err.transient ? NETWORK_ERROR : UNEXPECTED_ERROR);
      setBusy(false);
    }
  }

  async function join(event) {
    event.preventDefault();
    const key = normalizeKey(code);
    if (!isValidKey(key)) {
      setError(`رمز الدفتر يتكوّن من ${KEY_LENGTH} حرفاً ورقماً، تأكد منه 🌸`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const space = await fetchSpace(key);
      if (!space) {
        setError('لم نجد دفتراً بهذا الرمز، تأكد منه وحاول مجدداً 🌸');
        setBusy(false);
        return;
      }
      onEnter({ key, name: name.trim(), space, created: false });
    } catch (err) {
      setError(err.transient ? NETWORK_ERROR : UNEXPECTED_ERROR);
      setBusy(false);
    }
  }

  const nameField = (
    <label className="field">
      <span className="field-label">اسمك <small>(اختياري — يظهر بجانب ما تضيفه)</small></span>
      <input
        type="text"
        value={name}
        maxLength={40}
        placeholder="مثال: محمد"
        autoComplete="given-name"
        onChange={e => setName(e.target.value)}
      />
    </label>
  );

  return (
    <main className="welcome">
      <div className="welcome-card">
        <div className="welcome-mark" aria-hidden="true">💍</div>
        <h1 className="brand-title">مصاريف</h1>
        <p className="welcome-tagline">
          دفتركما المشترك لتحضيرات الزواج: سجّلا كل مصروف، وتابعا ما دُفع وما بقي حتى يوم الفرح.
        </p>

        {invite && mode === 'join' && (
          <p className="invite-note">🤍 وصلتك دعوة للانضمام إلى دفتر مشترك، أكمل بالضغط على «الانضمام».</p>
        )}

        <div className="segmented" role="tablist" aria-label="طريقة البدء">
          <button type="button" role="tab" aria-selected={mode === 'create'} onClick={() => switchMode('create')}>
            دفتر جديد
          </button>
          <button type="button" role="tab" aria-selected={mode === 'join'} onClick={() => switchMode('join')}>
            لديّ رمز دفتر
          </button>
        </div>

        {mode === 'create' ? (
          <form className="welcome-form" onSubmit={create}>
            {nameField}
            <label className="field">
              <span className="field-label">موعد الزفاف <small>(اختياري — لعدّ الأيام المتبقية)</small></span>
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
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'جارٍ تجهيز دفتركما…' : '✨ إنشاء دفترنا'}
            </button>
          </form>
        ) : (
          <form className="welcome-form" onSubmit={join}>
            <label className="field">
              <span className="field-label">رمز الدفتر</span>
              <input
                type="text"
                dir="ltr"
                className="code-input"
                value={code}
                placeholder="abcd-efgh-jkmn-pqrs"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                onChange={e => setCode(e.target.value)}
              />
            </label>
            {nameField}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'جارٍ فتح الدفتر…' : 'الانضمام إلى الدفتر'}
            </button>
          </form>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}

        <p className="welcome-foot">🔒 لا يطّلع على الدفتر إلا من يملك رمزه.</p>
        {onBack && (
          <button type="button" className="link-btn" onClick={onBack}>العودة إلى دفتري الحالي</button>
        )}
      </div>
    </main>
  );
}
