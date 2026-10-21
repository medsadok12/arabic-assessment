'use client';
import { memo } from 'react';
import { sceneFor } from '../lib/game-scenes';

/* ════════════════════════════════════════════════════════════════
   خلفيات الألعاب المرسومة — لكل مجموعة كلمات عالمها (lib/game-scenes.js يربط الاسم بالمشهد).
   الرسم 1200×844 مثبّت من الأسفل (xMidYMax slice): الجوال يرى الوسط (x≈405–795)
   والأرض أسفل البطاقات، والآيباد والحاسوب يريان الجانبين كاملين. لذلك الأشياء
   المميِّزة لكل عالم في شريط الأرض الأوسط (للجوال) وعلى الجانبين (للشاشات الكبيرة)،
   وزاوية أسفل اليمين متروكة لفهيم.
   الألوان من هوية الأكاديمية (القسم 2.1) ودرجاتها، مع ألوان الطبيعة الهادئة.
════════════════════════════════════════════════════════════════ */

const W = 1200;
const H = 844;

/* ── أدوات رسم مشتركة ── */
function Sky({ id, stops }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
    </>
  );
}

function Sun({ x, y, r = 44 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 1.8} fill="#FCEFC4" opacity="0.6" />
      <circle cx={x} cy={y} r={r} fill="#F5CC5E" />
    </g>
  );
}

function Cloud({ x, y, s = 1, fill = '#FFFFFF' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} opacity="0.95">
      <ellipse cx="0" cy="0" rx="52" ry="17" />
      <ellipse cx="24" cy="-14" rx="29" ry="20" />
      <ellipse cx="-16" cy="-9" rx="21" ry="15" />
    </g>
  );
}

function Birds({ x, y }) {
  return (
    <g fill="none" stroke="#1A2B4A" strokeWidth="2" strokeLinecap="round" opacity="0.45">
      <path d={`M${x} ${y} q6 -6 12 0 q6 -6 12 0`} />
      <path d={`M${x + 36} ${y + 18} q4 -4 8 0 q4 -4 8 0`} />
    </g>
  );
}

