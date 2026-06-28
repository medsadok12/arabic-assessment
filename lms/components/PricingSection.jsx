'use client';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import gsap from 'gsap';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

const CURRENCIES = [
  { code: 'QAR', symbol: 'ر.ق', label: 'ريال قطري',     labelEn: 'Qatari Riyal'   },
  { code: 'SAR', symbol: 'ر.س', label: 'ريال سعودي',    labelEn: 'Saudi Riyal'    },
  { code: 'AED', symbol: 'د.إ', label: 'درهم إماراتي',  labelEn: 'UAE Dirham'     },
  { code: 'KWD', symbol: 'د.ك', label: 'دينار كويتي',   labelEn: 'Kuwaiti Dinar'  },
  { code: 'OMR', symbol: 'ر.ع', label: 'ريال عماني',    labelEn: 'Omani Rial'     },
  { code: 'BHD', symbol: 'د.ب', label: 'دينار بحريني',  labelEn: 'Bahraini Dinar' },
  { code: 'USD', symbol: '$',   label: 'دولار أمريكي',  labelEn: 'US Dollar'      },
  { code: 'EUR', symbol: '€',   label: 'يورو',          labelEn: 'Euro'           },
  { code: 'GBP', symbol: '£',   label: 'جنيه إسترليني', labelEn: 'British Pound'  },
  { code: 'TND', symbol: 'د.ت', label: 'دينار تونسي',   labelEn: 'Tunisian Dinar' },
];

const PLAN_TYPES = [
  { key: 'lessons',      labelAr: '🎓 دروس مباشرة',   labelEn: '🎓 Live Lessons'    },
  { key: 'content_only', labelAr: '📱 محتوى رقمي',     labelEn: '📱 Digital Content' },
  { key: 'family',       labelAr: '👨‍👩‍👧 عائلي',         labelEn: '👨‍👩‍👧 Family'         },
  { key: 'school',       labelAr: '🏫 مدارس ومؤسسات', labelEn: '🏫 Schools'          },
];

// ── Parsing helpers ───────────────────────────────────────────────────────────

/**
 * Safely parse plan.prices which may arrive as object, JSON string, or {}
 * Returns the inner map or null if empty / invalid.
 */
function parsePricesMap(raw) {
  if (!raw) return null;
  let map = raw;
  if (typeof map === 'string') {
    try { map = JSON.parse(map); } catch { return null; }
  }
  if (typeof map !== 'object' || Array.isArray(map)) return null;
  return Object.keys(map).length > 0 ? map : null;
}

/**
 * Safely parse plan.checkout_urls in the same way.
 */
function parseUrlsMap(raw) {
  if (!raw) return {};
  let map = raw;
  if (typeof map === 'string') {
    try { map = JSON.parse(map); } catch { return {}; }
  }
  return (typeof map === 'object' && !Array.isArray(map)) ? map : {};
}

/**
 * Returns { monthly, yearly } for the requested currency.
 * Priority: new JSONB prices[currency] → old flat columns (any currency) → null.
 */
function getPriceObj(plan, currency) {
  const map = parsePricesMap(plan.prices);

  if (map) {
    // New multi-currency format is present
    const entry = map[currency];
    if (entry) {
      return { monthly: Number(entry.monthly) || 0, yearly: Number(entry.yearly) || 0 };
    }
    // Currency not configured → don't fall back to old columns
    return null;
  }

  // Old flat-column fallback (before migration or SQL not yet run)
  const m = Number(plan.price_monthly) || 0;
  const y = Number(plan.price_yearly)  || 0;
  return (m > 0 || y > 0) ? { monthly: m, yearly: y } : null;
}

/**
 * Checkout URL for the selected currency, with safe fallbacks.
 */
function getCheckoutHref(plan, currency) {
  const urls = parseUrlsMap(plan.checkout_urls);
  return urls[currency] || plan.checkout_url || WHATSAPP_HREF;
}

/**
 * True if the plan should appear in the grid for the given currency.
 */
function planVisible(plan, currency) {
  if (plan.plan_type === 'school') return true;
  const obj = getPriceObj(plan, currency);
  return !!(obj && (obj.monthly > 0 || obj.yearly > 0));
}

// ── Animated price counter ────────────────────────────────────────────────────

function PriceCounter({ value }) {
  const spanRef = useRef(null);
  const prev    = useRef(value);
  useEffect(() => {
    if (!spanRef.current) return;
    const from = prev.current;
    const to   = value;
    prev.current = value;
    if (from === to) { spanRef.current.textContent = to; return; }
    gsap.to({ val: from }, {
      val: to, duration: .65, ease: 'power2.out',
      onUpdate()  { if (spanRef.current) spanRef.current.textContent = Math.round(this.targets()[0].val); },
      onComplete(){ if (spanRef.current) spanRef.current.textContent = to; },
    });
  }, [value]);
  return <span ref={spanRef}>{value}</span>;
}

