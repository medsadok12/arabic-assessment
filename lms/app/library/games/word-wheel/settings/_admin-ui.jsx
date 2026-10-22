'use client';
import { useEffect, useRef } from 'react';

/* ════════════════════════════════════════════════════════════════
   لوحة إدارة «عجلة الكلمات» — الأنماط والقطع المشتركة بين التبويبات:
   النافذة المنبثقة، مفتاح التشغيل، عدّاد الأرقام، الاختيار المقسّم،
   حقول الإعدادات (المساعدة والمكافآت) بأوصافها للمعلم.
   هوية الموقع للطاقم (أزرق عارم + أزرار ذهبية)، وألوان الأنماط كما في اللعبة.
════════════════════════════════════════════════════════════════ */

export const MODE_COLORS = { picture: '#0284C7', complete: '#7C3AED', challenge: '#EA580C' };

/* حقول «المساعدة والمكافآت» — نفس مفاتيح DEFAULT_WW_SETTINGS */
export const SETTING_FIELDS = {
  hints_enabled:   { type: 'bool', label: '💡 زر التلميح', hint: 'زر يساعد الطفل حين يحتار' },
  hints_limit:     { type: 'num', min: 0, max: 5, label: 'عدد التلميحات', hint: 'لكل كلمة في «الصورة» و«الإكمال»، ولكل عجلة في «التحدي»', needs: 'hints_enabled' },
  max_attempts:    { type: 'num', min: 0, max: 10, label: 'المحاولات لكل كلمة', hint: 'بعدها تُكشف الكلمة بلطف ويتعلّمها الطفل', zero: 'بلا حد' },
  instant_check:   { type: 'bool', label: 'فحص كل حرف فوراً', hint: 'الحرف غير المناسب لا يدخل الخانة (أسهل للصغار). عند الإيقاف تُفحص الكلمة بعد اكتمالها' },
  complete_style:  { type: 'choice', label: 'أسلوب «أكمل الكلمة»', options: [
    { value: 'missing', label: '🧩 حرف مخفي', hint: 'مثل: مـ ؟ ـك' },
    { value: 'hint',    label: '💡 تلميح نصي', hint: 'مثل: حيوان أليف من 3 حروف' },
  ] },
  shuffle_words:   { type: 'bool', label: '🔀 ترتيب عشوائي للكلمات', hint: 'في كل جولة ترتيب جديد' },
  show_card:       { type: 'bool', label: '🃏 بطاقة التعلّم', hint: 'الصورة + الكلمة مشكولة + النطق + الشرح، عند كل كلمة' },
  card_seconds:    { type: 'num', min: 0, max: 15, suffix: 'ث', label: 'إغلاق البطاقة تلقائياً', zero: 'بزر «تابع»', needs: 'show_card' },
  voice_fallback:  { type: 'bool', label: '🔊 صوت الجهاز عند غياب التسجيل', hint: 'يقرأ الجهاز الكلمة المشكولة إن لم يُرفع لها نطق' },
  points_per_word: { type: 'num', min: 0, max: 50, label: '⭐ نقاط كل كلمة', zero: 'بلا نقاط' },
  win_points:      { type: 'num', min: 0, max: 100, step: 5, label: '🏆 مكافأة إنهاء العجلة', zero: 'بلا مكافأة' },
  star2_pct:       { type: 'num', min: 1, max: 100, step: 5, suffix: '%', label: '⭐⭐ نجمتان عند حل', hint: 'نسبة الكلمات المحلولة في العجلة' },
  star3_pct:       { type: 'num', min: 1, max: 100, step: 5, suffix: '%', label: '⭐⭐⭐ ثلاث نجوم عند حل' },
};

export const SETTING_GROUPS = [
  { title: '💡 المساعدة والمحاولات', keys: ['hints_enabled', 'hints_limit', 'max_attempts', 'instant_check', 'complete_style'] },
  { title: '🃏 بطاقة التعلّم والصوت', keys: ['show_card', 'card_seconds', 'voice_fallback', 'shuffle_words'] },
  { title: '⭐ النقاط والنجوم', keys: ['points_per_word', 'win_points', 'star2_pct', 'star3_pct'] },
];