function Ground({ id, d, top, bottom }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id})`} />
    </>
  );
}

function Blades({ xs, color }) {
  return (
    <g stroke={color} strokeWidth="3" strokeLinecap="round">
      {xs.map((x, i) => <path key={i} d={`M${x} 844 L ${x + (i % 2 ? -5 : 8)} ${806 - (i % 3) * 8}`} />)}
    </g>
  );
}

function Flowers({ pts }) {
  return (
    <g>
      {pts.map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="6" fill={c} />
          <circle cx={x} cy={y} r="2.5" fill={c === '#E8B84B' ? '#FFFFFF' : '#E8B84B'} />
        </g>
      ))}
    </g>
  );
}

function RoundTree({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-7" y="-96" width="14" height="96" rx="6" fill="#7A5A3A" />
      <circle cx="0" cy="-126" r="46" fill="#5E9F50" />
      <circle cx="-36" cy="-100" r="30" fill="#5E9F50" />
      <circle cx="36" cy="-100" r="30" fill="#5E9F50" />
      <circle cx="-8" cy="-138" r="28" fill="#6FB15C" />
    </g>
  );
}

function FruitTree({ x, y, s = 1 }) {
  const fruits = [[-24, -120, '#E25B4B'], [18, -146, '#E8B84B'], [30, -100, '#E25B4B'], [-36, -94, '#E8B84B'], [4, -110, '#E25B4B'], [-10, -150, '#E25B4B']];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <RoundTree x={0} y={0} />
      {fruits.map(([fx, fy, c], i) => <circle key={i} cx={fx} cy={fy} r="7" fill={c} />)}
    </g>
  );
}

function Acacia({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g stroke="#6B4B2E" strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M0 0 C 2 -44 -4 -74 -14 -102" />
        <path d="M0 0 C 4 -42 20 -74 36 -96" />
      </g>
      <ellipse cx="10" cy="-106" rx="74" ry="16" fill="#5C7838" />
      <ellipse cx="28" cy="-118" rx="46" ry="12" fill="#6F8D45" />
    </g>
  );
}

function Hills({ far, near, farFill, nearFill }) {
  return (
    <>
      <path d={far} fill={farFill} />
      <path d={near} fill={nearFill} />
    </>
  );
}

function Windows({ x, y, cols, rows, fill = '#F6D27A' }) {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    out.push(<rect key={`${r}-${c}`} x={x + c * 28} y={y + r * 36} width="14" height="20" rx="2" fill={fill} opacity="0.85" />);
  }
  return <g>{out}</g>;
}

function Fence({ y, step = 70 }) {
  const posts = [];
  for (let x = 14; x < W; x += step) posts.push(<rect key={x} x={x} y={y - 12} width="12" height="62" rx="4" />);
  return (
    <g fill="#E9D3A8" stroke="#B8935E" strokeWidth="2">
      <rect x="-6" y={y} width={W + 12} height="9" rx="4" />
      <rect x="-6" y={y + 24} width={W + 12} height="9" rx="4" />
      {posts}
    </g>
  );
}

function Floor({ y, fill, line }) {
  const lines = [];
  for (let x = 0; x < W; x += 150) lines.push(<path key={x} d={`M${x} ${y} L ${x - 40} ${H}`} />);
  return (
    <g>
      <rect x="0" y={y} width={W} height={H - y} fill={fill} />
      <g stroke={line} strokeWidth="3">{lines}</g>
    </g>
  );
}

/* ── العوالم ── */

function Savanna() {
  return (
    <>
      <Sky id="gs-sv" stops={[[0, '#9CC9E8'], [0.5, '#D6E8EE'], [0.7, '#F7E6BE']]} />
      <Sun x={700} y={150} />
      <Cloud x={470} y={120} /><Cloud x={640} y={262} s={0.8} /><Cloud x={180} y={140} s={1.1} /><Cloud x={1010} y={120} /><Cloud x={880} y={290} s={0.7} />
      <Birds x={540} y={200} />
      <Hills far="M0 470 Q 150 425 300 455 T 600 442 T 900 452 T 1200 440 V 844 H 0 Z" near="M0 530 Q 200 482 400 516 T 800 504 T 1200 512 V 844 H 0 Z" farFill="#DCC791" nearFill="#CFB46A" />
      <Acacia x={760} y={520} s={0.55} />
      <Acacia x={150} y={580} s={1.35} />
      <Acacia x={1060} y={590} s={1.15} />
      <Ground id="gs-sv-g" d="M0 612 Q 300 584 600 602 T 1200 596 V 844 H 0 Z" top="#E8CC78" bottom="#C49E42" />
      <Acacia x={455} y={645} s={0.85} />
      <ellipse cx="612" cy="790" rx="46" ry="16" fill="#B49C74" />
      <ellipse cx="584" cy="800" rx="22" ry="10" fill="#A58D66" />
      <ellipse cx="300" cy="760" rx="40" ry="14" fill="#B49C74" />
      <ellipse cx="960" cy="770" rx="44" ry="15" fill="#B49C74" />
      <Blades color="#A88332" xs={[20, 34, 50, 140, 156, 170, 420, 434, 520, 534, 548, 660, 676, 850, 864, 1100, 1116, 1130]} />
      <Flowers pts={[[500, 760, '#FFFFFF'], [522, 784, '#A48BE6'], [660, 740, '#FFFFFF'], [240, 780, '#E8B84B'], [1000, 740, '#FFFFFF'], [380, 730, '#A48BE6']]} />
    </>
  );
}

function Orchard() {
  return (
    <>
      <Sky id="gs-or" stops={[[0, '#B7DDEF'], [0.5, '#E4F1EA'], [0.7, '#F4EFE6']]} />
      <Sun x={480} y={150} r={38} />
      <Cloud x={700} y={110} /><Cloud x={300} y={130} s={1.1} /><Cloud x={1000} y={160} s={0.9} /><Cloud x={560} y={250} s={0.7} />
      <Hills far="M0 480 Q 200 438 400 466 T 800 456 T 1200 462 V 844 H 0 Z" near="M0 540 Q 220 500 440 528 T 880 518 T 1200 524 V 844 H 0 Z" farFill="#BEDD9E" nearFill="#A3CF84" />
      <FruitTree x={930} y={560} s={0.6} />
      <FruitTree x={140} y={622} s={1.3} />
      <FruitTree x={1060} y={622} s={1.3} />
      <FruitTree x={445} y={606} s={0.85} />
      <FruitTree x={790} y={600} s={0.75} />
      <Ground id="gs-or-g" d="M0 612 Q 300 590 600 604 T 1200 598 V 844 H 0 Z" top="#8DC66F" bottom="#679F4F" />
      <Fence y={648} />
      <g transform="translate(540 776)">
        <circle cx="-28" cy="-30" r="16" fill="#E25B4B" />
        <circle cx="0" cy="-36" r="17" fill="#E8B84B" />
        <circle cx="28" cy="-30" r="16" fill="#E25B4B" />
        <circle cx="-12" cy="-48" r="14" fill="#7CBF62" />
        <circle cx="16" cy="-50" r="13" fill="#E25B4B" />
        <path d="M-46 -24 C -40 -80 40 -80 46 -24" fill="none" stroke="#8A6235" strokeWidth="5" />
        <path d="M-56 -24 L 56 -24 L 44 30 L -44 30 Z" fill="#C8955A" stroke="#8A6235" strokeWidth="3" strokeLinejoin="round" />
        <path d="M-50 -6 H 50 M-47 12 H 47" stroke="#8A6235" strokeWidth="2" />
      </g>
      <circle cx="642" cy="812" r="8" fill="#E25B4B" />
      <circle cx="430" cy="822" r="7" fill="#E8B84B" />
      <Flowers pts={[[430, 730, '#FFFFFF'], [470, 806, '#A48BE6'], [660, 736, '#FFFFFF'], [250, 760, '#E8B84B'], [900, 780, '#FFFFFF'], [1100, 740, '#A48BE6']]} />
    </>
  );
}

function SeaWeed({ x, h, c, w }) {
  const y = 732;
  return <path d={`M${x} ${y} C ${x - 12} ${y - h * 0.25} ${x + 14} ${y - h * 0.45} ${x} ${y - h * 0.6} C ${x - 12} ${y - h * 0.75} ${x + 10} ${y - h * 0.9} ${x + 2} ${y - h}`} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" />;
}

function Coral({ x, c }) {
  return (
    <g fill="none" stroke={c} strokeWidth="7" strokeLinecap="round">
      <path d={`M${x} 742 L ${x} 690`} />
      <path d={`M${x} 714 L ${x - 20} 686`} />
      <path d={`M${x} 702 L ${x + 20} 674`} />
      <path d={`M${x - 20} 686 L ${x - 28} 666`} />
    </g>
  );
}

function Sea() {
  return (
    <>
      <Sky id="gs-se" stops={[[0, '#9ADBEA'], [0.35, '#4BA3C7'], [0.75, '#2C5E8F'], [1, '#1A2B4A']]} />
      <g fill="#FFFFFF" opacity="0.12">
        <path d="M80 0 L 160 0 L 110 480 L 60 480 Z" />
        <path d="M430 0 L 490 0 L 470 430 L 430 430 Z" />
        <path d="M680 0 L 750 0 L 710 500 L 670 500 Z" />
        <path d="M960 0 L 1030 0 L 1000 460 L 960 460 Z" />
      </g>
      <path d="M0 18 Q 30 8 60 18 T 120 18 T 180 18 T 240 18 T 300 18 T 360 18 T 420 18 T 480 18 T 540 18 T 600 18 T 660 18 T 720 18 T 780 18 T 840 18 T 900 18 T 960 18 T 1020 18 T 1080 18 T 1140 18 T 1200 18" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.4" />
      <g fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.55">
        <circle cx="430" cy="300" r="7" /><circle cx="442" cy="270" r="4" /><circle cx="434" cy="246" r="3" />
        <circle cx="786" cy="380" r="8" /><circle cx="776" cy="350" r="5" />
        <circle cx="610" cy="650" r="5" /><circle cx="618" cy="626" r="3" />
        <circle cx="200" cy="480" r="9" /><circle cx="214" cy="446" r="5" />
        <circle cx="1020" cy="420" r="8" /><circle cx="1010" cy="388" r="4" />
      </g>
      <g opacity="0.85">
        <ellipse cx="720" cy="240" rx="18" ry="9" fill="#E8B84B" /><path d="M736 240 L 750 230 L 750 250 Z" fill="#E8B84B" />
        <ellipse cx="470" cy="430" rx="14" ry="7" fill="#A48BE6" /><path d="M456 430 L 444 422 L 444 438 Z" fill="#A48BE6" />
        <ellipse cx="500" cy="450" rx="10" ry="5" fill="#A48BE6" /><path d="M490 450 L 482 445 L 482 455 Z" fill="#A48BE6" />
        <ellipse cx="1000" cy="300" rx="20" ry="10" fill="#E8B84B" /><path d="M1018 300 L 1034 288 L 1034 312 Z" fill="#E8B84B" />
        <ellipse cx="200" cy="260" rx="16" ry="8" fill="#A48BE6" /><path d="M186 260 L 172 251 L 172 269 Z" fill="#A48BE6" />
      </g>
      <path d="M0 724 Q 300 700 600 716 T 1200 708 V 844 H 0 Z" fill="#EAD9B0" />
      <path d="M0 760 Q 300 742 600 756 T 1200 750 V 844 H 0 Z" fill="#DFC995" />
      <SeaWeed x={430} h={190} c="#2ABB7A" w={9} />
      <SeaWeed x={458} h={150} c="#1E9E64" w={7} />
      <SeaWeed x={770} h={170} c="#1E9E64" w={8} />
      <SeaWeed x={120} h={240} c="#2ABB7A" w={10} />
      <SeaWeed x={160} h={180} c="#1E9E64" w={8} />
      <SeaWeed x={1070} h={220} c="#2ABB7A" w={10} />
      <SeaWeed x={1110} h={160} c="#1E9E64" w={7} />
      <Coral x={530} c="#E8B84B" />
      <Coral x={650} c="#A48BE6" />
      <Coral x={300} c="#A48BE6" />
      <Coral x={900} c="#E8B84B" />
      <path d="M580 792 a 10 10 0 0 1 20 0 Z" fill="#F4EFE6" stroke="#C9A974" strokeWidth="2" />
      <path d="M494 788 l 5 10 l 11 2 l -8 7 l 2 11 l -10 -5 l -10 5 l 2 -11 l -8 -7 l 11 -2 Z" fill="#E8B84B" stroke="#B07F1E" strokeWidth="1.5" />
      <circle cx="380" cy="806" r="5" fill="#F4EFE6" />
    </>
  );
}

function Sprout({ x, y }) {
  return (
    <g>
      <path d={`M${x} ${y} C ${x - 14} ${y - 10} ${x - 14} ${y - 24} ${x - 2} ${y - 20} Z`} fill="#5E9F50" />
      <path d={`M${x} ${y} C ${x + 14} ${y - 10} ${x + 14} ${y - 24} ${x + 2} ${y - 20} Z`} fill="#6FB15C" />
    </g>
  );
}

function Carrot({ x, y }) {
  return (
    <g>
      <path d={`M${x} ${y - 6} C ${x - 10} ${y - 26} ${x - 4} ${y - 34} ${x} ${y - 30} C ${x + 4} ${y - 34} ${x + 10} ${y - 26} ${x} ${y - 6} Z`} fill="#5E9F50" />
      <ellipse cx={x} cy={y} rx="11" ry="8" fill="#EE8B3A" />
    </g>
  );
}

function Cabbage({ x, y }) {
  return (
    <g>
      <circle cx={x} cy={y - 8} r="20" fill="#7CBF62" />
      <circle cx={x} cy={y - 10} r="12" fill="#A6D98C" />
      <path d={`M${x - 14} ${y - 4} Q ${x} ${y - 20} ${x + 14} ${y - 4}`} fill="none" stroke="#5E9F50" strokeWidth="2" />
    </g>
  );
}

function Garden() {
  const sprouts = (y, from, to, step) => {
    const out = [];
    for (let x = from; x <= to; x += step) out.push(<Sprout key={`${y}-${x}`} x={x} y={y} />);
    return out;
  };
  return (
    <>
      <Sky id="gs-ga" stops={[[0, '#BFE3F2'], [0.55, '#EAF4EC'], [0.72, '#F4EFE6']]} />
      <Sun x={520} y={140} r={40} />
      <Cloud x={300} y={120} /><Cloud x={760} y={180} s={0.9} /><Cloud x={1000} y={110} /><Cloud x={140} y={240} s={0.7} />
      <path d="M0 500 Q 200 460 420 486 T 820 476 T 1200 482 V 844 H 0 Z" fill="#C3E0A5" />
      <RoundTree x={150} y={545} s={0.8} /><RoundTree x={1080} y={545} s={0.9} /><RoundTree x={880} y={522} s={0.5} />
      <path d="M0 590 Q 300 570 600 584 T 1200 578 V 844 H 0 Z" fill="#8DC66F" />
      {[[630, 46], [704, 50], [784, 70]].map(([y, h]) => (
        <g key={y}>
          <rect x="-20" y={y} width={W + 40} height={h} rx="23" fill="#8B6B47" />
          <rect x="-20" y={y} width={W + 40} height="10" rx="5" fill="#9C7A54" />
        </g>
      ))}
      {sprouts(640, 30, 1170, 70)}
      {sprouts(800, 40, 380, 70)}
      {sprouts(800, 860, 1180, 70)}
      <Carrot x={440} y={716} /><Carrot x={480} y={716} /><Carrot x={520} y={716} /><Carrot x={560} y={716} />
      <Carrot x={180} y={716} /><Carrot x={220} y={716} /><Carrot x={1000} y={716} /><Carrot x={1040} y={716} />
      <Cabbage x={630} y={720} /><Cabbage x={690} y={720} /><Cabbage x={300} y={720} /><Cabbage x={900} y={720} />
      <g transform="translate(470 812)">
        <path d="M-20 -30 C -20 -58 20 -58 20 -30" fill="none" stroke="#6E80A0" strokeWidth="6" />
        <rect x="-28" y="-30" width="56" height="40" rx="8" fill="#8798B3" />
        <path d="M26 -20 L 58 -46" stroke="#8798B3" strokeWidth="7" strokeLinecap="round" />
        <circle cx="62" cy="-49" r="7" fill="#6E80A0" />
      </g>
      <g transform="translate(1110 640)">
        <rect x="-4" y="-150" width="8" height="150" fill="#7A5A3A" />
        <rect x="-60" y="-118" width="120" height="8" rx="4" fill="#7A5A3A" />
        <path d="M-34 -118 L 34 -118 L 28 -60 L -28 -60 Z" fill="#A48BE6" />
        <circle cx="0" cy="-140" r="18" fill="#F4EFE6" />
        <path d="M-26 -150 L 26 -150 L 14 -172 L -14 -172 Z" fill="#E8B84B" />
      </g>
      <Flowers pts={[[400, 680, '#FFFFFF'], [610, 682, '#E8B84B'], [760, 684, '#FFFFFF']]} />
    </>
  );
}

function Farm() {
  return (
    <>
      <Sky id="gs-fa" stops={[[0, '#A9D4EC'], [0.55, '#E9F2EE'], [0.72, '#F7E6BE']]} />
      <Sun x={420} y={150} />
      <Cloud x={650} y={120} /><Cloud x={250} y={130} /><Cloud x={980} y={170} /><Cloud x={780} y={262} s={0.7} />
      <path d="M0 480 Q 200 440 420 466 T 840 456 T 1200 462 V 844 H 0 Z" fill="#C8DFA0" />
      <path d="M0 520 Q 300 498 600 512 T 1200 506 V 620 H 0 Z" fill="#E6C76E" />
      <g stroke="#D4B055" strokeWidth="3" fill="none">
        <path d="M0 545 Q 300 525 600 537 T 1200 531" />
        <path d="M0 570 Q 300 552 600 562 T 1200 557" />
      </g>
      <g transform="translate(230 612) scale(1.15)">
        <rect x="-80" y="-110" width="160" height="110" fill="#C8553D" />
        <path d="M-94 -108 L 0 -172 L 94 -108 Z" fill="#9E3F2D" />
        <rect x="-30" y="-70" width="60" height="70" fill="#F4EFE6" />
        <path d="M-30 -70 L 30 0 M30 -70 L -30 0" stroke="#C8553D" strokeWidth="5" />
        <rect x="-14" y="-140" width="28" height="22" fill="#F4EFE6" />
      </g>
      <g transform="translate(360 612)">
        <rect x="-26" y="-150" width="52" height="150" fill="#E9D7B9" stroke="#B8935E" strokeWidth="2" />
        <path d="M-26 -150 C -26 -186 26 -186 26 -150 Z" fill="#8798B3" />
      </g>
      <g transform="translate(1020 600)">
        <path d="M-18 0 L 18 0 L 10 -170 L -10 -170 Z" fill="#F4EFE6" stroke="#B8935E" strokeWidth="2" />
        <g transform="translate(0 -170)" fill="#E9D7B9" stroke="#B8935E" strokeWidth="2">
          <rect x="-6" y="-90" width="12" height="90" transform="rotate(20)" />
          <rect x="-6" y="-90" width="12" height="90" transform="rotate(110)" />
          <rect x="-6" y="-90" width="12" height="90" transform="rotate(200)" />
          <rect x="-6" y="-90" width="12" height="90" transform="rotate(290)" />
          <circle r="10" fill="#E8B84B" />
        </g>
      </g>
      <Ground id="gs-fa-g" d="M0 600 Q 300 584 600 596 T 1200 590 V 844 H 0 Z" top="#A8C96B" bottom="#86A94E" />
      <Fence y={646} step={90} />
      <g transform="translate(570 760)">
        <circle r="46" fill="#E3C36A" />
        <circle r="32" fill="none" stroke="#C9A34A" strokeWidth="4" />
        <circle r="18" fill="none" stroke="#C9A34A" strokeWidth="4" />
        <circle r="5" fill="#C9A34A" />
      </g>
      <g transform="translate(455 800)">
        <path d="M-30 -6 L -44 -24 L -36 -2 Z" fill="#F4EFE6" stroke="#D9CCB6" strokeWidth="2" />
        <ellipse cx="0" cy="0" rx="28" ry="20" fill="#FFFFFF" stroke="#D9CCB6" strokeWidth="2" />
        <circle cx="22" cy="-20" r="11" fill="#FFFFFF" stroke="#D9CCB6" strokeWidth="2" />
        <path d="M18 -30 q 4 -10 8 0 q 4 -8 6 2 Z" fill="#E25B4B" />
        <path d="M32 -20 L 42 -17 L 32 -14 Z" fill="#E8B84B" />
        <circle cx="25" cy="-22" r="2" fill="#1A2B4A" />
        <path d="M-6 20 V 30 M6 20 V 30" stroke="#E8B84B" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g stroke="#C9A34A" strokeWidth="3" strokeLinecap="round">
        {[400, 418, 650, 668, 120, 140, 900, 920].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 844 L ${x + (i % 2 ? -4 : 4)} 790`} />
            <ellipse cx={x + (i % 2 ? -4 : 4)} cy="784" rx="5" ry="10" fill="#E3C36A" />
          </g>
        ))}
      </g>
      <Flowers pts={[[520, 700, '#FFFFFF'], [700, 690, '#A48BE6'], [300, 720, '#FFFFFF']]} />
    </>
  );
}