function CheckIcon({ color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: 6, background: color,
      color: '#fff', fontSize: '.72rem', fontWeight: 900, flexShrink: 0,
    }}>✓</span>
  );
}

// ── Pricing card ──────────────────────────────────────────────────────────────

function PricingCard({ plan, isYearly, currency, lang }) {
  const cardRef     = useRef(null);
  const currData    = CURRENCIES.find(c => c.code === currency) || CURRENCIES[8];
  const priceObj    = getPriceObj(plan, currency) || { monthly: 0, yearly: 0 };
  const price       = isYearly ? (priceObj.yearly || 0) : (priceObj.monthly || 0);
  const period      = isYearly ? (lang === 'ar' ? '/سنة' : '/yr') : (lang === 'ar' ? '/شهر' : '/mo');
  const color       = plan.accent_color || '#185FA5';
  const isSchool    = plan.plan_type === 'school';
  const name        = lang === 'ar' ? plan.plan_name_ar : plan.plan_name_en;
  const features    = Array.isArray(plan.features_list) ? plan.features_list : [];
  const checkoutUrl = isSchool ? WHATSAPP_HREF : getCheckoutHref(plan, currency);

  function handleMouseMove(e) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const rx = ((e.clientY - rect.top  - rect.height / 2) / rect.height) *  6;
    const ry = ((e.clientX - rect.left - rect.width  / 2) / rect.width ) * -6;
    gsap.to(card, { rotateX: rx, rotateY: ry, duration: .3, ease: 'power2.out', transformPerspective: 800 });
  }
  function handleMouseLeave() {
    gsap.to(cardRef.current, { rotateX: 0, rotateY: 0, duration: .5, ease: 'elastic.out(1,.75)' });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        background: '#fff', borderRadius: 20,
        border: `2px solid ${plan.is_popular ? color : '#e2e8f0'}`,
        boxShadow: plan.is_popular
          ? `0 8px 32px ${color}28, 6px 6px 0 ${color}30`
          : '0 4px 20px rgba(0,0,0,.07), 4px 4px 0 rgba(0,0,0,.06)',
        padding: '28px 24px 24px',
        display: 'flex', flexDirection: 'column',
        position: 'relative', transformStyle: 'preserve-3d', willChange: 'transform',
      }}
    >
      {/* Price badge */}
      <div style={{
        position: 'absolute', top: -18, insetInlineEnd: 20,
        background: color, color: '#fff',
        borderRadius: '50%', width: 64, height: 64,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: '3px 3px 0 rgba(0,0,0,.18)',
        animation: 'priceBadgePop .5s cubic-bezier(.17,.67,.35,1.3) both',
        border: '2px solid rgba(255,255,255,.4)',
      }}>
        {isSchool ? (
          <span style={{ fontSize: '.65rem', fontWeight: 800, textAlign: 'center', lineHeight: 1.2, padding: '0 4px' }}>
            {lang === 'ar' ? 'تواصل\nمعنا' : 'Contact\nUs'}
          </span>
        ) : (
          <>
            <span style={{ fontSize: '.65rem', fontWeight: 700, opacity: .85 }}>{currData.symbol}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}><PriceCounter value={price} /></span>
            <span style={{ fontSize: '.55rem', fontWeight: 700, opacity: .85 }}>{period}</span>
          </>
        )}
      </div>

      {/* Popular badge */}
      {plan.is_popular && (
        <div style={{
          position: 'absolute', top: -12, insetInlineStart: 20,
          background: color, color: '#fff', borderRadius: 20, padding: '3px 12px',
          fontSize: '.72rem', fontWeight: 800, border: '2px solid rgba(255,255,255,.5)',
          boxShadow: '2px 2px 0 rgba(0,0,0,.15)',
        }}>
          {lang === 'ar' ? '⭐ الأكثر طلباً' : '⭐ POPULAR'}
        </div>
      )}

      <h3 style={{ fontWeight: 900, fontSize: '1.25rem', color: '#1a1a2e', marginTop: plan.is_popular ? 20 : 12, marginBottom: 16 }}>
        {name}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 20 }}>
        {features.map((feat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f8fafc', borderRadius: 8, border: '1.5px solid #e2e8f0' }}>
            <CheckIcon color={color} />
            <span style={{ fontSize: '.88rem', fontWeight: 600, color: '#334155' }}>
              {typeof feat === 'object' ? (lang === 'ar' ? feat.ar : feat.en) : feat}
            </span>
          </div>
        ))}
      </div>

      {isSchool ? (
        <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', width: '100%', padding: '11px 16px', background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '.9rem', borderRadius: 12, textAlign: 'center', textDecoration: 'none', border: '2px solid rgba(0,0,0,.1)', boxShadow: '4px 4px 0 rgba(0,0,0,.1)' }}>
          💬 {lang === 'ar' ? 'تواصل معنا للحصول على عرض' : 'Contact Us for a Quote'}
        </a>
      ) : (
        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', width: '100%', padding: '11px 16px', background: color, color: '#fff', fontWeight: 800, fontSize: '.9rem', borderRadius: 12, textAlign: 'center', textDecoration: 'none', border: '2px solid rgba(0,0,0,.1)', boxShadow: '4px 4px 0 rgba(0,0,0,.1)' }}>
          {lang === 'ar' ? 'اشترك الآن ←' : 'Get Started →'}
        </a>
      )}
    </div>
  );
}

