'use client';
import Image from 'next/image';
import { useLanguage } from '../../contexts/LanguageContext';

/* فصل «فهيم معك في كل خطوة» البنفسجي في الصفحة الرئيسية — مخفي حالياً بطلب
   الأستاذ محمد (2026-10-15). يظهر بتغيير SHOW_FAHEEM_CHAPTER في LandingPage.jsx
   إلى true فقط؛ النصوص landing.faheem* في translations/index.js. */
export default function FaheemChapter() {
  const { t } = useLanguage();
  return (
    <section className="faheem-chapter">
      <style dangerouslySetInnerHTML={{ __html: FAHEEM_CSS }} />
      <div className="container">
        <span className="faheem-tag">{t('landing.faheemTag')}</span>
        <h2>{t('landing.faheemTitle')}</h2>
        <Image src="/faheem.png" alt="فهيم" width={555} height={707} className="faheem-pic" />
        <div className="faheem-skills">
          {t('landing.faheemSkills').map(s => (
            <span key={s} className="faheem-pill">{s}</span>
          ))}
        </div>
        <p className="faheem-fact">{t('landing.faheemFact')}</p>
      </div>
    </section>
  );
}

const FAHEEM_CSS = `
  .faheem-chapter{ background:linear-gradient(165deg,#7C5CD9,#5f3fc4); padding:72px 0; }
  .faheem-chapter .container{ display:flex; flex-direction:column; align-items:center; gap:24px; text-align:center; }
  .faheem-tag{ color:#E8B84B; font-weight:800; font-size:.85rem; letter-spacing:.3px; }
  .faheem-chapter h2{ color:#fff; font-size:1.9rem; font-weight:900; max-width:18ch; margin:0; }
  .faheem-pic{ width:auto; height:188px; flex-shrink:0; filter:drop-shadow(0 14px 22px rgba(0,0,0,.25)); }
  .faheem-skills{ display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
  .faheem-pill{ background:rgba(255,255,255,.22); border:1.5px solid rgba(255,255,255,.4); color:#fff; font-size:.85rem; font-weight:700; border-radius:999px; padding:9px 18px; }
  .faheem-fact{ background:#fff; border-radius:18px; padding:20px 24px; max-width:48ch; color:#475569; font-size:.92rem; line-height:1.9; }
  .faheem-fact b{ color:#1A2B4A; }
  @media (max-width:480px){
    .faheem-chapter{ padding:52px 0; }
    .faheem-chapter h2{ font-size:1.5rem; }
    .faheem-pic{ height:148px; }
  }
`;