function Workshop() {
  const planks = [];
  for (let x = 100; x < W; x += 100) planks.push(<path key={x} d={`M${x} 0 V 690`} />);
  return (
    <>
      <Sky id="gs-ws" stops={[[0, '#F3E6CC'], [1, '#E6D2AE']]} />
      <g stroke="#DFC9A1" strokeWidth="3">{planks}</g>
      <defs>
        <pattern id="gs-ws-holes" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="#D9B98A" />
          <circle cx="15" cy="15" r="3" fill="#C29E6A" />
        </pattern>
      </defs>
      <rect x="40" y="100" width="320" height="300" rx="14" fill="url(#gs-ws-holes)" stroke="#B8935E" strokeWidth="4" />
      <g transform="translate(100 140)">
        <rect x="-6" y="0" width="12" height="110" rx="5" fill="#E8B84B" stroke="#B07F1E" strokeWidth="2" />
        <rect x="-28" y="-12" width="56" height="22" rx="4" fill="#1A2B4A" />
      </g>
      <g transform="translate(175 140)">
        <rect x="-7" y="0" width="14" height="120" rx="7" fill="#8798B3" />
        <circle cx="0" cy="0" r="18" fill="#8798B3" />
        <rect x="-6" y="-20" width="12" height="16" fill="#D9B98A" />
      </g>
      <g transform="translate(220 150)">
        <rect x="0" y="0" width="36" height="46" rx="10" fill="#E8B84B" stroke="#B07F1E" strokeWidth="2" />
        <path d="M30 10 L 130 26 L 130 50 L 30 46 Z" fill="#C9D2DE" stroke="#8798B3" strokeWidth="2" />
        <path d="M34 46 l 8 8 l 8 -8 l 8 8 l 8 -8 l 8 8 l 8 -8 l 8 8 l 8 -8 l 8 8 l 8 -8 l 8 8" fill="none" stroke="#8798B3" strokeWidth="2" />
      </g>
      <g transform="translate(120 300)">
        <rect x="-10" y="0" width="20" height="50" rx="8" fill="#A48BE6" />
        <rect x="-3" y="50" width="6" height="56" fill="#8798B3" />
      </g>
      <g transform="translate(240 300)" fill="none" stroke="#1A2B4A" strokeWidth="8" strokeLinecap="round">
        <path d="M0 0 L 34 70" /><path d="M34 0 L 0 70" />
      </g>
      <rect x="900" y="110" width="200" height="160" rx="8" fill="#BFE3F2" stroke="#A0743F" strokeWidth="10" />
      <path d="M1000 110 V 270 M 900 190 H 1100" stroke="#A0743F" strokeWidth="8" />
      <Cloud x={950} y={160} s={0.5} />
      <rect x="860" y="330" width="300" height="14" rx="4" fill="#A0743F" />
      {[[900, '#E8B84B'], [970, '#A48BE6'], [1040, '#8798B3'], [1110, '#6CCFA0']].map(([x, c]) => (
        <g key={x}>
          <rect x={x - 24} y="276" width="48" height="54" rx="6" fill={c} />
          <ellipse cx={x} cy="276" rx="24" ry="7" fill="#F4EFE6" stroke={c} strokeWidth="3" />
        </g>
      ))}
      <rect x="0" y="690" width={W} height="30" fill="#A0743F" />
      <rect x="0" y="720" width={W} height="14" fill="#8A6235" />
      <Floor y={790} fill="#C9A06A" line="#B88E58" />
      {[60, 400, 780, 1120].map(x => <rect key={x} x={x} y="734" width="26" height="110" fill="#8A6235" />)}
      <g transform="translate(480 690)">
        <path d="M-26 -46 C -26 -72 26 -72 26 -46" fill="none" stroke="#1A2B4A" strokeWidth="7" />
        <rect x="-62" y="-48" width="124" height="48" rx="8" fill="#E8B84B" stroke="#B07F1E" strokeWidth="3" />
        <rect x="-62" y="-48" width="124" height="13" rx="6" fill="#C99A2E" />
        <rect x="-10" y="-30" width="20" height="10" rx="3" fill="#1A2B4A" />
      </g>
      <g transform="translate(570 690)">
        <rect x="0" y="-9" width="120" height="9" fill="#F6D27A" stroke="#B07F1E" strokeWidth="1.5" />
        <path d="M10 -9 v4 M20 -9 v6 M30 -9 v4 M40 -9 v6 M50 -9 v4 M60 -9 v6 M70 -9 v4 M80 -9 v6 M90 -9 v4 M100 -9 v6 M110 -9 v4" stroke="#8A6212" strokeWidth="1.5" />
      </g>
      <g transform="translate(740 690)">
        <rect x="-18" y="-40" width="36" height="40" rx="7" fill="#E1E7F0" stroke="#8798B3" strokeWidth="2" />
        <rect x="-20" y="-46" width="40" height="8" rx="3" fill="#8798B3" />
        <path d="M-8 -30 v22 M0 -32 v24 M8 -28 v20" stroke="#6E80A0" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g transform="translate(240 690)">
        <rect x="-50" y="-30" width="100" height="30" rx="5" fill="#C9A06A" stroke="#8A6235" strokeWidth="2" />
        <circle cx="-26" cy="-46" r="16" fill="none" stroke="#8798B3" strokeWidth="6" />
      </g>
    </>
  );
}

