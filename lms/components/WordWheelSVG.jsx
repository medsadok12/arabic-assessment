'use client';
import { useId } from 'react';
import { resolveTheme } from '../lib/word-wheel';

const GOLD = resolveTheme(null);

/* عجلة الحروف المرسومة — نفس الرسم في لعبة «عجلة الكلمات» ولوحة إدارتها
   ومعاينتها في الصفحة الرئيسية. الحرف الذي استُعمل بعدد مرات وجوده يصير رمادياً.
   theme: ألوان resolveTheme (الافتراضي الذهبي الأصلي حرفياً).
   centerLabel: كلمة تحت الحرف الأوسط («إلزامي» في التحدي) أو null.
   highlight: حرف يتوهّج (تلميح «أكمل الكلمة»). */
export default function WheelSVG({
  letters, center, selectedLetters = [], onLetterClick = () => {}, theme = GOLD,
  centerLabel = 'إلزامي', highlight = null, disabled = false,
}) {
  const uid = useId().replace(/:/g, '');
  const cx=160, cy=160, outerR=105, circleR=28, centerR=46;
  const n=letters.length;
  const t = theme || GOLD;
  const tap = (letter) => { if (!disabled) onLetterClick(letter); };
  return (
    <svg viewBox="0 0 320 320" width="100%" style={{maxWidth:320,userSelect:'none',touchAction:'manipulation'}} role="group" aria-label="عجلة الحروف">
      <defs>
        <radialGradient id={`ww-outer-${uid}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={t.outer_light}/>
          <stop offset="100%" stopColor={t.outer_bg}/>
        </radialGradient>
        <radialGradient id={`ww-center-${uid}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={t.center_light}/>
          <stop offset="100%" stopColor={t.center_bg}/>
        </radialGradient>
        <filter id={`ww-shadow-${uid}`}><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18"/></filter>
      </defs>
      <style>{`@keyframes wwGlow-${uid}{0%,100%{opacity:.25}50%{opacity:.9}}`}</style>
      {letters.map((_,i)=>{
        const angle=i*(2*Math.PI/n)-Math.PI/2;
        const ox=cx+outerR*Math.cos(angle), oy=cy+outerR*Math.sin(angle);
        return <line key={`l${i}`} x1={cx} y1={cy} x2={ox} y2={oy} stroke={t.outer_light} strokeWidth="1.5" opacity="0.6"/>;
      })}
      {letters.map((letter,i)=>{
        const angle=i*(2*Math.PI/n)-Math.PI/2;
        const ox=cx+outerR*Math.cos(angle), oy=cy+outerR*Math.sin(angle);
        // نسخ الحرف قبل هذه في العجلة تُستهلك أولاً
        const used=selectedLetters.filter(l=>l===letter).length;
        const before=letters.slice(0,i).filter(l=>l===letter).length;
        const usedUp=used>before;
        return (
          <g key={`o${i}`} onClick={()=>!usedUp&&tap(letter)} style={{cursor:usedUp||disabled?'not-allowed':'pointer'}}
            role="button" aria-label={`الحرف ${letter}`} aria-disabled={usedUp||disabled}>
            <circle cx={ox} cy={oy} r={circleR+4} fill="transparent"/>
            {highlight===letter&&!usedUp&&(
              <circle cx={ox} cy={oy} r={circleR+7} fill="none" stroke="#FACC15" strokeWidth="5" style={{animation:`wwGlow-${uid} .9s ease-in-out infinite`}}/>
            )}
            <circle cx={ox} cy={oy} r={circleR} fill={usedUp?'#E5E7EB':`url(#ww-outer-${uid})`} stroke={usedUp?'#D1D5DB':t.outer_stroke} strokeWidth="2" filter={`url(#ww-shadow-${uid})`} style={{transition:'all 0.15s'}}/>
            <text x={ox} y={oy+1} textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="800" fill={usedUp?'#9CA3AF':t.outer_text} fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>{letter}</text>
          </g>
        );
      })}
      <g onClick={()=>tap(center)} style={{cursor:disabled?'not-allowed':'pointer'}} role="button" aria-label={`الحرف ${center}${centerLabel?` ${centerLabel}`:''}`}>
        <circle cx={cx} cy={cy} r={centerR+6} fill="transparent"/>
        {highlight===center&&(
          <circle cx={cx} cy={cy} r={centerR+8} fill="none" stroke="#FACC15" strokeWidth="6" style={{animation:`wwGlow-${uid} .9s ease-in-out infinite`}}/>
        )}
        <circle cx={cx} cy={cy} r={centerR} fill={`url(#ww-center-${uid})`} stroke={t.center_stroke} strokeWidth="3" filter={`url(#ww-shadow-${uid})`}/>
        <text x={cx} y={cy+2} textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="900" fill={t.center_text} fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>{center}</text>
        {centerLabel&&(
          <text x={cx} y={cy+centerR-10} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill={t.center_label} opacity="0.75" fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>{centerLabel}</text>
        )}
      </g>
    </svg>
  );
}