// ── Currency selector ─────────────────────────────────────────────────────────

function CurrencySelect({ currency, onChange, lang, availableCodes }) {
  // Show only currencies with prices; if none detected yet, show all
  const visible = availableCodes.length > 1
    ? CURRENCIES.filter(c => availableCodes.includes(c.code))
    : CURRENCIES;
  if (visible.length <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '.85rem', fontWeight: 600, color: '#475569' }}>
        {lang === 'ar' ? 'العملة:' : 'Currency:'}
      </span>
      <div style={{ position: 'relative' }}>
        <select value={currency} onChange={e => onChange(e.target.value)}
          style={{
            appearance: 'none', WebkitAppearance: 'none',
            background: '#fff', border: '2px solid #e2e8f0',
            borderRadius: 50, padding: '6px 32px 6px 14px',
            fontSize: '.88rem', fontWeight: 700, color: '#1e293b',
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 1px 4px rgba(0,0,0,.07)', direction: 'ltr',
          }}>
          {visible.map(c => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code} — {lang === 'ar' ? c.label : c.labelEn}
            </option>
          ))}
        </select>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '.75rem', color: '#64748b' }}>▾</span>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function PricingSection() {
  const { lang } = useLanguage();
  const [plans,      setPlans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeType, setActiveType] = useState('lessons');
  const [isYearly,   setIsYearly]   = useState(false);
  const [currency,   setCurrency]   = useState('GBP');
  const sectionRef = useRef(null);

  useEffect(() => {
    fetch('/api/pricing')
      .then(r => r.json())
      .then(d => {
        const loaded = d.plans || [];
        setPlans(loaded);
        setLoading(false);

        // Auto-select first plan type that has plans
        const hasLessons = loaded.some(p => p.plan_type === 'lessons');
        if (!hasLessons && loaded.length > 0) {
          const order = ['lessons', 'content_only', 'family', 'school'];
          const first = order.find(t => loaded.some(p => p.plan_type === t));
          if (first) setActiveType(first);
        }

        // Determine if any plan uses new JSONB format
        const anyNewFormat = loaded.some(p => parsePricesMap(p.prices) !== null);

        if (anyNewFormat) {
          // Auto-select first currency (Gulf-first) that has at least one plan with price
          const order = ['QAR','SAR','AED','KWD','OMR','BHD','USD','EUR','GBP','TND'];
          const first = order.find(code =>
            loaded.some(p => {
              const map = parsePricesMap(p.prices);
              return map && (Number(map[code]?.monthly) > 0 || Number(map[code]?.yearly) > 0);
            })
          );
          if (first) setCurrency(first);
        }
        // else: keep GBP default → old-format fallback will show price_monthly
      })
      .catch(() => setLoading(false));
  }, []);

  // Scroll entrance animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        gsap.fromTo(el.querySelectorAll('.pricing-card-item'),
          { opacity: 0, y: 28, scale: .96 },
          { opacity: 1, y: 0, scale: 1, duration: .55, stagger: .1, ease: 'power2.out' }
        );
        obs.disconnect();
      }
    }, { threshold: .1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [plans, activeType]);

  // Currencies that have at least one plan with a price (for dropdown filter)
  const anyNewFormat = plans.some(p => parsePricesMap(p.prices) !== null);
  const availableCurrencyCodes = anyNewFormat
    ? CURRENCIES.map(c => c.code).filter(code =>
        plans.some(p => {
          const map = parsePricesMap(p.prices);
          return map && (Number(map[code]?.monthly) > 0 || Number(map[code]?.yearly) > 0);
        })
      )
    : [];

  // Plans to display for current type + currency
  const filtered = plans.filter(p => p.plan_type === activeType && planVisible(p, currency));

  // Show yearly toggle only when at least one plan has a yearly price
  const hasYearly = filtered.some(p => {
    const obj = getPriceObj(p, currency);
    return obj && obj.yearly > 0 && obj.yearly !== obj.monthly;
  });

  const title    = lang === 'ar' ? 'الاشتراكات والأسعار' : 'Plans & Pricing';
  const subtitle = lang === 'ar'
    ? 'اختر الخطة المناسبة لك — يمكنك إلغاء الاشتراك في أي وقت'
    : 'Choose the right plan for you — cancel anytime';

  return (
    <section ref={sectionRef} style={{
      background: 'linear-gradient(160deg, #f0f4fc 0%, #fafbff 60%, #f0f0f0 100%)',
      padding: '80px 0', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes priceBadgePop {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          70%  { transform: scale(1.18) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pricingGridDot {
          0%,100% { opacity:.06; } 50% { opacity:.14; }
        }
        .pricing-tab-btn {
          padding: 8px 20px; border-radius: 50px; font-size: .88rem; font-weight: 700;
          border: 2px solid transparent; cursor: pointer; transition: all .2s;
          font-family: inherit; white-space: nowrap;
        }
        .pricing-tab-btn:hover { transform: translateY(-1px); }
        .pricing-card-item { opacity: 0; }
        @media (max-width: 700px) { .pricing-grid-inner { grid-template-columns: 1fr !important; } }
        @media (max-width: 900px) { .pricing-tab-btn { font-size: .82rem; padding: 7px 14px; } }
      `}</style>

      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #18519920 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        animation: 'pricingGridDot 4s ease-in-out infinite',
      }} />

      <div className="container">

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', marginBottom: 8 }}>{title}</h2>
          <p style={{ color: '#64748b', fontSize: '.97rem', marginTop: 4 }}>{subtitle}</p>
        </div>

        {/* Plan type tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {PLAN_TYPES.map(pt => {
            const active   = activeType === pt.key;
            const hasPlans = plans.some(p => p.plan_type === pt.key);
            if (!hasPlans) return null;
            return (
              <button key={pt.key} onClick={() => setActiveType(pt.key)} className="pricing-tab-btn"
                style={{
                  background: active ? 'var(--primary)' : '#fff',
                  color:      active ? '#fff' : '#475569',
                  borderColor: active ? 'var(--primary)' : '#e2e8f0',
                  boxShadow:  active ? '0 4px 14px rgba(24,95,165,.28)' : '0 1px 4px rgba(0,0,0,.06)',
                }}>
                {lang === 'ar' ? pt.labelAr : pt.labelEn}
              </button>
            );
          })}
        </div>

        {/* Controls row: toggle + currency */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 36 }}>

          {hasYearly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 600, color: !isYearly ? 'var(--primary)' : '#94a3b8', fontSize: '.92rem' }}>
                {lang === 'ar' ? 'شهري' : 'Monthly'}
              </span>
              <button onClick={() => setIsYearly(v => !v)}
                style={{ width: 52, height: 28, borderRadius: 99, background: isYearly ? 'var(--primary)' : '#cbd5e1', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .25s' }}
                aria-label="toggle billing period">
                <span style={{
                  position: 'absolute', top: 3, insetInlineStart: isYearly ? 26 : 3,
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,.2)', transition: 'inset-inline-start .25s',
                }} />
              </button>
              <span style={{ fontWeight: 600, color: isYearly ? 'var(--primary)' : '#94a3b8', fontSize: '.92rem' }}>
                {lang === 'ar' ? 'سنوي' : 'Yearly'}
              </span>
              {isYearly && (
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: '.78rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99, border: '1px solid #bbf7d0' }}>
                  {lang === 'ar' ? '🎁 وفّر حتى 20%' : '🎁 Save up to 20%'}
                </span>
              )}
            </div>
          )}

          <CurrencySelect
            currency={currency}
            onChange={setCurrency}
            lang={lang}
            availableCodes={availableCurrencyCodes}
          />
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: '.95rem' }}>
            {lang === 'ar' ? 'لم تُضف باقات لهذا النوع بعد.' : 'No plans added for this type yet.'}
          </div>
        ) : (
          <div className="pricing-grid-inner" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(filtered.length, 3)}, 1fr)`,
            gap: 24, maxWidth: 960, margin: '0 auto',
          }}>
            {filtered.map(plan => (
              <div key={plan.id} className="pricing-card-item">
                <PricingCard plan={plan} isYearly={isYearly} currency={currency} lang={lang} />
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: '.8rem', color: '#94a3b8' }}>
          {lang === 'ar'
            ? '* جميع الباقات تشمل الدعم الفني · يمكن الإلغاء في أي وقت'
            : '* All plans include support · Cancel anytime'}
        </p>
      </div>
    </section>
  );
}