function City() {
  const back = [[0, 90, 260], [90, 70, 330], [160, 110, 240], [270, 80, 300], [350, 120, 220], [470, 90, 360], [560, 100, 280], [660, 80, 330], [740, 120, 250], [860, 90, 340], [950, 110, 270], [1060, 140, 310]];
  const front = [[20, 150, 230, '#E9D7B9'], [180, 120, 300, '#8798B3'], [520, 120, 260, '#C9BDF0'], [650, 140, 220, '#E9D7B9'], [800, 110, 320, '#6E80A0'], [920, 150, 250, '#F1E3C8'], [1080, 120, 290, '#8798B3']];
  const dashes = [];
  for (let x = 20; x < W; x += 90) dashes.push(<rect key={x} x={x} y="772" width="44" height="6" rx="3" fill="#F4EFE6" opacity="0.85" />);
  return (
    <>
      <Sky id="gs-ci" stops={[[0, '#9FCBE8'], [0.55, '#DCEBF0'], [0.75, '#F4EFE6']]} />
      <Sun x={760} y={120} r={36} />
      <Cloud x={300} y={120} /><Cloud x={560} y={90} s={0.8} /><Cloud x={980} y={140} /><Cloud x={140} y={220} s={0.7} />
      {back.map(([x, w, h]) => <rect key={x} x={x} y={660 - h} width={w} height={h} fill="#C3CEDD" />)}
      {front.map(([x, w, h, c]) => (
        <g key={x}>
          <rect x={x} y={660 - h} width={w} height={h} fill={c} />
          <Windows x={x + 18} y={660 - h + 22} cols={Math.floor((w - 20) / 28)} rows={Math.floor((h - 60) / 36)} fill={c === '#E9D7B9' || c === '#F1E3C8' ? '#8798B3' : '#F6D27A'} />
        </g>
      ))}
      <rect x="320" y="530" width="140" height="130" fill="#F4EFE6" />
      <path d="M330 530 C 330 450 450 450 450 530 Z" fill="#E9D7B9" />
      <circle cx="390" cy="458" r="6" fill="#E8B84B" />
      <rect x="470" y="410" width="26" height="250" fill="#F4EFE6" />
      <rect x="464" y="470" width="38" height="10" fill="#E9D7B9" />
      <path d="M470 410 L 483 380 L 496 410 Z" fill="#E8B84B" />
      <path d="M370 600 C 370 570 410 570 410 600 V 660 H 370 Z" fill="#8798B3" />
      <rect x="0" y="660" width={W} height="40" fill="#E9DFC9" />
      <rect x="0" y="700" width={W} height="6" fill="#CFC2A6" />
      <RoundTree x={100} y={690} s={0.6} /><RoundTree x={440} y={690} s={0.55} /><RoundTree x={1000} y={690} s={0.6} />
      <rect x="0" y="706" width={W} height={H - 706} fill="#4A5A75" />
      {dashes}
      {[420, 436, 452, 468].map(x => <rect key={x} x={x} y="714" width="10" height="44" fill="#F4EFE6" opacity="0.8" />)}
      <g transform="translate(580 792)">
        <path d="M-34 -22 L -22 -46 L 26 -46 L 40 -22 Z" fill="#E8B84B" />
        <rect x="-62" y="-24" width="124" height="32" rx="12" fill="#E8B84B" />
        <path d="M-28 -24 L -19 -40 L -2 -40 L -2 -24 Z M4 -24 L 4 -40 L 22 -40 L 31 -24 Z" fill="#BFE3F2" />
        <circle cx="-34" cy="8" r="13" fill="#1A2B4A" /><circle cx="-34" cy="8" r="5" fill="#C3CEDD" />
        <circle cx="34" cy="8" r="13" fill="#1A2B4A" /><circle cx="34" cy="8" r="5" fill="#C3CEDD" />
      </g>
      <g transform="translate(980 760)">
        <rect x="-90" y="-50" width="180" height="62" rx="12" fill="#34507E" />
        {[-70, -38, -6, 26, 58].map(x => <rect key={x} x={x} y="-40" width="24" height="20" rx="3" fill="#BFE3F2" />)}
        <circle cx="-56" cy="12" r="13" fill="#1A2B4A" /><circle cx="56" cy="12" r="13" fill="#1A2B4A" />
      </g>
    </>
  );
}

