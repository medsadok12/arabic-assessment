'use client';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import gsap from 'gsap';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

// العملة الوحيدة المعروضة في هذا القسم — القاعدة لا تزال تخزّن بقية العملات
// (prices/checkout_urls لكل عملة) لإمكانية إعادة تفعيل اختيار العملة لاحقاً
// بلا أي تغيير في البنية، لكن هذه النسخة من القسم تعرض ر.ق حصراً كما طُلب.
const CURRENCY = 'QAR';
const CURRENCY_SYMBOL = 'ر.ق';

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parsePricesMap(raw) {
  if (!raw) return null;
  let map = raw;
  if (typeof map === 'string') {
    try { map = JSON.parse(map); } catch { return null; }
  }
  if (typeof map !== 'object' || Array.isArray(map)) return null;
  return map;
}

function parseUrlsMap(raw) {
  if (!raw) return {};
  let map = raw;
  if (typeof map === 'string') {
    try { map = JSON.parse(map); } catch { return {}; }
  }
  return (typeof map === 'object' && !Array.isArray(map)) ? map : {};
}

/** السعر الفعلي المعروض لهذه الباقة حسب دورة الفوترة الخاصة بها */
function getDisplayPrice(plan) {
  const map = parsePricesMap(plan.prices) || {};
  const entry = map[CURRENCY] || {};
  if (plan.billing_period === 'yearly') return Number(entry.yearly) || 0;
  // 'monthly' و 'one_time' كلاهما يُخزَّنان في حقل monthly نفسه
  return Number(entry.monthly) || 0;
}

function getCheckoutHref(plan) {
  const urls = parseUrlsMap(plan.checkout_urls);
  return urls[CURRENCY] || plan.checkout_url || WHATSAPP_HREF;
}

function periodLabel(plan, lang) {
  if (plan.billing_period === 'yearly') return lang === 'ar' ? '/سنة' : '/yr';
  if (plan.billing_period === 'one_time') return lang === 'ar' ? '/حصة' : '/session';
  return lang === 'ar' ? '/شهر' : '/mo';
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

function PricingCard({ plan, lang }) {
  const cardRef  = useRef(null);
  const isSchool = plan.plan_type === 'school';
  const price    = getDisplayPrice(plan);
  const period   = periodLabel(plan, lang);
  const color    = plan.accent_color || '#1A2B4A';
  const name     = lang === 'ar' ? plan.plan_name_ar : plan.plan_name_en;
  const features = Array.isArray(plan.features_list) ? plan.features_list : [];
  const checkoutUrl = isSchool ? WHATSAPP_HREF : getCheckoutHref(plan);
  const ctaLabel = isSchool
    ? (lang === 'ar' ? '💬 تواصل معنا للحصول على عرض' : '💬 Contact Us for a Quote')
    : (lang === 'ar'
        ? (plan.cta_label_ar || 'اشترك الآن ←')
        : (plan.cta_label_en || 'Get Started →'));
  const badgeLabel = plan.badge_text || (lang === 'ar' ? '⭐ الأكثر طلباً' : '⭐ POPULAR');

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
            <span style={{ fontSize: '.65rem', fontWeight: 700, opacity: .85 }}>{CURRENCY_SYMBOL}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}><PriceCounter value={price} /></span>
            <span style={{ fontSize: '.5rem', fontWeight: 700, opacity: .85 }}>{period}</span>
          </>
        )}
      </div>

      {/* Badge */}
      {plan.is_popular && (
        <div style={{
          position: 'absolute', top: -12, insetInlineStart: 20,
          background: color, color: '#fff', borderRadius: 20, padding: '3px 12px',
          fontSize: '.72rem', fontWeight: 800, border: '2px solid rgba(255,255,255,.5)',
          boxShadow: '2px 2px 0 rgba(0,0,0,.15)', whiteSpace: 'nowrap',
        }}>
          {badgeLabel}
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

      <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
        style={{
          display: 'block', width: '100%', padding: '11px 16px',
          background: isSchool ? '#25D366' : color, color: '#fff', fontWeight: 800, fontSize: '.9rem',
          borderRadius: 12, textAlign: 'center', textDecoration: 'none',
          border: '2px solid rgba(0,0,0,.1)', boxShadow: '4px 4px 0 rgba(0,0,0,.1)',
        }}>
        {ctaLabel}
      </a>
    </div>
  );
}