/* نافذة منبثقة: طبقة 300+ (فوق الترويسة والشريط السفلي — القسم 12.1)، Esc يغلق */
export function Modal({ title, onClose, children, footer, layer = 0, wide = false }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="wa-overlay" style={{ zIndex: 300 + layer * 10 }} onClick={() => onClose?.()} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`wa-modal${wide ? ' wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="wa-modal-head">
          <h2>{title}</h2>
          <button type="button" className="wa-x" onClick={() => onClose?.()} aria-label="إغلاق">✕</button>
        </div>
        <div className="wa-modal-body">{children}</div>
        {footer && <div className="wa-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled = false }) {
  return (
    <label className={`wa-toggle${disabled ? ' off' : ''}`}>
      <span className="wa-toggle-text">
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="wa-switch" aria-hidden="true" />
    </label>
  );
}

export function Stepper({ value, onChange, min = 0, max = 100, step = 1, suffix = '', zero, disabled = false }) {
  const v = Number(value) || 0;
  const set = (n) => onChange(Math.min(max, Math.max(min, n)));
  return (
    <div className={`wa-stepper${disabled ? ' off' : ''}`}>
      <button type="button" onClick={() => set(v - step)} disabled={disabled || v <= min} aria-label="إنقاص">−</button>
      <span className="wa-stepper-val">{v === 0 && zero ? zero : `${v}${suffix}`}</span>
      <button type="button" onClick={() => set(v + step)} disabled={disabled || v >= max} aria-label="زيادة">+</button>
    </div>
  );
}

export function Choice({ value, options, onChange, disabled = false }) {
  return (
    <div className="wa-choice" role="radiogroup">
      {options.map(o => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''} disabled={disabled} onClick={() => onChange(o.value)}
          style={o.color && value === o.value ? { borderColor: o.color, background: `${o.color}14`, color: o.color } : undefined}>
          <span>{o.label}</span>
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  );
}

/* حقل إعداد واحد بحسب نوعه */
export function SettingField({ k, value, onChange, all }) {
  const f = SETTING_FIELDS[k];
  const off = f.needs ? !all?.[f.needs] : false;
  if (f.type === 'bool') return <Toggle checked={value} onChange={onChange} label={f.label} hint={f.hint} />;
  if (f.type === 'choice') {
    return (
      <div className="wa-field">
        <span className="wa-label">{f.label}</span>
        <Choice value={value} options={f.options} onChange={onChange} />
      </div>
    );
  }
  return (
    <div className={`wa-field wa-field-row${off ? ' off' : ''}`}>
      <span className="wa-toggle-text">
        <b>{f.label}</b>
        {f.hint && <small>{f.hint}</small>}
      </span>
      <Stepper value={value} onChange={onChange} min={f.min} max={f.max} step={f.step || 1} suffix={f.suffix || ''} zero={f.zero} disabled={off} />
    </div>
  );
}

export function SettingsFields({ value, onChange, keys }) {
  return (
    <div className="wa-fields">
      {keys.map(k => (
        <SettingField key={k} k={k} value={value[k]} all={value} onChange={(v) => onChange({ ...value, [k]: v })} />
      ))}
    </div>
  );
}

export function Notice({ tone = 'info', children }) {
  return <div className={`wa-notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export const ADMIN_CSS = `
  .wa{ min-height:100vh; background:#F4EFE6; direction:rtl; font-family:inherit; color:#1A2B4A; padding-bottom:64px; }
  .wa *{ box-sizing:border-box; }
  .wa-head{ background:linear-gradient(135deg,#1A2B4A,#2C4470); color:#fff; padding:18px 16px 0; }
  .wa-head-in{ max-width:1080px; margin:0 auto; display:flex; flex-direction:column; gap:12px; }
  .wa-head-row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .wa-head h1{ margin:0; font-size:1.45rem; font-weight:900; flex:1; min-width:200px; }
  .wa-head p{ margin:0; opacity:.82; font-size:.9rem; }
  .wa-link{ color:#fff; text-decoration:none; font-weight:800; font-size:.88rem; background:rgba(255,255,255,.14); border-radius:999px; padding:9px 16px; white-space:nowrap; }
  .wa-link.gold{ background:#E8B84B; color:#1A2B4A; }
  .wa-tabs{ display:flex; gap:6px; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
  .wa-tabs::-webkit-scrollbar{ display:none; }
  .wa-tab{ border:none; background:transparent; color:rgba(255,255,255,.78); font-family:inherit; font-weight:800; font-size:.95rem;
    padding:12px 16px; border-radius:14px 14px 0 0; cursor:pointer; white-space:nowrap; min-height:48px; }
  .wa-tab.on{ background:#F4EFE6; color:#1A2B4A; }
  .wa-main{ max-width:1080px; margin:0 auto; padding:18px 16px; display:flex; flex-direction:column; gap:16px; }

  .wa-btn{ border:none; cursor:pointer; font-family:inherit; font-weight:900; font-size:.95rem; min-height:46px; padding:0 18px; border-radius:14px;
    background:#E8B84B; color:#1A2B4A; box-shadow:0 3px 0 #C99A2E; display:inline-flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; }
  .wa-btn:active:not(:disabled){ transform:translateY(2px); box-shadow:0 1px 0 #C99A2E; }
  .wa-btn:disabled{ opacity:.5; cursor:not-allowed; }
  .wa-btn.ghost{ background:#fff; border:2px solid #EDE5D8; box-shadow:none; color:#1A2B4A; }
  .wa-btn.navy{ background:#1A2B4A; color:#fff; box-shadow:0 3px 0 #0E1A30; }
  .wa-btn.soft-red{ background:#FFF1F2; color:#BE123C; box-shadow:none; border:2px solid #FECDD3; }
  .wa-btn.sm{ min-height:40px; font-size:.85rem; padding:0 12px; border-radius:12px; }

  .wa-card{ background:#fff; border-radius:20px; padding:18px; box-shadow:0 4px 18px rgba(26,43,74,.08); border:1px solid #EDE5D8; }
  .wa-card h3{ margin:0 0 12px; font-size:1.05rem; font-weight:900; }
  .wa-sub{ color:#64748B; font-size:.85rem; margin:0; line-height:1.7; }
  .wa-row{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  .wa-spacer{ flex:1; }
  .wa-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }

  .wa-notice{ border-radius:14px; padding:12px 16px; font-weight:700; font-size:.9rem; line-height:1.7; }
  .wa-notice.ok{ background:#ECFDF5; color:#065F46; border:1.5px solid #A7F3D0; }
  .wa-notice.info{ background:#EFF6FF; color:#1E3A8A; border:1.5px solid #BFDBFE; }
  .wa-notice.warn{ background:#FFFBEB; color:#92400E; border:1.5px solid #FDE68A; }
  .wa-notice.error{ background:#FFF1F2; color:#9F1239; border:1.5px solid #FECDD3; }
  .wa-toast{ position:fixed; bottom:calc(20px + env(safe-area-inset-bottom)); left:50%; transform:translateX(-50%); z-index:400; max-width:calc(100vw - 32px);
    box-shadow:0 10px 30px rgba(0,0,0,.18); }

  /* الحقول */
  .wa-field{ display:flex; flex-direction:column; gap:6px; }
  .wa-field.off{ opacity:.45; }
  .wa-field-row{ flex-direction:row; align-items:center; justify-content:space-between; gap:12px; background:#FAF7F2; border-radius:14px; padding:10px 14px; }
  .wa-label{ font-weight:800; font-size:.88rem; color:#334155; }
  .wa-input, .wa-textarea{ width:100%; font-family:inherit; font-size:16px; color:#1A2B4A; background:#fff; border:2px solid #EDE5D8; border-radius:12px; padding:10px 12px; outline:none; }
  .wa-input:focus, .wa-textarea:focus{ border-color:#E8B84B; box-shadow:0 0 0 3px rgba(232,184,75,.25); }
  .wa-textarea{ min-height:84px; resize:vertical; line-height:1.8; }
  .wa-input.big{ font-size:1.5rem; font-weight:900; text-align:center; }
  .wa-count{ font-size:.72rem; color:#94A3B8; align-self:flex-end; }
  .wa-fields{ display:flex; flex-direction:column; gap:10px; }

  .wa-toggle{ display:flex; align-items:center; gap:12px; background:#FAF7F2; border-radius:14px; padding:10px 14px; cursor:pointer; min-height:56px; position:relative; }
  .wa-toggle.off{ opacity:.5; cursor:not-allowed; }
  .wa-toggle-text{ flex:1; display:flex; flex-direction:column; gap:2px; min-width:0; }
  .wa-toggle-text b{ font-size:.92rem; font-weight:800; }
  .wa-toggle-text small{ color:#64748B; font-size:.78rem; line-height:1.6; }
  .wa-toggle input{ position:absolute; opacity:0; pointer-events:none; }
  .wa-switch{ width:52px; height:30px; border-radius:99px; background:#CBD5E1; position:relative; flex-shrink:0; transition:background .2s; }
  .wa-switch::after{ content:''; position:absolute; top:3px; right:3px; width:24px; height:24px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.25); transition:right .2s; }
  .wa-toggle input:checked + .wa-switch{ background:#2ABB7A; }
  .wa-toggle input:checked + .wa-switch::after{ right:25px; }
  .wa-toggle input:focus-visible + .wa-switch{ outline:3px solid #E8B84B; outline-offset:2px; }

  .wa-stepper{ display:flex; align-items:center; gap:4px; background:#fff; border:2px solid #EDE5D8; border-radius:14px; padding:3px; flex-shrink:0; }
  .wa-stepper.off{ opacity:.5; }
  .wa-stepper button{ width:40px; height:40px; border:none; border-radius:10px; background:#F4EFE6; color:#1A2B4A; font-size:1.3rem; font-weight:900; cursor:pointer; font-family:inherit; }
  .wa-stepper button:disabled{ opacity:.35; cursor:not-allowed; }
  .wa-stepper-val{ min-width:72px; text-align:center; font-weight:900; font-size:.95rem; }

  .wa-choice{ display:flex; gap:8px; flex-wrap:wrap; }
  .wa-choice button{ flex:1 1 140px; border:2px solid #EDE5D8; background:#fff; border-radius:14px; padding:10px 12px; cursor:pointer; font-family:inherit;
    display:flex; flex-direction:column; align-items:center; gap:2px; min-height:52px; color:#1A2B4A; font-weight:800; font-size:.92rem; }
  .wa-choice button small{ font-weight:600; font-size:.74rem; color:#64748B; }
  .wa-choice button.on{ border-color:#E8B84B; background:#FFF8E6; box-shadow:0 0 0 3px rgba(232,184,75,.2); }
  .wa-choice button:disabled{ opacity:.5; cursor:not-allowed; }

  /* النافذة */
  .wa-overlay{ position:fixed; inset:0; background:rgba(15,23,42,.6); display:flex; align-items:center; justify-content:center; padding:16px; direction:rtl; font-family:inherit; }
  .wa-modal{ background:#fff; border-radius:24px; width:100%; max-width:640px; max-height:calc(100vh - 32px); display:flex; flex-direction:column; box-shadow:0 24px 60px rgba(0,0,0,.3); color:#1A2B4A; }
  .wa-modal.wide{ max-width:980px; }
  .wa-modal-head{ display:flex; align-items:center; gap:10px; padding:16px 18px; border-bottom:1px solid #EDE5D8; }
  .wa-modal-head h2{ margin:0; flex:1; font-size:1.15rem; font-weight:900; }
  .wa-x{ width:42px; height:42px; border-radius:50%; border:none; background:#F4EFE6; font-size:1rem; cursor:pointer; color:#1A2B4A; flex-shrink:0; }
  .wa-modal-body{ padding:16px 18px; overflow-y:auto; display:flex; flex-direction:column; gap:14px; -webkit-overflow-scrolling:touch; }
  .wa-modal-foot{ padding:12px 18px calc(12px + env(safe-area-inset-bottom)); border-top:1px solid #EDE5D8; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
  .wa-modal-foot .wa-btn{ flex:1 1 140px; }
  .wa-section{ border:1.5px solid #EDE5D8; border-radius:18px; padding:14px; display:flex; flex-direction:column; gap:12px; }
  .wa-section > h4{ margin:0; font-size:.98rem; font-weight:900; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .wa-section > h4 small{ font-weight:700; color:#64748B; font-size:.78rem; }

  /* قائمة العجلات */
  .wa-filters{ display:flex; gap:8px; flex-wrap:wrap; }
  .wa-chipbtn{ border:2px solid #EDE5D8; background:#fff; color:#1A2B4A; font-family:inherit; font-weight:800; font-size:.88rem; border-radius:999px; padding:8px 14px; cursor:pointer; min-height:42px; }
  .wa-chipbtn.on{ background:#1A2B4A; border-color:#1A2B4A; color:#fff; }
  .wa-group-title{ margin:6px 0 0; font-size:1rem; font-weight:900; display:flex; align-items:center; gap:8px; }
  .wa-group-title span{ font-size:.78rem; color:#64748B; font-weight:700; }
  .wa-wheel{ background:#fff; border-radius:20px; border:1px solid #EDE5D8; box-shadow:0 4px 14px rgba(26,43,74,.07); overflow:hidden; display:flex; flex-direction:column; }
  .wa-wheel.hidden{ opacity:.6; }
  .wa-wheel-top{ display:flex; gap:12px; align-items:center; padding:14px; color:#fff; }
  .wa-mini{ width:64px; height:64px; flex-shrink:0; }
  .wa-wheel-name{ font-weight:900; font-size:1rem; line-height:1.4; }
  .wa-wheel-meta{ font-size:.78rem; opacity:.9; }
  .wa-wheel-body{ padding:12px 14px; display:flex; flex-direction:column; gap:8px; flex:1; }
  .wa-words{ display:flex; flex-wrap:wrap; gap:6px; }
  .wa-word{ display:inline-flex; align-items:center; gap:4px; background:#F4EFE6; border-radius:999px; padding:3px 10px; font-weight:800; font-size:.85rem; }
  .wa-word.bad{ background:#FFFBEB; color:#92400E; border:1px dashed #F59E0B; }
  .wa-badges{ display:flex; gap:6px; flex-wrap:wrap; }
  .wa-badge{ font-size:.72rem; font-weight:800; border-radius:999px; padding:2px 9px; background:#EEF2FF; color:#3730A3; }
  .wa-badge.warn{ background:#FFFBEB; color:#92400E; }
  .wa-badge.muted{ background:#F1F5F9; color:#475569; }
  .wa-badge.ok{ background:#ECFDF5; color:#047857; }
  .wa-wheel-actions{ display:flex; gap:6px; padding:0 14px 14px; flex-wrap:wrap; }
  .wa-wheel-actions .wa-btn{ flex:1 1 0; }

  /* محرر العجلة */
  .wa-editor{ display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:16px; align-items:start; }
  .wa-preview{ position:sticky; top:0; display:flex; flex-direction:column; gap:10px; }
  .wa-preview-box{ border-radius:20px; padding:14px; display:flex; flex-direction:column; align-items:center; gap:10px; }
  .wa-preview-box .wa-sample-btn{ border:none; font-family:inherit; font-weight:900; font-size:1rem; min-height:46px; padding:0 22px; border-radius:14px; }
  .wa-center-slot{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
  .wa-center-circle{ width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.8rem; font-weight:900;
    background:#FFF8E6; border:3px dashed #E8B84B; color:#1A2B4A; cursor:pointer; flex-shrink:0; font-family:inherit; }
  .wa-center-circle.set{ border-style:solid; background:#E8B84B; }
  .wa-center-circle.target{ box-shadow:0 0 0 4px rgba(232,184,75,.35); }
  .wa-outer{ display:flex; flex-wrap:wrap; gap:6px; min-height:48px; align-items:center; padding:8px; border:2px dashed #EDE5D8; border-radius:14px; cursor:pointer; }
  .wa-outer.target{ border-color:#7C3AED; background:#FAF5FF; }
  .wa-letter{ display:inline-flex; align-items:center; gap:4px; background:#fff; border:2px solid #EDE5D8; border-radius:12px; padding:4px 6px 4px 10px; font-size:1.2rem; font-weight:900; }
  .wa-letter button{ border:none; background:#F1F5F9; color:#475569; border-radius:8px; width:28px; height:28px; cursor:pointer; font-size:.75rem; }
  .wa-keys{ display:grid; grid-template-columns:repeat(auto-fill,minmax(44px,1fr)); gap:6px; }
  .wa-key{ height:46px; border:none; border-radius:12px; background:#F4EFE6; color:#1A2B4A; font-family:inherit; font-size:1.25rem; font-weight:900; cursor:pointer; }
  .wa-key:active{ background:#E8B84B; }
  .wa-key.used{ background:#FFF8E6; box-shadow:inset 0 0 0 2px #E8B84B; }
  .wa-wordlist{ display:flex; flex-direction:column; gap:8px; }
  .wa-wordrow{ display:flex; align-items:center; gap:10px; border:1.5px solid #EDE5D8; border-radius:14px; padding:8px 10px; background:#fff; }
  .wa-wordrow.bad{ border-color:#FDE68A; background:#FFFBEB; }
  .wa-wordrow-main{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
  .wa-wordrow-main b{ font-size:1.15rem; font-weight:900; }
  .wa-wordrow-main small{ font-size:.76rem; color:#64748B; }
  .wa-wordrow-main small.bad{ color:#B45309; font-weight:800; }
  .wa-thumb{ width:48px; height:48px; border-radius:12px; object-fit:cover; background:#F4EFE6; display:flex; align-items:center; justify-content:center; font-size:1.6rem; flex-shrink:0; overflow:hidden; }
  .wa-icon-btn{ border:none; background:#F4EFE6; color:#1A2B4A; border-radius:10px; min-width:40px; height:40px; cursor:pointer; font-family:inherit; font-weight:800; font-size:.82rem; padding:0 10px; white-space:nowrap; }
  .wa-icon-btn.del{ background:#F1F5F9; color:#64748B; }

  /* المظهر */
  .wa-presets{ display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; }
  .wa-preset{ border:3px solid transparent; border-radius:18px; padding:10px; cursor:pointer; font-family:inherit; font-weight:900; color:#fff; font-size:.9rem;
    display:flex; flex-direction:column; align-items:center; gap:8px; min-height:96px; box-shadow:0 3px 10px rgba(0,0,0,.12); }
  .wa-preset.on{ border-color:#1A2B4A; box-shadow:0 0 0 3px #E8B84B; }
  .wa-preset-dots{ display:flex; gap:4px; align-items:center; }
  .wa-preset-dots i{ width:22px; height:22px; border-radius:50%; border:2px solid rgba(255,255,255,.8); display:inline-block; }
  .wa-colors{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:10px; }
  .wa-color{ display:flex; align-items:center; gap:10px; background:#FAF7F2; border-radius:14px; padding:8px 10px; }
  .wa-color input[type=color]{ width:46px; height:46px; border:none; border-radius:12px; padding:0; background:none; cursor:pointer; flex-shrink:0; }
  .wa-color input[type=color]::-webkit-color-swatch-wrapper{ padding:0; }
  .wa-color input[type=color]::-webkit-color-swatch{ border:2px solid #fff; border-radius:12px; box-shadow:0 0 0 1px #EDE5D8; }
  .wa-color-text{ flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
  .wa-color-text b{ font-size:.85rem; }
  .wa-hex{ width:100%; max-width:110px; font-family:monospace; font-size:16px; direction:ltr; text-align:left; border:2px solid #EDE5D8; border-radius:10px; padding:4px 8px; color:#1A2B4A; background:#fff; }
  .wa-hex.bad{ border-color:#F59E0B; }

  /* بطاقة الكلمة */
  .wa-bank-card{ display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #EDE5D8; border-radius:18px; padding:12px; cursor:pointer; text-align:right; font-family:inherit; color:#1A2B4A; box-shadow:0 3px 10px rgba(26,43,74,.06); width:100%; }
  .wa-bank-card:hover{ border-color:#E8B84B; }
  .wa-bank-card .wa-thumb{ width:58px; height:58px; font-size:2rem; }
  .wa-media{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .wa-media-img{ width:120px; height:120px; border-radius:18px; background:#F4EFE6; display:flex; align-items:center; justify-content:center; font-size:3.4rem; overflow:hidden; border:2px solid #EDE5D8; flex-shrink:0; }
  .wa-media-img img{ width:100%; height:100%; object-fit:cover; }
  .wa-tashkeel{ display:flex; gap:6px; flex-wrap:wrap; }
  .wa-tashkeel button{ min-width:44px; height:40px; border:none; border-radius:10px; background:#F4EFE6; font-size:1.3rem; cursor:pointer; font-family:inherit; color:#1A2B4A; }
  .wa-progress{ height:8px; border-radius:99px; background:#EDE5D8; overflow:hidden; }
  .wa-progress > div{ height:100%; background:#1A2B4A; transition:width .2s; }

  @media (max-width: 640px){
    .wa-head h1{ font-size:1.2rem; }
    .wa-main{ padding:14px 12px; }
    .wa-overlay{ padding:0; align-items:flex-end; }
    .wa-modal, .wa-modal.wide{ max-width:100%; max-height:94vh; border-radius:24px 24px 0 0; }
    .wa-editor{ grid-template-columns:minmax(0,1fr); }
    .wa-preview{ position:static; order:-1; }
    .wa-preview-box{ flex-direction:row; justify-content:center; }
    .wa-preview-box svg{ max-width:200px !important; }
    .wa-field-row{ flex-direction:column; align-items:stretch; }
    .wa-field-row .wa-stepper{ align-self:flex-start; }
    .wa-wheel-actions .wa-btn{ flex:1 1 calc(50% - 6px); }
    .wa-grid{ grid-template-columns:minmax(0,1fr); }
  }
`;