function Sports() {
  const crowd = [];
  const colors = ['#E8B84B', '#F4EFE6', '#A48BE6', '#1A2B4A', '#6CCFA0', '#E9896B'];
  [330, 370, 410, 450, 490].forEach((y, r) => {
    let k = r * 2;
    for (let x = 14 + (r % 2) * 13; x < W; x += 26) crowd.push(<circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill={colors[k++ % colors.length]} />);
  });
  const stripes = [];
  for (let x = 0; x < W; x += 240) stripes.push(<rect key={x} x={x} y="530" width="120" height={H - 530} fill="#6FAE50" />);
  const net = [];
  for (let i = 1; i < 6; i++) net.push(<path key={i} d={`M0 ${i * 16} H 70 M${i * 12} 0 V 96`} />);
  return (
    <>
      <Sky id="gs-sp" stops={[[0, '#A9D4EC'], [0.6, '#E6F0F2']]} />
      <Cloud x={300} y={110} /><Cloud x={760} y={90} s={0.8} /><Cloud x={1000} y={170} />
      <rect x="0" y="290" width={W} height="20" fill="#6E80A0" />
      <rect x="0" y="310" width={W} height="220" fill="#8798B3" />
      {crowd}
      {[60, 1140].map(x => (
        <g key={x}>
          <rect x={x - 5} y="90" width="10" height="440" fill="#C3CEDD" />
          <rect x={x - 30} y="70" width="60" height="34" rx="6" fill="#F6D27A" stroke="#C3CEDD" strokeWidth="4" />
        </g>
      ))}
      <rect x="0" y="530" width={W} height={H - 530} fill="#78B957" />
      {stripes}
      <g stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.9">
        <path d={`M0 560 H ${W}`} />
        <path d="M600 560 V 844" />
        <ellipse cx="600" cy="700" rx="150" ry="46" />
        <rect x="-4" y="610" width="124" height="180" />
        <rect x="1080" y="610" width="124" height="180" />
      </g>
      <g transform="translate(20 610)" stroke="#FFFFFF" strokeWidth="2" opacity="0.8">{net}<rect x="0" y="0" width="70" height="96" fill="none" strokeWidth="6" /></g>
      <g transform="translate(1110 610)" stroke="#FFFFFF" strokeWidth="2" opacity="0.8">{net}<rect x="0" y="0" width="70" height="96" fill="none" strokeWidth="6" /></g>
      <g transform="translate(520 790)">
        <circle r="26" fill="#FFFFFF" stroke="#1A2B4A" strokeWidth="2" />
        <path d="M0 -9 L 9 -2 L 6 9 L -6 9 L -9 -2 Z" fill="#1A2B4A" />
        <path d="M0 -9 V -24 M9 -2 L 23 -8 M6 9 L 14 21 M-6 9 L -14 21 M-9 -2 L -23 -8" stroke="#1A2B4A" strokeWidth="2" />
      </g>
      <path d="M430 820 L 446 780 L 462 820 Z" fill="#E8B84B" stroke="#C99A2E" strokeWidth="2" />
      <path d="M650 790 L 664 756 L 678 790 Z" fill="#E8B84B" stroke="#C99A2E" strokeWidth="2" />
    </>
  );
}

function Awning({ x, w, y, c }) {
  const out = [];
  for (let i = 0; i * 40 < w; i++) {
    const fill = i % 2 ? '#FFFFFF' : c;
    out.push(<rect key={`r${i}`} x={x + i * 40} y={y} width="40" height="46" fill={fill} />);
    out.push(<circle key={`c${i}`} cx={x + i * 40 + 20} cy={y + 46} r="20" fill={fill} />);
  }
  return <g>{out}</g>;
}

function Jobs() {
  const dashes = [];
  for (let x = 20; x < W; x += 90) dashes.push(<rect key={x} x={x} y="808" width="44" height="6" rx="3" fill="#F4EFE6" opacity="0.85" />);
  return (
    <>
      <Sky id="gs-jo" stops={[[0, '#A9D4EC'], [0.6, '#E6F0F2'], [0.8, '#F4EFE6']]} />
      <Cloud x={200} y={100} /><Cloud x={620} y={80} s={0.8} /><Cloud x={1000} y={120} />
      <rect x="0" y="290" width="395" height="410" fill="#F1E3C8" />
      <rect x="405" y="270" width="390" height="430" fill="#E1E7F0" />
      <rect x="805" y="300" width="395" height="400" fill="#ECE6FB" />
      <rect x="0" y="280" width="395" height="16" fill="#D9C3A0" />
      <rect x="405" y="260" width="390" height="16" fill="#C3CEDD" />
      <rect x="805" y="290" width="395" height="16" fill="#D9CCF5" />
      <rect x="110" y="320" width="175" height="60" rx="10" fill="#1A2B4A" />
      <ellipse cx="197" cy="350" rx="44" ry="18" fill="#E8B84B" />
      <path d="M175 342 l 8 14 M195 340 l 8 14 M215 342 l 8 14" stroke="#F4EFE6" strokeWidth="3" strokeLinecap="round" />
      <rect x="520" y="296" width="160" height="70" rx="10" fill="#FFFFFF" />
      <path d="M588 312 h 24 v 16 h 16 v 24 h -16 v 16 h -24 v -16 h -16 v -24 h 16 Z" fill="#2ABB7A" />
      <rect x="920" y="326" width="165" height="60" rx="10" fill="#FFFFFF" />
      <g transform="translate(1002 356)" fill="none" stroke="#1A2B4A" strokeWidth="4">
        <circle cx="-22" cy="12" r="9" /><circle cx="-22" cy="-12" r="9" />
        <path d="M-14 8 L 30 -14 M-14 -8 L 30 14" strokeLinecap="round" />
      </g>
      <Awning x={0} w={395} y={410} c="#E8B84B" />
      <Awning x={405} w={390} y={396} c="#8798B3" />
      <Awning x={805} w={395} y={420} c="#A48BE6" />
      <rect x="30" y="510" width="200" height="120" rx="6" fill="#BFE3F2" stroke="#D9C3A0" strokeWidth="6" />
      <ellipse cx="90" cy="600" rx="34" ry="14" fill="#E8B84B" /><ellipse cx="170" cy="600" rx="34" ry="14" fill="#C99A2E" />
      <rect x="270" y="520" width="90" height="180" rx="6" fill="#A0743F" />
      <rect x="555" y="500" width="90" height="200" rx="6" fill="#8798B3" />
      <circle cx="630" cy="600" r="5" fill="#E8B84B" />
      <rect x="430" y="510" width="100" height="110" rx="6" fill="#BFE3F2" stroke="#C3CEDD" strokeWidth="6" />
      <rect x="670" y="510" width="100" height="110" rx="6" fill="#BFE3F2" stroke="#C3CEDD" strokeWidth="6" />
      <rect x="840" y="530" width="210" height="110" rx="6" fill="#BFE3F2" stroke="#D9CCF5" strokeWidth="6" />
      <rect x="1080" y="530" width="90" height="170" rx="6" fill="#A48BE6" />
      <rect x="0" y="700" width={W} height="60" fill="#E9DFC9" />
      <rect x="0" y="760" width={W} height="6" fill="#CFC2A6" />
      <rect x="0" y="766" width={W} height={H - 766} fill="#4A5A75" />
      {dashes}
      <g transform="translate(470 744)">
        <rect x="-50" y="-36" width="100" height="10" rx="4" fill="#A0743F" />
        <rect x="-54" y="-14" width="108" height="12" rx="4" fill="#A0743F" />
        <path d="M-44 -2 V 16 M44 -2 V 16" stroke="#6B4B2E" strokeWidth="6" />
      </g>
      <g transform="translate(610 750)">
        <path d="M-22 -30 L 22 -30 L 16 10 L -16 10 Z" fill="#C8755A" />
        <circle cx="-10" cy="-44" r="12" fill="#6FB15C" /><circle cx="10" cy="-46" r="12" fill="#5E9F50" />
        <circle cx="-8" cy="-52" r="5" fill="#E8B84B" /><circle cx="12" cy="-56" r="5" fill="#FFFFFF" />
      </g>
    </>
  );
}

function TShirt({ x, y, c }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 -26 L 0 -10" stroke="#8A6212" strokeWidth="3" />
      <path d="M-34 0 L -14 -10 C -8 -2 8 -2 14 -10 L 34 0 L 46 24 L 30 32 L 30 96 L -30 96 L -30 32 L -46 24 Z" fill={c} />
    </g>
  );
}

function Dress({ x, y, c }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 -26 L 0 -10" stroke="#8A6212" strokeWidth="3" />
      <path d="M-14 -10 L 14 -10 L 18 30 L 44 120 L -44 120 L -18 30 Z" fill={c} />
    </g>
  );
}

