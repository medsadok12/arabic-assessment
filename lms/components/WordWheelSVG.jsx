'use client';

/* عجلة الحروف المرسومة — نفس الرسم في لعبة «عجلة الكلمات» ومعاينتها في
   الصفحة الرئيسية الجديدة. الحرف الذي استُعمل بعدد مرات وجوده يصير رمادياً. */
export default function WheelSVG({ letters, center, selectedLetters, onLetterClick }) {
  const cx=160, cy=160, outerR=105, circleR=28, centerR=46;
  const n=letters.length;
  return (
    <svg viewBox="0 0 320 320" width="100%" style={{maxWidth:320,userSelect:'none'}}>
      <defs>
        <radialGradient id="ww-gold" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FDE68A"/>
          <stop offset="100%" stopColor="#D97706"/>
        </radialGradient>
        <radialGradient id="ww-center" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FEF3C7"/>
          <stop offset="100%" stopColor="#F59E0B"/>
        </radialGradient>
        <filter id="ww-shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18"/></filter>
      </defs>
      {letters.map((_,i)=>{
        const angle=i*(2*Math.PI/n)-Math.PI/2;
        const ox=cx+outerR*Math.cos(angle), oy=cy+outerR*Math.sin(angle);
        return <line key={`l${i}`} x1={cx} y1={cy} x2={ox} y2={oy} stroke="#FDE68A" strokeWidth="1.5" opacity="0.6"/>;
      })}
      {letters.map((letter,i)=>{
        const angle=i*(2*Math.PI/n)-Math.PI/2;
        const ox=cx+outerR*Math.cos(angle), oy=cy+outerR*Math.sin(angle);
        const used=selectedLetters.filter(l=>l===letter).length;
        const total=letters.filter(l=>l===letter).length;
        const usedUp=used>=total;
        return (
          <g key={`o${i}`} onClick={()=>!usedUp&&onLetterClick(letter)} style={{cursor:usedUp?'not-allowed':'pointer'}}>
            <circle cx={ox} cy={oy} r={circleR+4} fill="transparent"/>
            <circle cx={ox} cy={oy} r={circleR} fill={usedUp?'#E5E7EB':'url(#ww-gold)'} stroke={usedUp?'#D1D5DB':'#F59E0B'} strokeWidth="2" filter="url(#ww-shadow)" style={{transition:'all 0.15s'}}/>
            <text x={ox} y={oy+1} textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="800" fill={usedUp?'#9CA3AF':'#92400E'} fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>{letter}</text>
          </g>
        );
      })}
      <g onClick={()=>onLetterClick(center)} style={{cursor:'pointer'}}>
        <circle cx={cx} cy={cy} r={centerR+6} fill="transparent"/>
        <circle cx={cx} cy={cy} r={centerR} fill="url(#ww-center)" stroke="#D97706" strokeWidth="3" filter="url(#ww-shadow)"/>
        <text x={cx} y={cy+2} textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="900" fill="#78350F" fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>{center}</text>
        <text x={cx} y={cy+centerR-10} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="#B45309" opacity="0.75" fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>إلزامي</text>
      </g>
    </svg>
  );
}