// ── جدول مقارنة الميزات (ثابت البنية، يعرض أسماء الباقات الثلاث الحيّة من القاعدة) ──
// ملاحظة: القيم هنا ثابتة بافتراض وجود 3 باقات بهذا الترتيب تحديداً (فردية/شهرية/سنوية).
// لو أُضيفت باقة رابعة أو أُعيد ترتيبها من bogga، يحتاج هذا الجدول مراجعة يدوية.
function comparisonRows(lang) {
  const yes = '✓';
  const no  = '—';
  return [
    { label: lang === 'ar' ? 'نمط الحصص' : 'Session format',
      values: lang === 'ar'
        ? ['حصة واحدة تجريبية', 'حصص أسبوعية منتظمة', 'حصص أسبوعية منتظمة']
        : ['One trial session', 'Regular weekly sessions', 'Regular weekly sessions'] },
    { label: lang === 'ar' ? 'نظام التقييم الذكي' : 'Smart assessment system', values: [yes, yes, yes] },
    { label: lang === 'ar' ? 'دليل الطالب الرقمي' : 'Digital student guide', values: [no, yes, yes] },
    { label: lang === 'ar' ? 'المكتبة التفاعلية' : 'Interactive library', values: [no, yes, yes] },
    { label: lang === 'ar' ? 'تقارير أداء دورية' : 'Regular performance reports', values: [no, yes, yes] },
    { label: lang === 'ar' ? 'إلغاء أو تعديل في أي وقت' : 'Cancel or change anytime', values: [no, yes, yes] },
    { label: lang === 'ar' ? 'التوفير مقارنة بالسعر الشهري' : 'Savings vs. monthly price',
      values: [no, no, lang === 'ar' ? '💰 20%' : '💰 20%'] },
  ];
}

function ComparisonTable({ plans, lang }) {
  if (plans.length < 2) return null;
  const rows = comparisonRows(lang);
  return (
    <div className="table-scroll-wrapper" style={{ maxWidth: 960, margin: '40px auto 0' }}>
      <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
        <thead>
          <tr style={{ background: 'var(--primary)' }}>
            <th style={{ padding: '14px 16px', textAlign: lang === 'ar' ? 'right' : 'left', color: '#fff', fontSize: '.85rem', fontWeight: 700 }}>
              {lang === 'ar' ? 'الميزة' : 'Feature'}
            </th>
            {plans.map(p => (
              <th key={p.id} style={{ padding: '14px 10px', textAlign: 'center', color: '#fff', fontSize: '.85rem', fontWeight: 800 }}>
                {lang === 'ar' ? p.plan_name_ar : p.plan_name_en}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 ? '#f8fafc' : '#fff' }}>
              <td style={{ padding: '12px 16px', fontSize: '.85rem', fontWeight: 600, color: '#334155' }}>{row.label}</td>
              {row.values.map((v, j) => (
                <td key={j} style={{
                  padding: '12px 10px', textAlign: 'center', fontSize: '.85rem', fontWeight: 700,
                  color: v === '—' ? '#cbd5e1' : (v === '✓' ? '#2ABB7A' : '#1a1a2e'),
                }}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function PricingSection() {
  const { lang } = useLanguage();
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);

  useEffect(() => {
    fetch('/api/pricing', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const seen = new Set();
        const deduped = (d.plans || []).filter(p => {
          const key = `${p.plan_name_ar}||${p.plan_type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        deduped.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setPlans(deduped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
  }, [plans]);

  const title    = lang === 'ar' ? 'الاشتراكات والأسعار' : 'Plans & Pricing';
  const subtitle = lang === 'ar'
    ? 'اختر الخطة المناسبة لك — يمكنك إلغاء الاشتراك في أي وقت'
    : 'Choose the right plan for you — cancel anytime';
  const flexibilityNote = lang === 'ar'
    ? '* جميع الباقات تشمل الدعم الفني وتغطية المناهج، ويمكنك إلغاء الاشتراك أو التعديل في أي وقت.'
    : '* All plans include technical support and curriculum coverage — cancel or change your subscription anytime.';

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
        .pricing-card-item { opacity: 0; }
        @media (max-width: 700px) { .pricing-grid-inner { grid-template-columns: 1fr !important; } }
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

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: '#e2e8f0', width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: '.95rem' }}>
            {lang === 'ar' ? 'لم تُضف باقات بعد.' : 'No plans added yet.'}
          </div>
        ) : (
          <div className="pricing-grid-inner" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`,
            gap: 24, maxWidth: 960, margin: '0 auto',
          }}>
            {plans.map(plan => (
              <div key={plan.id} className="pricing-card-item">
                <PricingCard plan={plan} lang={lang} />
              </div>
            ))}
          </div>
        )}

        {!loading && plans.length > 0 && (
          <p style={{ textAlign: 'center', marginTop: 32, fontSize: '.92rem', fontWeight: 600, color: '#475569', maxWidth: 700, marginInline: 'auto' }}>
            {flexibilityNote}
          </p>
        )}

        {!loading && <ComparisonTable plans={plans} lang={lang} />}
      </div>
    </section>
  );
}