function Clothes() {
  const stripes = [];
  for (let x = 0; x < W; x += 60) stripes.push(<rect key={x} x={x} y="0" width="30" height="700" fill="#E7E0F8" />);
  const flags = [];
  const fc = ['#E8B84B', '#A48BE6', '#8798B3', '#6CCFA0', '#E9896B'];
  for (let i = 0; i < 24; i++) flags.push(<path key={i} d={`M${i * 50 + 5} ${44 + Math.sin(i) * 4} l 40 0 l -20 30 Z`} fill={fc[i % fc.length]} />);
  return (
    <>
      <Sky id="gs-cl" stops={[[0, '#F1ECFB'], [1, '#ECE6FB']]} />
      {stripes}
      <path d="M0 44 Q 300 60 600 44 T 1200 44" fill="none" stroke="#B07F1E" strokeWidth="2" />
      {flags}
      <rect x="60" y="176" width="300" height="8" rx="4" fill="#E8B84B" />
      <path d="M70 180 L 60 640 M350 180 L 360 640" stroke="#C99A2E" strokeWidth="8" strokeLinecap="round" />
      <path d="M40 640 H 100 M320 640 H 380" stroke="#C99A2E" strokeWidth="8" strokeLinecap="round" />
      <TShirt x={110} y={210} c="#E8B84B" />
      <Dress x={185} y={210} c="#A48BE6" />
      <TShirt x={255} y={210} c="#8798B3" />
      <Dress x={322} y={210} c="#6CCFA0" />
      <rect x="820" y="156" width="340" height="12" rx="4" fill="#A0743F" />
      {[[870, '#E8B84B'], [960, '#A48BE6'], [1050, '#1A2B4A'], [1120, '#E9896B']].map(([x, c]) => (
        <g key={x}>
          <ellipse cx={x} cy="152" rx="34" ry="8" fill={c} />
          <path d={`M${x - 20} 152 C ${x - 20} 116 ${x + 20} 116 ${x + 20} 152 Z`} fill={c} />
        </g>
      ))}
      <ellipse cx="1000" cy="420" rx="92" ry="140" fill="#E1E7F0" stroke="#E8B84B" strokeWidth="12" />
      <path d="M950 340 L 980 310 M960 380 L 1010 330" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
      <Floor y={700} fill="#D9B98A" line="#C9A57A" />
      <ellipse cx="600" cy="790" rx="320" ry="40" fill="#ECE6FB" stroke="#A48BE6" strokeWidth="4" />
      <g transform="translate(440 790)" fill="#1A2B4A">
        <path d="M-30 0 L 22 0 C 30 0 34 -6 30 -12 L 8 -18 L 0 -32 L -26 -32 Z" />
        <path d="M14 14 L 66 14 C 74 14 78 8 74 2 L 52 -4 L 44 -18 L 18 -18 Z" />
      </g>
      <g transform="translate(560 786)">
        <path d="M-20 -30 C -20 -54 20 -54 20 -30" fill="none" stroke="#B07F1E" strokeWidth="5" />
        <rect x="-34" y="-32" width="68" height="46" rx="10" fill="#E8B84B" />
        <rect x="-6" y="-24" width="12" height="8" rx="2" fill="#1A2B4A" />
      </g>
      <g transform="translate(650 800)">
        <rect x="-34" y="-40" width="68" height="40" fill="#D9CCF5" />
        <ellipse cx="0" cy="0" rx="34" ry="9" fill="#C9BDF0" />
        <ellipse cx="0" cy="-40" rx="34" ry="9" fill="#ECE6FB" stroke="#A48BE6" strokeWidth="2" />
        <rect x="-5" y="-40" width="10" height="40" fill="#A48BE6" />
      </g>
    </>
  );
}

function Weather() {
  const rays = [];
  for (let a = 0; a < 360; a += 30) {
    const r = (a * Math.PI) / 180;
    rays.push(<path key={a} d={`M${300 + Math.cos(r) * 66} ${170 + Math.sin(r) * 66} L ${300 + Math.cos(r) * 92} ${170 + Math.sin(r) * 92}`} />);
  }
  const drops = [];
  for (let i = 0; i < 14; i++) {
    const x = 830 + (i % 7) * 26 + (i > 6 ? 13 : 0);
    const y = 230 + (i > 6 ? 46 : 0) + (i % 3) * 10;
    drops.push(<path key={i} d={`M${x} ${y} l -6 16`} />);
  }
  const bands = [[420, '#E9896B'], [400, '#E8B84B'], [380, '#6CCFA0'], [360, '#8FC8EA'], [340, '#A48BE6']];
  return (
    <>
      <Sky id="gs-we" stops={[[0, '#9FD0EE'], [0.6, '#E4F1F5']]} />
      <g stroke="#F5CC5E" strokeWidth="8" strokeLinecap="round">{rays}</g>
      <circle cx="300" cy="170" r="54" fill="#F5CC5E" />
      <g>
        <ellipse cx="900" cy="180" rx="110" ry="40" fill="#B7C3D6" />
        <ellipse cx="860" cy="150" rx="60" ry="44" fill="#C3CEDD" />
        <ellipse cx="940" cy="140" rx="54" ry="40" fill="#C3CEDD" />
        <ellipse cx="900" cy="200" rx="104" ry="20" fill="#9FAEC6" />
      </g>
      <g stroke="#6E9FD6" strokeWidth="5" strokeLinecap="round">{drops}</g>
      <Cloud x={520} y={110} s={0.8} /><Cloud x={700} y={90} s={0.6} />
      <g fill="none" opacity="0.85">
        {bands.map(([r, c]) => <path key={r} d={`M${600 - r} 700 A ${r} ${r} 0 0 1 ${600 + r} 700`} stroke={c} strokeWidth="20" />)}
      </g>
      <path d="M0 560 Q 300 520 600 546 T 1200 540 V 844 H 0 Z" fill="#A9D18E" />
      <path d="M0 640 Q 300 610 600 626 T 1200 620 V 844 H 0 Z" fill="#8CC07A" />
      <ellipse cx="600" cy="800" rx="80" ry="14" fill="#BFE3F2" />
      <path d="M560 798 h 30" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(460 770)">
        <path d="M-56 0 C -56 -60 56 -60 56 0 Z" fill="#E8B84B" />
        <path d="M-56 0 C -40 -14 -24 -14 -18 0 C -10 -14 10 -14 18 0 C 24 -14 40 -14 56 0" fill="#A48BE6" />
        <path d="M0 -50 V 30 C 0 42 -14 42 -14 32" fill="none" stroke="#1A2B4A" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="translate(650 806)" fill="#E8B84B" stroke="#C99A2E" strokeWidth="2">
        <path d="M-14 -40 H 4 V -8 H 14 V 6 H -14 Z" />
        <path d="M14 -40 H 32 V -8 H 42 V 6 H 14 Z" />
      </g>
      <Flowers pts={[[380, 700, '#FFFFFF'], [760, 690, '#E8B84B'], [200, 720, '#A48BE6'], [1000, 700, '#FFFFFF']]} />
    </>
  );
}

function Shapes() {
  return (
    <>
      <Sky id="gs-sh" stops={[[0, '#FAF7F2'], [1, '#F1E8D8']]} />
      <circle cx="160" cy="170" r="62" fill="#E8B84B" opacity="0.9" />
      <path d="M1040 90 L 1110 210 L 970 210 Z" fill="#A48BE6" opacity="0.9" />
      <rect x="180" y="380" width="96" height="96" rx="12" fill="#8798B3" opacity="0.9" transform="rotate(15 228 428)" />
      <path d="M1010 330 l 18 38 l 42 6 l -30 30 l 8 42 l -38 -20 l -38 20 l 8 -42 l -30 -30 l 42 -6 Z" fill="#6CCFA0" opacity="0.9" />
      <path d="M600 30 l 52 30 v 60 l -52 30 l -52 -30 v -60 Z" fill="none" stroke="#E8B84B" strokeWidth="8" />
      <circle cx="340" cy="280" r="20" fill="#E9896B" opacity="0.8" />
      <circle cx="880" cy="290" r="16" fill="#8FC8EA" opacity="0.9" />
      <rect x="820" y="520" width="50" height="50" rx="8" fill="#E8B84B" opacity="0.7" transform="rotate(-12 845 545)" />
      <circle cx="90" cy="560" r="28" fill="#A48BE6" opacity="0.6" />
      <Floor y={690} fill="#E3D3B8" line="#D6C3A2" />
      <ellipse cx="600" cy="790" rx="360" ry="46" fill="#ECE6FB" stroke="#A48BE6" strokeWidth="4" strokeDasharray="14 10" />
      <g transform="translate(450 800)">
        <path d="M-34 -60 L -14 -76 L 50 -76 L 30 -60 Z" fill="#F6D27A" />
        <path d="M30 -60 L 50 -76 L 50 -12 L 30 4 Z" fill="#C99A2E" />
        <rect x="-34" y="-60" width="64" height="64" fill="#E8B84B" />
      </g>
      <g transform="translate(555 800)">
        <rect x="-26" y="-78" width="52" height="80" fill="#8798B3" />
        <ellipse cx="0" cy="2" rx="26" ry="9" fill="#6E80A0" />
        <ellipse cx="0" cy="-78" rx="26" ry="9" fill="#C3CEDD" />
      </g>
      <path d="M600 804 L 640 734 L 680 804 Z" fill="#A48BE6" />
      <circle cx="420" cy="826" r="16" fill="#6CCFA0" />
    </>
  );
}

