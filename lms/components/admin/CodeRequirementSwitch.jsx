'use client';

import { useEffect, useState } from 'react';

/* ════════════════════════════════════════════════════════════════
   مفتاح «إظهار خانة الكود / إخفاؤها» — أعلى قسمَي أكواد الطلبة وأكواد التقييم
   في تبويب الأكواد. الإخفاء لا يحذف أي كود ولا يلغي التحقق: يتوقف طلبه فقط،
   ويعود كما كان بنقرة. (lib/signup-codes.js — platform_settings 'signup_codes')
════════════════════════════════════════════════════════════════ */

const KINDS = {
  student: {
    key: 'student_code_required',
    ar: { title: 'خانة «كود الأكاديمية» في تسجيل الطلاب', on: 'ظاهرة — لا يكتمل تسجيل الطالب بلا كود', off: 'مخفية — يفتح الطالب حسابه بلا كود (بالبريد أو Google)' },
    en: { title: 'Academy code field on student sign-up', on: 'Shown — sign-up requires a code', off: 'Hidden — students sign up without a code (email or Google)' },
  },
  assessment: {
    key: 'assessment_code_required',
    ar: { title: 'خانة «كود التقييم» في التقييم التشخيصي', on: 'ظاهرة — لا يبدأ التقييم بلا كود', off: 'مخفية — يبدأ الطالب التقييم بلا كود (ويصلك إشعار بالبدء)' },
    en: { title: 'Code field on the diagnostic assessment', on: 'Shown — the assessment requires a code', off: 'Hidden — students start without a code (you still get notified)' },
  },
};

export default function CodeRequirementSwitch({ kind, lang = 'ar' }) {
  const cfg = KINDS[kind];
  const t = cfg[lang === 'en' ? 'en' : 'ar'];
  const [required, setRequired] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  useEffect(() => {
    fetch('/api/public/signup-settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(s => setRequired(s[cfg.key] !== false))
      .catch(() => setMsg({ ok: false, text: lang === 'en' ? 'Could not load the setting' : 'تعذّر تحميل الإعداد — أعد فتح التبويب' }));
  }, [cfg.key, lang]);

  async function toggle() {
    const next = !required;
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/signup-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [cfg.key]: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'تعذّر الحفظ');
      setRequired(data[cfg.key]);
      setMsg({ ok: true, text: lang === 'en' ? 'Saved — applies immediately' : '✅ حُفظ — يسري فوراً على الصفحة' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setSaving(false);
  }

  const loading = required === null;
  return (
    <div className="card" style={{ padding: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>🔐 {t.title}</div>
        <div style={{ fontSize: '.88rem', color: loading ? 'var(--muted)' : required ? '#1565c0' : '#2e7d32', fontWeight: 700 }}>
          {loading ? '…' : required ? `👁️ ${t.on}` : `🙈 ${t.off}`}
        </div>
        {msg && <div style={{ fontSize: '.8rem', marginTop: 6, color: msg.ok ? '#2e7d32' : 'var(--danger, #e74c3c)', fontWeight: 600 }}>{msg.text}</div>}
      </div>
      <button type="button" className={`btn${required ? '' : ' btn-primary'}`} onClick={toggle} disabled={loading || saving}
        aria-pressed={!required} style={{ minWidth: 170, minHeight: 44 }}>
        {saving ? <span className="spinner" /> : required
          ? (lang === 'en' ? '🙈 Hide the field' : '🙈 إخفاء الخانة')
          : (lang === 'en' ? '👁️ Show the field' : '👁️ إظهار الخانة')}
      </button>
    </div>
  );
}
