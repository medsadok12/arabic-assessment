/* يلفّ صفحات الألعاب بخط النسخ المدرسي (.game-font في globals.css). display:contents — لا صندوق
   إضافي، فلا يتغير تخطيط أي لعبة؛ الخط وحده ينتقل لكل ما بداخلها */
export default function GameFont({ children }) {
  return <div className="game-font" style={{ display: 'contents' }}>{children}</div>;
}