function Family() {
  const dots = [];
  for (let y = 40; y < 680; y += 60) for (let x = (y / 60) % 2 ? 30 : 60; x < W; x += 60) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#EAD3B0" />);
  return (
    <>
      <Sky id="gs-fm" stops={[[0, '#F8EDDA'], [1, '#EFDCC0']]} />
      {dots}
      <rect x="60" y="120" width="240" height="260" rx="10" fill="#BFE3F2" stroke="#FFFFFF" strokeWidth="12" />
      <Cloud x={140} y={200} s={0.6} />
      <path d="M180 120 V 380 M 60 250 H 300" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M40 100 C 70 200 50 320 90 410 L 40 410 Z" fill="#D9CCF5" />
      <path d="M320 100 C 290 200 310 320 270 410 L 320 410 Z" fill="#D9CCF5" />
      <rect x="40" y="92" width="280" height="14" rx="6" fill="#A0743F" />
      <rect x="900" y="140" width="130" height="120" rx="6" fill="#FFFFFF" stroke="#E8B84B" strokeWidth="10" />
      <g fill="#8798B3">
        <circle cx="935" cy="190" r="12" /><path d="M917 240 C 917 210 953 210 953 240 Z" />
        <circle cx="995" cy="190" r="12" fill="#A48BE6" /><path d="M977 240 C 977 210 1013 210 1013 240 Z" fill="#A48BE6" />
        <circle cx="965" cy="208" r="8" fill="#E8B84B" /><path d="M953 240 C 953 220 977 220 977 240 Z" fill="#E8B84B" />
      </g>
      <rect x="1060" y="160" width="90" height="90" rx="6" fill="#FFFFFF" stroke="#A48BE6" strokeWidth="8" />
      <path d="M1105 226 C 1080 208 1082 186 1095 186 C 1101 186 1105 192 1105 196 C 1105 192 1109 186 1115 186 C 1128 186 1130 208 1105 226 Z" fill="#E9896B" />
      <rect x="920" y="300" width="80" height="70" rx="6" fill="#FFFFFF" stroke="#8798B3" strokeWidth="8" />
      <circle cx="960" cy="335" r="14" fill="#F5CC5E" />
      <g transform="translate(1120 700)">
        <rect x="-4" y="-200" width="8" height="200" fill="#A0743F" />
        <path d="M-40 -200 L 40 -200 L 28 -250 L -28 -250 Z" fill="#E8B84B" />
        <ellipse cx="0" cy="0" rx="34" ry="8" fill="#A0743F" />
      </g>
      <g transform="translate(90 700)">
        <path d="M-30 -50 L 30 -50 L 22 0 L -22 0 Z" fill="#C8755A" />
        <path d="M0 -50 C -40 -90 -50 -130 -20 -150 M0 -50 C 10 -100 40 -120 50 -150 M0 -50 C -6 -110 6 -140 0 -170" stroke="#5E9F50" strokeWidth="10" fill="none" strokeLinecap="round" />
      </g>
      <rect x="0" y="700" width={W} height={H - 700} fill="#D9B98A" />
      <ellipse cx="600" cy="800" rx="340" ry="38" fill="#E9D7B9" stroke="#C9A57A" strokeWidth="4" strokeDasharray="16 10" />
      <g transform="translate(600 0)">
        <rect x="-210" y="600" width="420" height="90" rx="34" fill="#34507E" />
        <rect x="-200" y="670" width="400" height="56" rx="18" fill="#2C4470" />
        <rect x="-236" y="640" width="60" height="96" rx="24" fill="#34507E" />
        <rect x="176" y="640" width="60" height="96" rx="24" fill="#34507E" />
        <rect x="-160" y="616" width="90" height="62" rx="16" fill="#E8B84B" transform="rotate(-8 -115 647)" />
        <rect x="-50" y="620" width="90" height="58" rx="16" fill="#F4EFE6" transform="rotate(4 -5 649)" />
        <path d="M-190 736 V 756 M190 736 V 756" stroke="#E8B84B" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g transform="translate(430 790)">
        <circle cx="0" cy="0" r="18" fill="#B07F4A" />
        <circle cx="0" cy="-26" r="14" fill="#B07F4A" />
        <circle cx="-10" cy="-38" r="6" fill="#B07F4A" /><circle cx="10" cy="-38" r="6" fill="#B07F4A" />
        <circle cx="-4" cy="-28" r="2" fill="#1A2B4A" /><circle cx="4" cy="-28" r="2" fill="#1A2B4A" />
      </g>
      <circle cx="520" cy="812" r="16" fill="#A48BE6" />
      <path d="M506 806 Q 520 818 534 806" stroke="#FFFFFF" strokeWidth="3" fill="none" />
    </>
  );
}

function Colors() {
  const splashes = [[120, 140, '#E8B84B'], [330, 240, '#A48BE6'], [80, 420, '#6CCFA0'], [260, 520, '#E9896B'], [880, 120, '#8FC8EA'], [1120, 260, '#E8B84B'], [860, 420, '#A48BE6'], [560, 70, '#6CCFA0'], [700, 200, '#E9896B']];
  return (
    <>
      <Sky id="gs-co" stops={[[0, '#FAF7F2'], [1, '#F3EADB']]} />
      {splashes.map(([x, y, c], i) => (
        <g key={i} fill={c} opacity="0.8">
          <ellipse cx={x} cy={y} rx="44" ry="34" />
          <circle cx={x + 50} cy={y - 20} r="10" /><circle cx={x - 46} cy={y + 26} r="8" /><circle cx={x + 30} cy={y + 40} r="6" />
        </g>
      ))}
      <g transform="translate(1040 690)">
        <path d="M-70 0 L -20 -360 M70 0 L 20 -360 M0 -320 L 0 0" stroke="#A0743F" strokeWidth="10" strokeLinecap="round" />
        <rect x="-90" y="-330" width="180" height="150" rx="6" fill="#FFFFFF" stroke="#E9D3A8" strokeWidth="6" />
        <g fill="none" strokeWidth="10">
          <path d="M-60 -200 A 60 60 0 0 1 60 -200" stroke="#E9896B" />
          <path d="M-46 -200 A 46 46 0 0 1 46 -200" stroke="#E8B84B" />
          <path d="M-32 -200 A 32 32 0 0 1 32 -200" stroke="#6CCFA0" />
          <path d="M-18 -200 A 18 18 0 0 1 18 -200" stroke="#A48BE6" />
        </g>
        <rect x="-96" y="-180" width="192" height="12" rx="4" fill="#A0743F" />
      </g>
      <rect x="40" y="600" width="280" height="12" rx="4" fill="#A0743F" />
      {[[80, '#E8B84B'], [140, '#A48BE6'], [200, '#6CCFA0'], [260, '#E9896B']].map(([x, c]) => (
        <g key={x}>
          <rect x={x - 22} y="550" width="44" height="50" rx="8" fill="#FFFFFF" stroke="#D9CCB6" strokeWidth="3" />
          <rect x={x - 18} y="566" width="36" height="30" rx="5" fill={c} />
        </g>
      ))}
      <Floor y={700} fill="#E9DFC9" line="#DCCFB4" />
      <g transform="translate(470 790)">
        <path d="M-60 0 C -60 -40 -10 -50 30 -40 C 70 -30 70 10 40 20 C 20 26 22 6 4 10 C -14 14 -10 34 -30 32 C -50 30 -60 18 -60 0 Z" fill="#E9D3A8" stroke="#B8935E" strokeWidth="3" />
        <circle cx="-34" cy="-14" r="9" fill="#E9896B" /><circle cx="-6" cy="-26" r="9" fill="#E8B84B" />
        <circle cx="24" cy="-24" r="9" fill="#6CCFA0" /><circle cx="40" cy="0" r="8" fill="#A48BE6" />
      </g>
      {[['#E9896B', 0], ['#E8B84B', 1], ['#6CCFA0', 2], ['#8798B3', 3], ['#A48BE6', 4]].map(([c, i]) => (
        <g key={c} transform={`translate(${580 + i * 18} 812) rotate(${-20 + i * 10})`}>
          <rect x="-6" y="-50" width="12" height="50" rx="3" fill={c} />
          <path d="M-6 -50 L 0 -64 L 6 -50 Z" fill={c} />
        </g>
      ))}
    </>
  );
}

function Classroom({ board }) {
  const books = [['#E8B84B', 26], ['#A48BE6', 20], ['#8798B3', 30], ['#6CCFA0', 22], ['#E9896B', 26], ['#1A2B4A', 18]];
  let bx = 920;
  return (
    <>
      <Sky id={`gs-cr-${board === 'numbers' ? 'n' : 's'}`} stops={[[0, '#E6EEF5'], [1, '#F4EFE6']]} />
      <rect x="40" y="110" width="330" height="250" rx="10" fill="#1A2B4A" stroke="#A0743F" strokeWidth="14" />
      <text x="205" y="270" textAnchor="middle" fontFamily="Tajawal, sans-serif" fontWeight="800" fontSize="80" fill="#F4EFE6">{board === 'numbers' ? '1 2 3' : 'أ ب ت'}</text>
      <path d="M90 300 q 30 -14 60 0" stroke="#F4EFE6" strokeWidth="4" fill="none" opacity="0.6" />
      <rect x="60" y="360" width="290" height="12" rx="4" fill="#A0743F" />
      <rect x="110" y="352" width="24" height="8" rx="3" fill="#F4EFE6" />
      <circle cx="1000" cy="140" r="54" fill="#FFFFFF" stroke="#1A2B4A" strokeWidth="8" />
      <path d="M1000 140 V 104 M1000 140 L 1026 154" stroke="#1A2B4A" strokeWidth="6" strokeLinecap="round" />
      <rect x="880" y="300" width="290" height="340" rx="8" fill="#C9A06A" />
      {[400, 500, 600].map(y => <rect key={y} x="880" y={y} width="290" height="10" fill="#A0743F" />)}
      {books.map(([c, w], i) => {
        const x = bx; bx += w + 6;
        return <rect key={i} x={x} y={330 - (i % 2) * 8} width={w} height={70 + (i % 2) * 8} rx="3" fill={c} />;
      })}
      <Floor y={700} fill="#D9C3A0" line="#CDB48D" />
      <rect x="410" y="690" width="380" height="18" rx="4" fill="#C9A06A" />
      <rect x="430" y="708" width="340" height="60" fill="#B08850" />
      <path d="M440 768 V 844 M760 768 V 844" stroke="#8A6235" strokeWidth="12" />
      {board === 'numbers' ? (
        <g transform="translate(500 690)">
          <rect x="-70" y="-82" width="140" height="82" rx="6" fill="none" stroke="#A0743F" strokeWidth="8" />
          {[-60, -36, -12].map((y, r) => (
            <g key={y}>
              <path d={`M-66 ${y} H 66`} stroke="#8A6235" strokeWidth="3" />
              {[0, 1, 2, 3, 4].map(k => <circle key={k} cx={-50 + k * 16 + (r % 2) * 8} cy={y} r="7" fill={['#E8B84B', '#A48BE6', '#6CCFA0', '#E9896B', '#8798B3'][(k + r) % 5]} />)}
            </g>
          ))}
        </g>
      ) : (
        <g transform="translate(480 690)">
          <rect x="-46" y="-16" width="92" height="16" rx="3" fill="#A48BE6" />
          <rect x="-40" y="-32" width="84" height="16" rx="3" fill="#E8B84B" />
          <rect x="-44" y="-48" width="88" height="16" rx="3" fill="#8798B3" />
          <g transform="translate(90 -8) rotate(-10)">
            <rect x="-40" y="-6" width="80" height="12" fill="#E8B84B" />
            <path d="M40 -6 L 56 0 L 40 6 Z" fill="#F4EFE6" />
          </g>
        </g>
      )}
      <g transform="translate(640 690)">
        <circle cx="0" cy="-20" r="20" fill="#E25B4B" />
        <path d="M0 -40 C 0 -50 4 -56 10 -60" stroke="#6B4B2E" strokeWidth="4" fill="none" />
        <path d="M4 -48 C 12 -60 26 -58 28 -52 C 20 -44 10 -44 4 -48 Z" fill="#4FA552" />
      </g>
    </>
  );
}

function Meadow() {
  return (
    <>
      <Sky id="gs-me" stops={[[0, '#A9D7EF'], [0.55, '#E3F1EC'], [0.72, '#F4EFE6']]} />
      <Sun x={700} y={150} />
      <Cloud x={460} y={120} /><Cloud x={200} y={150} s={1.1} /><Cloud x={1000} y={110} /><Cloud x={620} y={260} s={0.7} />
      <Birds x={300} y={220} />
      <Hills far="M0 490 Q 200 450 420 476 T 840 466 T 1200 472 V 844 H 0 Z" near="M0 550 Q 220 510 440 538 T 880 528 T 1200 534 V 844 H 0 Z" farFill="#C3E0A5" nearFill="#A3CF84" />
      <RoundTree x={130} y={620} s={1.2} /><RoundTree x={1070} y={620} s={1.25} /><RoundTree x={460} y={600} s={0.7} /><RoundTree x={880} y={560} s={0.5} />
      <Ground id="gs-me-g" d="M0 612 Q 300 590 600 604 T 1200 598 V 844 H 0 Z" top="#8DC66F" bottom="#679F4F" />
      <path d="M540 844 C 590 770 520 710 590 652 C 616 630 600 612 606 604 L 622 604 C 630 620 664 650 640 704 C 616 760 700 800 690 844 Z" fill="#EFE2C4" />
      <Flowers pts={[[430, 700, '#FFFFFF'], [470, 780, '#A48BE6'], [500, 730, '#E8B84B'], [700, 700, '#FFFFFF'], [740, 760, '#A48BE6'], [240, 720, '#FFFFFF'], [300, 790, '#E8B84B'], [920, 740, '#FFFFFF'], [1000, 800, '#A48BE6']]} />
      {[[480, 660, '#A48BE6'], [960, 560, '#E8B84B']].map(([x, y, c]) => (
        <g key={x} fill={c}>
          <ellipse cx={x - 8} cy={y} rx="9" ry="13" transform={`rotate(-25 ${x - 8} ${y})`} />
          <ellipse cx={x + 8} cy={y} rx="9" ry="13" transform={`rotate(25 ${x + 8} ${y})`} />
          <rect x={x - 1.5} y={y - 10} width="3" height="20" rx="1.5" fill="#1A2B4A" />
        </g>
      ))}
    </>
  );
}

const SCENE_COMPONENTS = {
  savanna: Savanna, orchard: Orchard, sea: Sea, garden: Garden, farm: Farm, workshop: Workshop,
  city: City, sports: Sports, jobs: Jobs, clothes: Clothes, weather: Weather, shapes: Shapes,
  family: Family, colors: Colors, numbers: () => <Classroom board="numbers" />, school: () => <Classroom board="school" />,
  meadow: Meadow,
};

// لون أعلى كل مشهد: يملأ ما فوق الرسم في الشاشات الطويلة (آيباد عمودي) فلا يتضخّم الرسم
const SCENE_TOP = {
  savanna: '#9CC9E8', orchard: '#B7DDEF', sea: '#9ADBEA', garden: '#BFE3F2', farm: '#A9D4EC',
  workshop: '#F3E6CC', city: '#9FCBE8', sports: '#A9D4EC', jobs: '#A9D4EC', clothes: '#F1ECFB',
  weather: '#9FD0EE', shapes: '#FAF7F2', family: '#F8EDDA', colors: '#FAF7F2', numbers: '#E6EEF5',
  school: '#E6EEF5', meadow: '#A9D7EF',
};

/* خلفية ثابتة تملأ الشاشة خلف اللعبة؛ تتلاشى بلطف عند تغيّر العالم (لعبة «العب الكل») */
function GameSceneInner({ category, scene }) {
  const key = scene || sceneFor(category);
  const Scene = SCENE_COMPONENTS[key] || Meadow;
  return (
    <div key={key} aria-hidden="true" data-scene={key} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: SCENE_TOP[key] || SCENE_TOP.meadow, animation: 'gsFadeIn .5s ease both' }}>
      <style>{'@keyframes gsFadeIn{from{opacity:0}to{opacity:1}}@media (prefers-reduced-motion: reduce){[data-scene]{animation:none!important}}'}</style>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: 'min(100%, 1000px)', display: 'block' }}>
        <Scene />
      </svg>
    </div>
  );
}

const GameScene = memo(GameSceneInner);
export default GameScene;

/* صورة مصغّرة للعالم (بطاقات المجموعات ونافذة البدء): الرسم نفسه داخل إطاره */
function SceneThumbInner({ category, scene }) {
  const key = scene || sceneFor(category);
  const Scene = SCENE_COMPONENTS[key] || Meadow;
  return (
    <svg aria-hidden="true" data-scene-thumb={key} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" style={{ display: 'block', width: '100%', height: '100%', background: SCENE_TOP[key] || SCENE_TOP.meadow }}>
      <Scene />
    </svg>
  );
}
export const SceneThumb = memo(SceneThumbInner);
