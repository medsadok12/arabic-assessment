// Hand-drawn vector art for the home world: a warm cut-away house whose staircase is the stage path.
// Coordinates match lib/picture-quest-home-scene.js — house centred on x=0, core scene y 0–1600.
// Stage 1 sits in the living room, stage 2 at the top of the stairs, stage 3 in the attic under the roof.
// Everything outside the central rooms (side rooms, garden, trees) only shows on wider screens.
// The art is static and built once; progress only toggles classes on the root <svg>.

const BULB_COLORS=['#ffd23f','#ff7aa8','#7fe0c4','#ffa94d','#8fc8ff'];
const FLOWER_COLORS=['#ff7aa8','#ffd23f','#b98cff','#ff9f68','#7ad0ff'];
// Stair geometry: ten steps rising from the living room (x=230) to the bedroom floor (x=-140).
const STEPS=Array.from({length:10},(_,i)=>({x:230-37*(i+1),y:1330-38*(i+1)}));
const STAIR_EDGE=STEPS.reduce((d,s)=>d+`V${s.y}H${s.x}`,'M230 1330');
const railY=x=>1176+(x-234)*(378/364);
// Fairy lights along the attic rafters: twelve sagging spans, three bulbs each, kept clear of the round window.
const LIGHTS=(()=>{
 const anchors=Array.from({length:13},(_,i)=>{const x=(i-6)*140;return[x,250+.45*Math.abs(x)]});
 let wire='',bulbs=[];
 for(let i=0;i<12;i++){
  const[a,b]=[anchors[i],anchors[i+1]],c=[(a[0]+b[0])/2,(a[1]+b[1])/2+28];
  wire+=`M${a[0]} ${a[1]}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
  for(const t of[.25,.5,.75]){const x=(1-t)**2*a[0]+2*(1-t)*t*c[0]+t*t*b[0],y=(1-t)**2*a[1]+2*(1-t)*t*c[1]+t*t*b[1];if(Math.abs(x)>85)bulbs.push([Math.round(x),Math.round(y)]);}
 }
 return{wire,bulbs};
})();
const SEG_A=[[270,1360],[244,1351],...STEPS.map((s,i)=>[s.x+14,s.y-6+(i%2?2:-1)]),[-170,979],[-202,971]];
const SEG_B=[[-352,979],[-384,971],...Array.from({length:11},(_,i)=>[-372+30*i,i%2?577:587])];
const CLOUDS=[[-200,50,1],[330,-10,.85],[700,150,1.1],[-760,210,1],[-1250,330,1.2],[1200,260,1],[-450,-230,.9],[180,-340,.8],[1650,120,1.1],[-1700,140,.9],[-2300,260,1],[2350,220,1.1]];
const TREES=[[-1190,1440,1.1,true,false],[1190,1440,1.05,false,true],[-1780,1420,.85,false,false],[1800,1420,.9,false,true],[-2400,1410,.8,false,true],[2420,1410,.8,false,false]];
const BEDS=[-830,-690,-555,-420,-300,300,420,555,690,830];
const FLOWERS=[[-420,1560,0],[-330,1640,1],[-450,1730,4],[380,1580,1],[450,1680,0],[330,1760,3],[-200,1610,1],[220,1650,4],[-280,1840,0],[300,1880,2],[-120,1760,3],[140,1860,0]];
const TUFTS=[[-380,1500],[-150,1530],[-60,1670],[120,1560],[260,1720],[420,1820],[-360,1900],[60,1950],[-470,1640],[480,1600],[-230,1980],[200,2000]];
const SPARKS={
 1:[[-470,1110],[-60,1190],[205,1112],[470,1215],[-260,1236],[-20,1080]],
 2:[[-420,700],[-170,868],[180,722],[505,860],[300,640+120],[-30,660+250]],
 3:[[-260,470],[190,430],[310,486],[-120,380],[130,300],[-410,520]]
};
const STAR='M0 -16L4.5 -4.5 16 0 4.5 4.5 0 16-4.5 4.5-16 0-4.5-4.5Z';

function Cloud({x,y,s,i}){
 return <g transform={`translate(${x} ${y}) scale(${s})`}><g className={'pqh-cloud pqh-cloud-'+i%3}>
  <ellipse cx="0" cy="24" rx="96" ry="22" fill="#ffe3ec"/>
  <rect x="-82" y="0" width="162" height="34" rx="17" fill="#fff"/>
  <circle cx="-46" cy="4" r="32" fill="#fff"/><circle cx="-4" cy="-16" r="44" fill="#fff"/><circle cx="44" cy="2" r="33" fill="#fff"/>
  <ellipse cx="-16" cy="-34" rx="18" ry="8" fill="#fffdf8"/>
 </g></g>;
}
function Tree({x,y,s,swing,flip}){
 return <g transform={`translate(${x} ${y}) scale(${flip?-s:s} ${s})`}>
  <ellipse cx="0" cy="8" rx="150" ry="22" fill="#2f6b2a" opacity=".18"/>
  <path d="M-30 6C-26-70-34-150-20-215L-6-250 8-250 20-215C34-150 26-70 30 6Z" fill="#a86a3c"/>
  <path d="M-4 0C0-80-6-160 6-236" stroke="#c98a55" strokeWidth="8" fill="none" strokeLinecap="round" opacity=".7"/>
  <path d="M12-176C40-196 74-204 116-202" stroke="#a86a3c" strokeWidth="18" fill="none" strokeLinecap="round"/>
  <circle cx="0" cy="-320" r="125" fill="#4fae46"/><circle cx="-100" cy="-250" r="90" fill="#5bb84d"/><circle cx="104" cy="-246" r="92" fill="#4aa842"/>
  <circle cx="-48" cy="-395" r="88" fill="#66c457"/><circle cx="62" cy="-382" r="84" fill="#5fbe52"/>
  <circle cx="-62" cy="-412" r="44" fill="#86d872" opacity=".8"/><circle cx="-130" cy="-270" r="36" fill="#7fd06a" opacity=".7"/><circle cx="70" cy="-300" r="30" fill="#7fd06a" opacity=".55"/>
  {[[-30,-300],[60,-236],[-112,-222],[20,-420],[112,-330],[-82,-356]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="11" fill={i%2?'#ff6f7d':'#ffd23f'}/>)}
  {swing&&<g className="pqh-swing"><path d="M72-192V-44M112-192V-44" stroke="#8a5a33" strokeWidth="4"/><rect x="60" y="-50" width="64" height="13" rx="5" fill="#ff8a65"/></g>}
 </g>;
}
function Bush({x,y,s=1,c}){
 return <g transform={`translate(${x} ${y}) scale(${s})`}>
  <ellipse cx="0" cy="4" rx="70" ry="10" fill="#2f6b2a" opacity=".16"/>
  <circle cx="-34" cy="-22" r="30" fill="#4aa842"/><circle cx="30" cy="-24" r="32" fill="#4fae46"/><circle cx="0" cy="-42" r="34" fill="#5bb84d"/><circle cx="-10" cy="-52" r="15" fill="#86d872" opacity=".7"/>
  {[[-30,-34],[14,-54],[36,-20],[-6,-16],[-46,-10]].map(([a,b],i)=><g key={i}><circle cx={a} cy={b} r="8.5" fill={c}/><circle cx={a} cy={b} r="3.2" fill="#fff4b0"/></g>)}
 </g>;
}
function Flower({x,y,c}){
 return <g transform={`translate(${x} ${y})`}>
  <path d="M0 0V-34" stroke="#4f9e3a" strokeWidth="5" strokeLinecap="round"/><ellipse cx="9" cy="-14" rx="9" ry="4.5" fill="#5bb84d" transform="rotate(-30 9 -14)"/>
  {[0,72,144,216,288].map(a=><circle key={a} cx={Math.round(Math.sin(a*Math.PI/180)*10)} cy={Math.round(-40-Math.cos(a*Math.PI/180)*10)} r="8" fill={c}/>)}
  <circle cx="0" cy="-40" r="6" fill="#ffcf3f"/>
 </g>;
}
function Fence({from,to}){
 const n=Math.floor(Math.abs(to-from)/46),dir=Math.sign(to-from),x=Math.min(from,to),w=Math.abs(to-from);
 return <g>
  <rect x={x} y="1340" width={w} height="10" rx="5" fill="#f1dfc6"/><rect x={x} y="1370" width={w} height="10" rx="5" fill="#f1dfc6"/>
  {Array.from({length:n},(_,i)=>{const px=from+dir*(i*46+10);return <path key={i} d={`M${px} 1398V1332l13-14 13 14V1398Z`} fill="#fffaf2" stroke="#e5d1b4" strokeWidth="2"/>})}
 </g>;
}
function Bird({x,y,flip}){
 return <g transform={`translate(${x} ${y}) scale(${flip?-1:1} 1)`}>
  <ellipse cx="0" cy="-10" rx="15" ry="11" fill="#6fc6ff"/><ellipse cx="-3" cy="-9" rx="8" ry="5" fill="#4aa8e8"/>
  <circle cx="11" cy="-20" r="8" fill="#6fc6ff"/><circle cx="13" cy="-22" r="1.8" fill="#1a2b4a"/><path d="M18-20l7 2-7 3z" fill="#ffb347"/>
  <path d="M-4 0v4M3 0v4" stroke="#ff9f68" strokeWidth="2"/>
 </g>;
}
const Foot=({x,y,i})=><g><ellipse className="pqh-foot-glow" cx={x} cy={y} rx="20" ry="11" fill="#ffe68a" opacity="0"/><ellipse className="pqh-foot" cx={x} cy={y} rx="10" ry="5.5" fill="#f6cf6e" transform={`rotate(${i%2?-8:8} ${x} ${y})`}/></g>;

const DEFS=<defs>
 <linearGradient id="pqh-sky" x1="0" y1="-900" x2="0" y2="1450" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#5fa8ff"/><stop offset=".4" stopColor="#9fd0ff"/><stop offset=".72" stopColor="#d9ecff"/><stop offset=".9" stopColor="#ffe6c7"/><stop offset="1" stopColor="#ffd8ab"/></linearGradient>
 <linearGradient id="pqh-grass" x1="0" y1="1390" x2="0" y2="2300" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#a3dc74"/><stop offset=".3" stopColor="#7fc75a"/><stop offset="1" stopColor="#57a640"/></linearGradient>
 <linearGradient id="pqh-roof" x1="0" y1="150" x2="0" y2="664" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f6905f"/><stop offset="1" stopColor="#d65a40"/></linearGradient>
 <linearGradient id="pqh-attic-shade" x1="0" y1="214" x2="0" y2="600" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#8a4a1a" stopOpacity=".22"/><stop offset=".6" stopColor="#8a4a1a" stopOpacity="0"/></linearGradient>
 <linearGradient id="pqh-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dc9e5e"/><stop offset="1" stopColor="#b5733a"/></linearGradient>
 <linearGradient id="pqh-sofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5fd0c0"/><stop offset="1" stopColor="#2f9e90"/></linearGradient>
 <linearGradient id="pqh-glass-day" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fc6ff"/><stop offset=".7" stopColor="#d6ecff"/><stop offset="1" stopColor="#ffe2bd"/></linearGradient>
 <linearGradient id="pqh-glass-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b8cff"/><stop offset=".55" stopColor="#d4a6f2"/><stop offset="1" stopColor="#ffbe8f"/></linearGradient>
 <linearGradient id="pqh-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d0" stopOpacity=".85"/><stop offset="1" stopColor="#fff6d0" stopOpacity="0"/></linearGradient>
 <radialGradient id="pqh-glow"><stop offset="0" stopColor="#fff7cf" stopOpacity=".95"/><stop offset=".35" stopColor="#ffe28a" stopOpacity=".5"/><stop offset="1" stopColor="#ffd36a" stopOpacity="0"/></radialGradient>
 <radialGradient id="pqh-sunglow"><stop offset="0" stopColor="#fff6c4" stopOpacity=".9"/><stop offset="1" stopColor="#ffe6a0" stopOpacity="0"/></radialGradient>
 <radialGradient id="pqh-emblem" cx=".5" cy=".42"><stop offset="0" stopColor="#fffbe6"/><stop offset=".55" stopColor="#ffdb84"/><stop offset="1" stopColor="#ffab55"/></radialGradient>
 <pattern id="pqh-wp-peach" width="64" height="64" patternUnits="userSpaceOnUse"><rect width="64" height="64" fill="#ffe3c9"/><circle cx="16" cy="16" r="5" fill="#ffcca3"/><circle cx="16" cy="16" r="2" fill="#fff1e2"/><circle cx="48" cy="48" r="5" fill="#ffd2b0"/><circle cx="48" cy="48" r="2" fill="#fff1e2"/><circle cx="48" cy="14" r="2" fill="#ffc89c"/><circle cx="14" cy="48" r="2" fill="#ffc89c"/></pattern>
 <pattern id="pqh-wp-blue" width="72" height="72" patternUnits="userSpaceOnUse"><rect width="72" height="72" fill="#d8ebff"/><path d="M18 10l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#fff"/><path d="M54 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffe9a8"/><circle cx="52" cy="14" r="2.5" fill="#b9d9ff"/><circle cx="16" cy="52" r="2.5" fill="#b9d9ff"/></pattern>
 <pattern id="pqh-wp-lilac" width="56" height="56" patternUnits="userSpaceOnUse"><rect width="56" height="56" fill="#efe7ff"/><rect width="16" height="56" fill="#e5dbff"/><circle cx="38" cy="28" r="3" fill="#d8caff"/></pattern>
 <pattern id="pqh-wp-sun" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="#fff3c4"/><circle cx="15" cy="15" r="5" fill="#ffe48f"/><circle cx="45" cy="45" r="5" fill="#ffd9a0"/></pattern>
 <pattern id="pqh-planks" width="52" height="320" patternUnits="userSpaceOnUse"><rect width="52" height="320" fill="#f3c88f"/><rect width="3" height="320" fill="#dda768"/><rect x="3" width="5" height="320" fill="#f8d6a8" opacity=".6"/><ellipse cx="30" cy="110" rx="5" ry="3" fill="#dfa868"/><ellipse cx="18" cy="250" rx="4" ry="2.5" fill="#dfa868"/></pattern>
 <pattern id="pqh-floor" width="120" height="26" patternUnits="userSpaceOnUse"><rect width="120" height="26" fill="#e2a462"/><rect width="120" height="3" fill="#c6884a"/><rect y="3" width="120" height="3" fill="#efbd82" opacity=".7"/><rect x="44" width="3" height="13" fill="#c6884a"/><rect x="100" y="13" width="3" height="13" fill="#c6884a"/><rect y="13" width="120" height="2" fill="#cf9455"/></pattern>
 <pattern id="pqh-tile-mint" width="36" height="36" patternUnits="userSpaceOnUse"><rect width="36" height="36" fill="#d4f4e6"/><path d="M0 1H36M1 0V36" stroke="#aee0ca" strokeWidth="2"/></pattern>
 <pattern id="pqh-tile-aqua" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="#cff2f8"/><path d="M0 1H34M1 0V34" stroke="#a5dde8" strokeWidth="2"/></pattern>
 <pattern id="pqh-shingle" width="44" height="26" patternUnits="userSpaceOnUse"><path d="M0 13q11-12 22 0t22 0M-22 26q11-12 22 0t22 0t22 0" fill="none" stroke="#b9462f" strokeWidth="3" opacity=".45"/></pattern>
 <pattern id="pqh-quilt" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#ff8f8f"/><rect x="22" width="22" height="22" fill="#ffd36b"/><rect y="22" width="22" height="22" fill="#86dcc3"/><rect x="22" y="22" width="22" height="22" fill="#ffb3cb"/><path d="M0 1H44M0 23H44M1 0V44M23 0V44" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" opacity=".8"/></pattern>
 <pattern id="pqh-stone" width="70" height="44" patternUnits="userSpaceOnUse"><rect width="70" height="44" fill="#d3bd9f"/><rect x="3" y="3" width="30" height="17" rx="6" fill="#e2cfb3"/><rect x="37" y="3" width="30" height="17" rx="6" fill="#dcc6a8"/><rect x="-14" y="24" width="30" height="17" rx="6" fill="#dcc6a8"/><rect x="20" y="24" width="30" height="17" rx="6" fill="#e5d3b8"/><rect x="54" y="24" width="30" height="17" rx="6" fill="#e2cfb3"/></pattern>
 <pattern id="pqh-brick" width="40" height="24" patternUnits="userSpaceOnUse"><rect width="40" height="24" fill="#d2714f"/><path d="M0 1H40M0 13H40M20 1V13M1 13V24" stroke="#b9583b" strokeWidth="2"/></pattern>
 <pattern id="pqh-runner" width="30" height="28" patternUnits="userSpaceOnUse"><rect width="30" height="28" fill="#e85a72"/><path d="M15 6l7 8-7 8-7-8z" fill="#ff8fa3"/></pattern>
 <clipPath id="pqh-clip-livewin"><rect x="-432" y="1094" width="194" height="104" rx="6"/></clipPath>
 <clipPath id="pqh-clip-bedwin"><path d="M246 816V744a84 62 0 0 1 168 0V816Z"/></clipPath>
</defs>;

const OUTSIDE=<g>
 <rect x="-4000" y="-3000" width="8000" height="4600" fill="url(#pqh-sky)"/>
 <circle cx="-430" cy="70" r="170" fill="url(#pqh-sunglow)"/>
 <g className="pqh-sun"><circle cx="-430" cy="70" r="54" fill="#ffd44f"/><circle cx="-430" cy="70" r="42" fill="#ffe58a"/><circle cx="-446" cy="54" r="13" fill="#fff6c9" opacity=".8"/></g>
 {CLOUDS.map(([x,y,s],i)=><Cloud key={i} x={x} y={y} s={s} i={i}/>)}
 <path d="M430-160q12-12 24 0q12-12 24 0M500-120q9-9 18 0q9-9 18 0M-640 -40q10-10 20 0q10-10 20 0" stroke="#5b6b8a" strokeWidth="4" fill="none" strokeLinecap="round"/>
 <path d="M-4000 1340C-3200 1180-2600 1180-2000 1290S-1100 1180-700 1300 0 1250 700 1300 1500 1170 2100 1290 3300 1200 4000 1330V1500H-4000Z" fill="#b4e08a"/>
 {[[-1420,1268,34],[-1520,1262,28],[-2050,1258,36],[-2260,1250,30],[1420,1262,32],[1540,1258,26],[2100,1268,36],[2300,1255,30]].map(([x,y,r],i)=><g key={i}><rect x={x-4} y={y} width="8" height={r} fill="#8a6a44"/><circle cx={x} cy={y-r*.3} r={r} fill={i%2?'#6cbf55':'#79c962'}/></g>)}
 <path d="M-4000 1380C-3000 1290-2300 1300-1700 1360S-900 1300-400 1370 600 1320 1200 1370 2600 1300 4000 1390V1500H-4000Z" fill="#97d26e"/>
 <rect x="-4000" y="1392" width="8000" height="3000" fill="url(#pqh-grass)"/>
 <rect x="-4000" y="1392" width="8000" height="8" fill="#b9e78c"/>
 <Fence from={930} to={2600}/><Fence from={-930} to={-2600}/>
 {TREES.map(([x,y,s,swing,flip],i)=><Tree key={i} x={x} y={y} s={s} swing={swing} flip={flip}/>)}
 <Bush x={-985} y={1446} c="#ff7aa8"/><Bush x={985} y={1446} c="#ffd23f"/>
 <g><rect x="1036" y="1340" width="10" height="72" fill="#9a6a3c"/><rect x="1010" y="1302" width="64" height="44" rx="16" fill="#ff6b6b"/><rect x="1010" y="1322" width="64" height="24" fill="#e85454"/><path d="M1074 1310h10v24" stroke="#ffd23f" strokeWidth="5" fill="none" strokeLinecap="round"/></g>
 {[[0,1470,52,14],[-30,1545,58,15],[12,1625,62,16],[-22,1710,66,17],[16,1800,70,18],[-12,1895,74,19],[4,1995,78,20],[-8,2100,82,21]].map(([x,y,rx,ry],i)=><ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#f2e6cd" stroke="#d6c19c" strokeWidth="3"/>)}
 {TUFTS.map(([x,y],i)=><path key={i} d={`M${x} ${y}q4-16 2-24M${x} ${y}q8-12 12-18M${x} ${y}q-8-10-12-16`} stroke="#5aa843" strokeWidth="4" fill="none" strokeLinecap="round"/>)}
 {FLOWERS.map(([x,y,c],i)=><Flower key={i} x={x} y={y} c={FLOWER_COLORS[c]}/>)}
 <g transform="translate(-185 1512)"><ellipse cx="0" cy="18" rx="44" ry="8" fill="#2f6b2a" opacity=".16"/><path d="M-26 -10H18L14 16H-22Z" fill="#6fc6ff" stroke="#3f9bd8" strokeWidth="3" strokeLinejoin="round"/><path d="M16-2L42-20" stroke="#3f9bd8" strokeWidth="7" strokeLinecap="round"/><circle cx="44" cy="-22" r="7" fill="#3f9bd8"/><path d="M-20-10C-20-34 12-34 12-10" stroke="#3f9bd8" strokeWidth="5" fill="none"/></g>
 <g transform="translate(200 1500)"><ellipse cx="2" cy="22" rx="26" ry="6" fill="#2f6b2a" opacity=".16"/><circle r="22" fill="#ff6b6b"/><path d="M-21-6Q0 6 21-6M-14 16Q0 4 14 16" stroke="#fff" strokeWidth="6" fill="none"/><path d="M-6-21Q4 0-6 21" stroke="#ffd23f" strokeWidth="6" fill="none"/></g>
 <g transform="translate(-380 1470)"><g className="pqh-fly"><g className="pqh-wing"><path d="M0 0C-16-20-30-6-14 6ZM0 0C16-20 30-6 14 6Z" fill="#ff9fbf"/><path d="M0 0C-12 12-20 16-6 18ZM0 0C12 12 20 16 6 18Z" fill="#ffd23f"/></g><rect x="-2" y="-8" width="4" height="22" rx="2" fill="#5a3b24"/></g></g>
 <g transform="translate(410 1530)"><g className="pqh-fly pqh-fly-2"><g className="pqh-wing"><path d="M0 0C-16-20-30-6-14 6ZM0 0C16-20 30-6 14 6Z" fill="#8fc8ff"/><path d="M0 0C-12 12-20 16-6 18ZM0 0C12 12 20 16 6 18Z" fill="#ff9fbf"/></g><rect x="-2" y="-8" width="4" height="22" rx="2" fill="#5a3b24"/></g></g>
</g>;

const ATTIC=<g>
 <polygon points="-858,600 0,214 858,600" fill="url(#pqh-planks)"/>
 <polygon points="-858,600 0,214 858,600" fill="url(#pqh-attic-shade)"/>
 <polyline points="-870,615 0,226 870,615" fill="none" stroke="#b06f3a" strokeWidth="24" strokeLinejoin="round"/>
 <polyline points="-870,632 0,243 870,632" fill="none" stroke="#9a5d2e" strokeWidth="4" opacity=".35"/>
 <circle className="pqh-emblem-glow" cx="0" cy="330" r="170" fill="url(#pqh-glow)"/>
 <g>
  <circle cx="0" cy="330" r="70" fill="#a8652f"/><circle cx="0" cy="330" r="64" fill="#c98448"/><circle cx="0" cy="330" r="55" fill="#ffd166"/>
  <circle cx="0" cy="330" r="47" fill="url(#pqh-emblem)"/>
  <path d="M0 283V377M-47 330H47M-33 297L33 363M33 297L-33 363" stroke="#fff4d6" strokeWidth="3" opacity=".55"/>
  <rect x="-20" y="315" width="40" height="31" rx="4" fill="#ff8b6b"/>
  <path d="M-30 318L0 291 30 318" fill="#e85a72" stroke="#fff" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
  <path d="M0 341c-9-6-13-10-13-15a6.5 6.5 0 0 1 13-3 6.5 6.5 0 0 1 13 3c0 5-4 9-13 15z" fill="#fff"/>
  <ellipse cx="-24" cy="303" rx="9" ry="4" fill="#fff" opacity=".7" transform="rotate(-35 -24 303)"/>
 </g>
 <path d={LIGHTS.wire} fill="none" stroke="#6b4a2e" strokeWidth="3"/>
 {LIGHTS.bulbs.map(([x,y],i)=><g key={i} className="pqh-bulb" style={{animationDelay:(i%5)*.45+'s'}}><circle cx={x} cy={y+12} r="17" fill={BULB_COLORS[i%5]} opacity=".32"/><rect x={x-3} y={y} width="6" height="6" rx="1.5" fill="#6b4a2e"/><ellipse cx={x} cy={y+13} rx="6.5" ry="8.5" fill={BULB_COLORS[i%5]}/><ellipse cx={x-2} cy={y+10} rx="2" ry="3" fill="#fff" opacity=".75"/></g>)}
 <rect x="-846" y="562" width="1692" height="38" fill="url(#pqh-floor)"/>
 <rect x="-846" y="560" width="1692" height="4" fill="#a8652f" opacity=".45"/>
 {/* Wide screens: a trunk, boxes, telescope and plant under the low eaves */}
 <g><rect x="-640" y="532" width="98" height="60" rx="9" fill="#b5733a" stroke="#8a5428" strokeWidth="3"/><rect x="-640" y="548" width="98" height="6" fill="#8a5428"/><rect x="-620" y="532" width="8" height="60" fill="#f2c14e"/><rect x="-570" y="532" width="8" height="60" fill="#f2c14e"/><rect x="-597" y="556" width="12" height="12" rx="3" fill="#f2c14e"/></g>
 <g><rect x="-722" y="556" width="62" height="40" rx="4" fill="#e8c08a" stroke="#c99a5c" strokeWidth="3"/><path d="M-722 568h62" stroke="#c99a5c" strokeWidth="3"/></g>
 <g><path d="M600 540L574 596M600 540L626 596M600 540V596" stroke="#5a6b8a" strokeWidth="5" strokeLinecap="round"/><rect x="560" y="510" width="92" height="20" rx="8" fill="#6fc6ff" stroke="#3f9bd8" strokeWidth="3" transform="rotate(-22 600 520)"/></g>
 <g><path d="M706 572H736L732 596H710Z" fill="#e07a52"/><ellipse cx="712" cy="560" rx="7" ry="14" fill="#4fae46" transform="rotate(-25 712 560)"/><ellipse cx="730" cy="558" rx="7" ry="14" fill="#5bb84d" transform="rotate(25 730 558)"/></g>
 {/* Toy chest and blocks on the left, reading nook and lantern on the right */}
 <ellipse cx="-293" cy="566" rx="66" ry="7" fill="#5a3410" opacity=".14"/>
 <path d="M-346 512H-240L-250 476H-336Z" fill="#4fb0ef" stroke="#3f9bd8" strokeWidth="3" strokeLinejoin="round"/>
 <circle cx="-318" cy="500" r="16" fill="#ff6b6b"/><path d="M-333 496Q-318 506-303 496" stroke="#fff" strokeWidth="4" fill="none"/>
 <rect x="-300" y="490" width="20" height="20" rx="4" fill="#7fd8be"/><circle cx="-266" cy="500" r="9" fill="#c98b5a"/><circle cx="-266" cy="500" r="4" fill="#f3c9a0"/>
 <rect x="-350" y="508" width="114" height="56" rx="8" fill="#6fc6ff" stroke="#3f9bd8" strokeWidth="3"/>
 <rect x="-350" y="524" width="114" height="8" fill="#ffd166"/><path d={STAR} transform="translate(-293 548) scale(.6)" fill="#fff"/>
 <rect x="-190" y="532" width="28" height="28" rx="5" fill="#ffd166" stroke="#e8a93a" strokeWidth="2"/><circle cx="-176" cy="546" r="6" fill="#fff"/>
 <rect x="-160" y="532" width="28" height="28" rx="5" fill="#ff8fab" stroke="#e86b8c" strokeWidth="2"/><path d="M-146 539l7 13h-14z" fill="#fff"/>
 <rect x="-175" y="504" width="28" height="28" rx="5" fill="#8fc8ff" stroke="#5fa8e8" strokeWidth="2"/><rect x="-167" y="512" width="12" height="12" rx="2" fill="#fff"/>
 <ellipse cx="236" cy="596" rx="72" ry="8" fill="#5a3410" opacity=".14"/>
 <path d="M168 596C160 560 182 524 228 522C272 520 298 550 300 596Z" fill="#ff8a80"/><path d="M186 560C192 540 210 532 230 532" stroke="#ffb3ab" strokeWidth="8" fill="none" strokeLinecap="round"/>
 <path d="M206 548L230 556 254 548V566L230 574 206 566Z" fill="#fff" stroke="#e8d9c4" strokeWidth="2"/><path d="M230 556V574" stroke="#e8d9c4" strokeWidth="2"/>
 <rect x="312" y="566" width="50" height="12" rx="3" fill="#7fd8be"/><rect x="316" y="554" width="44" height="12" rx="3" fill="#ffd166"/><rect x="310" y="542" width="48" height="12" rx="3" fill="#ff8fab"/><rect x="318" y="530" width="40" height="12" rx="3" fill="#8fc8ff"/>
 <circle className="pqh-lampglow" cx="430" cy="556" r="80" fill="url(#pqh-glow)"/>
 <g><rect x="414" y="584" width="32" height="10" rx="3" fill="#8a5428"/><rect x="418" y="542" width="24" height="42" rx="6" fill="#fff0b3" stroke="#c98448" strokeWidth="4"/><path d="M414 544L430 526 446 544Z" fill="#c98448"/><circle cx="430" cy="563" r="7" fill="#ffd23f"/></g>
 {/* Hatch and stage 3 cushion */}
 <rect x="-472" y="566" width="78" height="72" rx="4" fill="#6e4627"/><rect x="-466" y="570" width="66" height="8" fill="#8a5a33"/>
 <rect x="-497" y="502" width="22" height="66" rx="4" fill="#c98448" stroke="#9a5d2e" strokeWidth="2"/>
 <rect x="-392" y="569" width="330" height="24" rx="12" fill="url(#pqh-runner)" stroke="#ffd166" strokeWidth="3"/>
 <ellipse cx="40" cy="597" rx="112" ry="10" fill="#5a3410" opacity=".15"/>
 <ellipse cx="40" cy="588" rx="104" ry="16" fill="#7fd8be"/><ellipse cx="40" cy="587" rx="80" ry="11" fill="#ffd166"/><ellipse cx="40" cy="586" rx="54" ry="7" fill="#ff9fb8"/>
</g>;

const UPPER=<g>
 {/* Bathroom (wide screens) */}
 <rect x="-844" y="640" width="304" height="310" fill="url(#pqh-tile-aqua)"/><rect x="-844" y="640" width="304" height="148" fill="#e9f8fb"/><rect x="-844" y="786" width="304" height="8" fill="#fff"/>
 <circle cx="-760" cy="720" r="36" fill="#fff" stroke="#a5dde8" strokeWidth="6"/><circle cx="-760" cy="720" r="28" fill="url(#pqh-glass-day)"/><path d="M-760 692V748M-788 720H-732" stroke="#fff" strokeWidth="4"/>
 <rect x="-814" y="816" width="94" height="6" rx="3" fill="#b9c6d2"/><rect x="-800" y="820" width="58" height="72" rx="6" fill="#ff9fbf"/><rect x="-800" y="862" width="58" height="6" fill="#fff"/><rect x="-800" y="874" width="58" height="4" fill="#fff"/>
 <g>{[[-800,866,14],[-776,856,18],[-748,866,13],[-718,860,16],[-688,868,12],[-664,862,10]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} fill="#f4fdff" stroke="#c7eef6" strokeWidth="2"/>)}</g>
 <g><ellipse cx="-735" cy="846" rx="16" ry="11" fill="#ffd23f"/><circle cx="-723" cy="832" r="9" fill="#ffd23f"/><path d="M-716 832l9 3-9 3z" fill="#ff9f40"/><circle cx="-721" cy="829" r="1.8" fill="#1a2b4a"/></g>
 <path d="M-834 884H-646V930C-646 956-666 972-692 972H-788C-814 972-834 956-834 930Z" fill="#fffefb" stroke="#9fd6e3" strokeWidth="4"/>
 <rect x="-842" y="876" width="204" height="14" rx="7" fill="#fff" stroke="#9fd6e3" strokeWidth="3"/>
 <path d="M-806 970v18M-674 970v18" stroke="#f2c14e" strokeWidth="9" strokeLinecap="round"/>
 <rect x="-630" y="798" width="60" height="72" rx="28" fill="#e6f5ff" stroke="#9fd6e3" strokeWidth="5"/><path d="M-614 814l20-14M-616 834l28-22" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
 <rect x="-610" y="900" width="20" height="86" fill="#fff" stroke="#c7e3ea" strokeWidth="2"/>
 <path d="M-630 884H-570V896C-570 910-584 918-600 918S-630 910-630 896Z" fill="#fff" stroke="#9fd6e3" strokeWidth="3"/><rect x="-604" y="872" width="8" height="14" rx="3" fill="#b9c6d2"/>
 {/* Bedroom and stairwell (always visible) */}
 <rect x="-520" y="640" width="1040" height="310" fill="url(#pqh-wp-blue)"/>
 <rect x="-140" y="950" width="270" height="95" fill="url(#pqh-wp-blue)"/>
 {/* Playroom (wide screens) */}
 <rect x="540" y="640" width="304" height="310" fill="url(#pqh-wp-sun)"/>
 <rect x="-844" y="640" width="1688" height="16" fill="#3a2410" opacity=".07"/>
 {[[-844,304],[-520,380],[130,390],[540,304]].map(([x,w])=><g key={x}><rect x={x} y="940" width={w} height="10" fill="#fffaf2"/><rect x={x} y="950" width={w} height="50" fill="url(#pqh-floor)"/><rect x={x} y="950" width={w} height="4" fill="#9a5d2e" opacity=".3"/></g>)}
 {/* Family gallery on the stairwell wall */}
 <g>
  <rect x="-78" y="686" width="156" height="116" rx="10" fill="#e9a84a" stroke="#c98a2e" strokeWidth="3"/><rect x="-66" y="698" width="132" height="92" rx="4" fill="#fff6e6"/>
  <rect x="-66" y="772" width="132" height="18" fill="#c9f0b0"/><circle cx="48" cy="714" r="9" fill="#ffd23f"/>
  <path d="M-6 718c-5-3-7-5-7-8a3.5 3.5 0 0 1 7-1.5 3.5 3.5 0 0 1 7 1.5c0 3-2 5-7 8z" fill="#ff7a8a"/>
  <rect x="-54" y="752" width="32" height="38" rx="12" fill="#5fa8ff"/><circle cx="-38" cy="738" r="13" fill="#f2c29a"/><path d="M-51 735a13 13 0 0 1 26 0c-6-6-20-6-26 0z" fill="#5a3b24"/>
  <circle cx="-10" cy="739" r="15" fill="#ff8fab"/><circle cx="-10" cy="741" r="10" fill="#f6cfa8"/><rect x="-26" y="752" width="32" height="38" rx="12" fill="#ff8fab"/>
  <rect x="6" y="764" width="24" height="26" rx="9" fill="#ffd166"/><circle cx="18" cy="754" r="10" fill="#e9b88f"/><path d="M8 752a10 10 0 0 1 20 0c-5-5-15-5-20 0z" fill="#3b2a1c"/>
  <rect x="33" y="768" width="22" height="22" rx="8" fill="#7fd8be"/><circle cx="44" cy="759" r="9" fill="#f2c29a"/><circle cx="35" cy="756" r="4" fill="#6b4226"/><circle cx="53" cy="756" r="4" fill="#6b4226"/><path d="M35 757a9 9 0 0 1 18 0c-4-5-14-5-18 0z" fill="#6b4226"/>
  {[[-38,738,13],[-10,741,10],[18,754,10],[44,759,9]].map(([x,y,r])=><g key={x}><circle cx={x-r*.36} cy={y-1} r="1.7" fill="#3a2410"/><circle cx={x+r*.36} cy={y-1} r="1.7" fill="#3a2410"/><path d={`M${x-r*.4} ${y+r*.35}q${r*.4} ${r*.35} ${r*.8} 0`} stroke="#c0504d" strokeWidth="1.8" fill="none" strokeLinecap="round"/></g>)}
  <circle cx="-112" cy="716" r="22" fill="#ffd166"/><circle cx="-112" cy="716" r="16" fill="#fff4e3"/><path d="M-112 724c-6-4-9-7-9-10a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c0 3-3 6-9 10z" fill="#ff7a8a"/>
  <rect x="92" y="704" width="40" height="40" rx="6" fill="#8fc8ff"/><rect x="98" y="710" width="28" height="28" rx="3" fill="#fff4e3"/><path d={STAR} transform="translate(112 724) scale(.62)" fill="#ffd166"/>
 </g>
 {/* Stage 2 corner: mirror, little frames, runner and rug */}
 <ellipse cx="-270" cy="716" rx="44" ry="56" fill="#f2c14e" stroke="#d79f2a" strokeWidth="3"/><ellipse cx="-270" cy="716" rx="34" ry="46" fill="#e6f5ff"/><path d="M-290 700l22-24M-288 726l34-38" stroke="#fff" strokeWidth="5" strokeLinecap="round"/>
 <rect x="-390" y="690" width="44" height="54" rx="6" fill="#ff9fbf"/><rect x="-384" y="696" width="32" height="42" rx="3" fill="#fff4e3"/><circle cx="-368" cy="712" r="7" fill="#f2c29a"/><path d="M-376 709a8 8 0 0 1 16 0c-4-4-12-4-16 0z" fill="#fff"/><rect x="-378" y="721" width="20" height="15" rx="6" fill="#7fd8be"/>
 <rect x="-200" y="682" width="44" height="40" rx="6" fill="#7fd8be"/><rect x="-194" y="688" width="32" height="28" rx="3" fill="#fff4e3"/><path d="M-188 712l8-12 6 8 5-5 7 9z" fill="#5bb84d"/><circle cx="-170" cy="696" r="4" fill="#ffd23f"/>
 <rect x="-448" y="962" width="300" height="26" rx="13" fill="url(#pqh-runner)" stroke="#ffd166" strokeWidth="3"/>
 <ellipse cx="-270" cy="984" rx="118" ry="9" fill="#5a3410" opacity=".14"/>
 <ellipse cx="-270" cy="976" rx="112" ry="17" fill="#7fd8be"/><ellipse cx="-270" cy="975" rx="86" ry="12" fill="#fff2b8"/><ellipse cx="-270" cy="974" rx="56" ry="7" fill="#ff9fb8"/>
 {/* Bedroom: window with curtains, lamp, bed with pillow, blanket and teddy */}
 <circle className="pqh-lampglow" cx="470" cy="724" r="175" fill="url(#pqh-glow)"/>
 <path d="M232 828V742a98 74 0 0 1 196 0V828Z" fill="#fff8ee" stroke="#e6caa0" strokeWidth="4"/>
 <path d="M246 816V744a84 62 0 0 1 168 0V816Z" fill="url(#pqh-glass-dusk)"/>
 <g clipPath="url(#pqh-clip-bedwin)"><circle cx="372" cy="716" r="13" fill="#fff4c2"/><circle cx="368" cy="712" r="3" fill="#ffe7a0"/><path d={STAR} transform="translate(286 728) scale(.4)" fill="#fff"/><path d={STAR} transform="translate(326 700) scale(.3)" fill="#fff"/><path d={STAR} transform="translate(398 758) scale(.32)" fill="#fff"/><path d="M246 816V792Q290 772 330 790T414 786V816Z" fill="#9fcf86"/><circle cx="280" cy="792" r="10" fill="#6cbf55"/></g>
 <path d="M330 680V816M246 772H414" stroke="#fff8ee" strokeWidth="7"/>
 <rect x="222" y="826" width="216" height="12" rx="6" fill="#f3dcc0"/>
 <g className="pqh-curtain"><path d="M214 666H262C256 720 266 760 250 800C246 830 254 850 248 862H224C228 830 210 760 214 666Z" fill="#ff9fbf"/><path d="M232 670C230 720 238 770 234 858" stroke="#ffc3d6" strokeWidth="5" fill="none"/></g>
 <g className="pqh-curtain pqh-curtain-r"><path d="M446 666H398C404 720 394 760 410 800C414 830 406 850 412 862H436C432 830 450 760 446 666Z" fill="#ff9fbf"/><path d="M428 670C430 720 422 770 426 858" stroke="#ffc3d6" strokeWidth="5" fill="none"/></g>
 <rect x="224" y="794" width="34" height="9" rx="4" fill="#ffd166"/><rect x="402" y="794" width="34" height="9" rx="4" fill="#ffd166"/>
 <rect x="204" y="660" width="252" height="8" rx="4" fill="#c98448"/><circle cx="204" cy="664" r="7" fill="#c98448"/><circle cx="456" cy="664" r="7" fill="#c98448"/>
 <path d="M210 666h240v14q-10 12-20 0t-20 0t-20 0t-20 0t-20 0t-20 0t-20 0t-20 0t-20 0t-20 0t-20 0t-20 0z" fill="#ff7fa8"/>
 <path d="M446 712L494 712 520 940 404 940Z" fill="url(#pqh-beam)" opacity=".45"/>
 <path d="M470 640V690" stroke="#6b4a2e" strokeWidth="3"/><path d="M440 712Q440 686 470 686Q500 686 500 712Z" fill="#ffd166" stroke="#e8a93a" strokeWidth="3"/><circle cx="470" cy="714" r="8" fill="#fff7cf"/>
 <ellipse cx="330" cy="994" rx="170" ry="9" fill="#5a3410" opacity=".14"/>
 <path d="M470 990V858a18 18 0 0 1 36 0V990Z" fill="#c98448" stroke="#9a5d2e" strokeWidth="3"/><path d="M488 884c-6-4-9-7-9-10a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c0 3-3 6-9 10z" fill="#ff9fb8"/>
 <path d="M168 990V912a14 14 0 0 1 28 0V990Z" fill="#c98448" stroke="#9a5d2e" strokeWidth="3"/>
 <rect x="180" y="966" width="10" height="24" fill="#9a5d2e"/><rect x="460" y="966" width="10" height="24" fill="#9a5d2e"/>
 <rect x="186" y="944" width="292" height="26" rx="6" fill="#d99a5b" stroke="#9a5d2e" strokeWidth="2"/>
 <rect x="194" y="906" width="280" height="40" rx="12" fill="#fffaf4" stroke="#eadfd2" strokeWidth="2"/>
 <rect x="194" y="900" width="220" height="56" rx="14" fill="url(#pqh-quilt)" stroke="#ff8a8a" strokeWidth="3"/>
 <rect x="196" y="896" width="216" height="14" rx="7" fill="#fff3f6" stroke="#ffc3d2" strokeWidth="2"/>
 <rect x="404" y="880" width="66" height="36" rx="17" fill="#fffdf8" stroke="#ecdcc8" strokeWidth="2"/><path d="M420 892q16 8 34 0" stroke="#efe2d0" strokeWidth="3" fill="none"/>
 <g><circle cx="286" cy="836" r="8" fill="#c98b5a"/><circle cx="314" cy="836" r="8" fill="#c98b5a"/><circle cx="286" cy="836" r="4" fill="#f3c9a0"/><circle cx="314" cy="836" r="4" fill="#f3c9a0"/>
  <ellipse cx="300" cy="882" rx="20" ry="19" fill="#c98b5a"/><ellipse cx="300" cy="886" rx="11" ry="10" fill="#f3c9a0"/><ellipse cx="282" cy="880" rx="7" ry="11" fill="#b8784a" transform="rotate(25 282 880)"/><ellipse cx="318" cy="880" rx="7" ry="11" fill="#b8784a" transform="rotate(-25 318 880)"/>
  <circle cx="300" cy="850" r="18" fill="#d29a68"/><ellipse cx="300" cy="856" rx="8" ry="6" fill="#f3d3b0"/><circle cx="300" cy="853" r="2.6" fill="#5a3410"/><circle cx="293" cy="845" r="2.2" fill="#3a2410"/><circle cx="307" cy="845" r="2.2" fill="#3a2410"/><path d="M292 866l8 4 8-4-8-4z" fill="#ff7a8a"/></g>
 <g><rect x="126" y="862" width="14" height="128" rx="3" fill="#fffaf0" stroke="#e2cfb2" strokeWidth="2"/><circle cx="133" cy="856" r="9" fill="#fffaf0" stroke="#e2cfb2" strokeWidth="2"/></g>
 {/* Playroom: wardrobe, kite, toy box (wide screens) */}
 <path d="M760 690L790 730 760 770 730 730Z" fill="#7ad0ff" stroke="#3f9bd8" strokeWidth="3"/><path d="M760 690V770M730 730H790" stroke="#fff" strokeWidth="2"/><path d="M760 770q-10 20 4 34t-6 34" stroke="#ff7a8a" strokeWidth="3" fill="none"/>
 <ellipse cx="620" cy="990" rx="70" ry="8" fill="#5a3410" opacity=".14"/>
 <rect x="552" y="758" width="138" height="16" rx="6" fill="#7cc79e"/><rect x="560" y="770" width="122" height="214" rx="10" fill="#9ad7b4" stroke="#5fb38b" strokeWidth="3"/>
 <path d="M621 778V976" stroke="#5fb38b" strokeWidth="3"/><circle cx="612" cy="872" r="5" fill="#ffd166"/><circle cx="630" cy="872" r="5" fill="#ffd166"/>
 <path d="M591 808c-7-5-10-8-10-11a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 3-3 6-10 11z" fill="#fff"/><path d={STAR} transform="translate(651 806) scale(.55)" fill="#fff"/>
 <rect x="702" y="926" width="100" height="60" rx="8" fill="#ff8a80" stroke="#e0605a" strokeWidth="3"/><rect x="702" y="938" width="100" height="7" fill="#ffd166"/>
 <circle cx="728" cy="918" r="13" fill="#ffd166"/><path d="M772 926V896l10-12 10 12V926Z" fill="#8fc8ff" stroke="#5fa8e8" strokeWidth="2"/>
 <circle cx="822" cy="980" r="15" fill="#7fd8be"/><path d="M808 976q14 8 28 0" stroke="#fff" strokeWidth="4" fill="none"/>
</g>;

const GROUND=<g>
 {/* Kitchen (wide screens) */}
 <rect x="-844" y="1045" width="304" height="285" fill="#e6f8ee"/><rect x="-844" y="1170" width="304" height="160" fill="url(#pqh-tile-mint)"/>
 <rect x="-742" y="1078" width="84" height="72" rx="8" fill="#fff8ee" stroke="#c9e9d8" strokeWidth="3"/><rect x="-734" y="1086" width="68" height="56" rx="4" fill="url(#pqh-glass-day)"/><path d="M-700 1086V1142" stroke="#fff8ee" strokeWidth="5"/>
 <path d="M-748 1070h96v12q-8 10-16 0t-16 0t-16 0t-16 0t-16 0t-16 0z" fill="#ff9f80"/>
 <rect x="-656" y="1166" width="104" height="8" rx="3" fill="#c98448"/>
 <circle cx="-638" cy="1146" r="18" fill="#fff" stroke="#8fc8ff" strokeWidth="4"/><circle cx="-638" cy="1146" r="9" fill="none" stroke="#d6ebff" strokeWidth="3"/>
 <circle cx="-610" cy="1146" r="18" fill="#fff" stroke="#ff9fbf" strokeWidth="4"/><circle cx="-610" cy="1146" r="9" fill="none" stroke="#ffe0ea" strokeWidth="3"/>
 <rect x="-588" y="1148" width="16" height="18" rx="3" fill="#ff7a90"/><path d="M-572 1152a5 5 0 0 1 0 10" stroke="#ff7a90" strokeWidth="3" fill="none"/>
 <rect x="-566" y="1150" width="12" height="16" rx="3" fill="#7fd8be"/>
 <rect x="-834" y="1120" width="94" height="218" rx="16" fill="#a6dcff" stroke="#6bb8ea" strokeWidth="3"/><path d="M-834 1196H-740" stroke="#6bb8ea" strokeWidth="3"/>
 <rect x="-756" y="1140" width="6" height="40" rx="3" fill="#fff"/><rect x="-756" y="1212" width="6" height="56" rx="3" fill="#fff"/>
 <circle cx="-812" cy="1150" r="6" fill="#ff7a8a"/><circle cx="-790" cy="1164" r="6" fill="#ffd23f"/><rect x="-820" y="1222" width="30" height="36" rx="3" fill="#fffdf7" transform="rotate(-6 -805 1240)"/><path d="M-814 1246l7-10 6 8 6-6 5 8" stroke="#5fa8ff" strokeWidth="2" fill="none"/>
 <rect x="-736" y="1248" width="186" height="14" rx="5" fill="#fffdf8" stroke="#d8cbb8" strokeWidth="2"/>
 <rect x="-730" y="1262" width="174" height="76" rx="6" fill="#ffd8a8" stroke="#e5b37a" strokeWidth="3"/>
 <rect x="-722" y="1270" width="70" height="60" rx="5" fill="#ffe4c2" stroke="#e5b37a" strokeWidth="2"/><circle cx="-660" cy="1300" r="4" fill="#c98448"/>
 <path d="M-718 1248v-6h52v6" fill="#dfeaf2" stroke="#b9c6d2" strokeWidth="2"/><path d="M-692 1242V1220h12" stroke="#b9c6d2" strokeWidth="5" fill="none" strokeLinecap="round"/>
 <rect x="-640" y="1268" width="78" height="64" rx="6" fill="#f6f6f8" stroke="#cfd3da" strokeWidth="3"/><rect x="-632" y="1286" width="62" height="38" rx="5" fill="#ffb36b" opacity=".85"/><path d="M-632 1278h62" stroke="#b9c6d2" strokeWidth="4" strokeLinecap="round"/>
 <rect x="-624" y="1278" width="20" height="30" rx="3" fill="#ff9fbf"/><rect x="-624" y="1294" width="20" height="4" fill="#fff"/>
 <path d="M-624 1222H-576V1244C-576 1250-582 1250-582 1250H-618C-624 1250-624 1244-624 1244Z" fill="#ff7a8a" stroke="#d9585f" strokeWidth="3"/><rect x="-630" y="1218" width="60" height="8" rx="4" fill="#ff9aa6"/>
 <path className="pqh-steam" d="M-610 1208q-8-12 0-24t0-24M-590 1210q-8-12 0-24t0-24" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85"/>
 {/* Living room (always visible) */}
 <rect x="-520" y="1045" width="1040" height="285" fill="url(#pqh-wp-peach)"/>
 <rect x="-520" y="1252" width="1040" height="78" fill="#f8c9a0"/>
 {Array.from({length:12},(_,i)=><rect key={i} x={-508+i*86} y="1262" width="70" height="58" rx="6" fill="none" stroke="#efb58a" strokeWidth="3"/>)}
 <rect x="-520" y="1246" width="1040" height="8" fill="#fff3e4"/>
 {/* Entrance hall (wide screens) */}
 <rect x="540" y="1045" width="304" height="285" fill="url(#pqh-wp-lilac)"/>
 <rect x="-844" y="1045" width="1688" height="16" fill="#3a2410" opacity=".07"/>
 {[[-844,304],[-520,1040],[540,304]].map(([x,w])=><g key={x}><rect x={x} y="1322" width={w} height="8" fill="#fffaf2"/><rect x={x} y="1330" width={w} height="55" fill="url(#pqh-floor)"/><rect x={x} y="1330" width={w} height="5" fill="#9a5d2e" opacity=".3"/></g>)}
 {/* Under-stairs nook: door, sleeping cat, books */}
 <path d="M-140 1045H-108L170 1330H-140Z" fill="#7a3d10" opacity=".07"/>
 <path d="M-128 1330V1240a33 33 0 0 1 66 0V1330Z" fill="#8fd3c7" stroke="#5fb3a6" strokeWidth="3"/><path d="M-95 1214V1330" stroke="#5fb3a6" strokeWidth="2" opacity=".6"/><circle cx="-72" cy="1290" r="5" fill="#ffd166"/>
 <rect x="92" y="1318" width="44" height="12" rx="3" fill="#7fd8be"/><rect x="96" y="1306" width="38" height="12" rx="3" fill="#ff8fab"/>
 <ellipse cx="22" cy="1334" rx="60" ry="14" fill="#ff8fab"/><ellipse cx="22" cy="1332" rx="48" ry="9" fill="#ffd1dc"/>
 <g className="pqh-tail"><path d="M60 1326q24-2 20-22" stroke="#ffad5c" strokeWidth="9" fill="none" strokeLinecap="round"/></g>
 <g className="pqh-cat"><ellipse cx="28" cy="1318" rx="36" ry="18" fill="#ffad5c"/><path d="M14 1306q8-6 16 0M32 1304q8-6 16 0" stroke="#e8893a" strokeWidth="3" fill="none"/>
  <circle cx="-6" cy="1316" r="15" fill="#ffb86b"/><path d="M-19 1308l-2-14 10 8zM1 1303l5-13 5 12z" fill="#ffad5c"/>
  <path d="M-14 1316q3 3 6 0M-2 1316q3 3 6 0" stroke="#7a4a1a" strokeWidth="2" fill="none" strokeLinecap="round"/><circle cx="-5" cy="1322" r="1.8" fill="#ff7a8a"/></g>
 <ellipse cx="22" cy="1343" rx="60" ry="9" fill="#ff8fab"/>
 <path className="pqh-zzz" d="M-26 1284h10l-10 10h10M-40 1262h7l-7 7h7" stroke="#8fa3c8" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
 {/* Window, curtains, sofa, lamp, tea table */}
 <rect x="-444" y="1082" width="218" height="128" rx="10" fill="#fff8ee" stroke="#e6caa0" strokeWidth="3"/>
 <rect x="-432" y="1094" width="194" height="104" rx="6" fill="url(#pqh-glass-day)"/>
 <g clipPath="url(#pqh-clip-livewin)"><path d="M-432 1198V1170Q-380 1148-330 1166T-238 1160V1198Z" fill="#8fd16a"/><rect x="-283" y="1150" width="6" height="22" fill="#a86a3c"/><circle cx="-280" cy="1146" r="18" fill="#4fae46"/><ellipse cx="-390" cy="1118" rx="24" ry="8" fill="#fff"/></g>
 <path d="M-335 1094V1198M-432 1146H-238" stroke="#fff8ee" strokeWidth="7"/>
 <rect x="-456" y="1206" width="242" height="12" rx="6" fill="#f3dcc0"/>
 <g className="pqh-curtain"><path d="M-482 1068H-436C-442 1110-430 1150-446 1190C-450 1214-444 1228-450 1238H-472C-470 1210-488 1150-482 1068Z" fill="#ffcf5a"/><path d="M-462 1072C-464 1120-456 1170-462 1234" stroke="#ffe39a" strokeWidth="5" fill="none"/></g>
 <g className="pqh-curtain pqh-curtain-r"><path d="M-188 1068H-234C-228 1110-240 1150-224 1190C-220 1214-226 1228-220 1238H-198C-200 1210-182 1150-188 1068Z" fill="#ffcf5a"/><path d="M-208 1072C-206 1120-214 1170-208 1234" stroke="#ffe39a" strokeWidth="5" fill="none"/></g>
 <rect x="-480" y="1176" width="40" height="9" rx="4" fill="#ff8a65"/><rect x="-230" y="1176" width="40" height="9" rx="4" fill="#ff8a65"/>
 <rect x="-494" y="1060" width="318" height="8" rx="4" fill="#c98448"/><circle cx="-494" cy="1064" r="7" fill="#c98448"/><circle cx="-176" cy="1064" r="7" fill="#c98448"/>
 <path d="M-490 1064h310v14q-15.5 12-31 0t-31 0t-31 0t-31 0t-31 0t-31 0t-31 0t-31 0t-31 0t-31 0z" fill="#ffb347"/>
 <circle className="pqh-lampglow" cx="-160" cy="1150" r="210" fill="url(#pqh-glow)"/>
 <ellipse cx="-330" cy="1346" rx="168" ry="10" fill="#5a3410" opacity=".14"/>
 <rect x="-460" y="1212" width="262" height="72" rx="26" fill="url(#pqh-sofa)"/><rect x="-448" y="1218" width="238" height="10" rx="5" fill="#8fe3d8" opacity=".6"/>
 <rect x="-470" y="1268" width="282" height="44" rx="18" fill="#3dbbab"/><rect x="-462" y="1271" width="266" height="10" rx="5" fill="#7ad8cb" opacity=".7"/>
 <rect x="-486" y="1240" width="44" height="82" rx="20" fill="#2fa596"/><rect x="-480" y="1244" width="32" height="12" rx="6" fill="#5fcfc1"/>
 <rect x="-214" y="1240" width="44" height="82" rx="20" fill="#2fa596"/><rect x="-208" y="1244" width="32" height="12" rx="6" fill="#5fcfc1"/>
 <rect x="-474" y="1305" width="290" height="22" rx="10" fill="#2a9284"/>
 <rect x="-462" y="1325" width="10" height="16" rx="3" fill="#8a5a33"/><rect x="-206" y="1325" width="10" height="16" rx="3" fill="#8a5a33"/>
 <rect x="-440" y="1228" width="60" height="52" rx="16" fill="#ffd35c" transform="rotate(-8 -410 1254)"/><path d="M-424 1248h30M-424 1258h30" stroke="#ffe79a" strokeWidth="4" transform="rotate(-8 -410 1254)"/>
 <rect x="-266" y="1230" width="56" height="50" rx="16" fill="#ff94b5" transform="rotate(8 -238 1255)"/><path d="M-238 1262c-7-5-10-8-10-11a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 3-3 6-10 11z" fill="#fff" transform="rotate(8 -238 1255)"/>
 <path d="M-480 1240q24-6 40 14v40q-20-10-40-6z" fill="#ff9f68"/><path d="M-476 1252h30M-476 1268h30" stroke="#ffc49c" strokeWidth="3"/>
 <ellipse cx="-160" cy="1345" rx="26" ry="7" fill="#34446e"/><rect x="-163" y="1148" width="6" height="196" fill="#45567f"/>
 <path d="M-206 1150H-114L-132 1096H-188Z" fill="#ffe08a" stroke="#f0b54a" strokeWidth="3" strokeLinejoin="round"/><path d="M-178 1106H-142" stroke="#fff6cf" strokeWidth="4" strokeLinecap="round"/><ellipse cx="-160" cy="1151" rx="30" ry="5" fill="#fff6cf"/>
 <ellipse cx="-325" cy="1370" rx="172" ry="14" fill="#ff9f80"/><ellipse cx="-325" cy="1370" rx="142" ry="10" fill="#ffd166"/><ellipse cx="-325" cy="1370" rx="102" ry="6" fill="#ff9f80"/>
 <rect x="-410" y="1318" width="170" height="14" rx="7" fill="#c98448"/><rect x="-404" y="1320" width="158" height="4" rx="2" fill="#e2a96a"/>
 <rect x="-398" y="1330" width="10" height="42" rx="3" fill="#a8683a"/><rect x="-262" y="1330" width="10" height="42" rx="3" fill="#a8683a"/><rect x="-396" y="1352" width="142" height="6" rx="3" fill="#a8683a"/>
 <path className="pqh-steam" d="M-386 1266q-8-12 0-24t0-24M-372 1270q-8-12 0-24" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity=".85"/>
 <ellipse cx="-380" cy="1302" rx="24" ry="17" fill="#fff" stroke="#9fd6e3" strokeWidth="3"/><path d="M-398 1300q18 8 36 0" stroke="#7fc6e8" strokeWidth="3" fill="none"/><ellipse cx="-380" cy="1285" rx="11" ry="5" fill="#fff" stroke="#9fd6e3" strokeWidth="2"/><circle cx="-380" cy="1280" r="3.5" fill="#ff8fab"/>
 <path d="M-404 1298q-14-2-16-14" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round"/><path d="M-357 1296a9 9 0 0 1 0 14" stroke="#9fd6e3" strokeWidth="4" fill="none"/>
 <ellipse cx="-330" cy="1318" rx="14" ry="3.5" fill="#fff"/><rect x="-339" y="1302" width="18" height="15" rx="4" fill="#ff7a90"/><path d="M-321 1306a5 5 0 0 1 0 8" stroke="#ff7a90" strokeWidth="3" fill="none"/>
 <ellipse cx="-301" cy="1318" rx="14" ry="3.5" fill="#fff"/><rect x="-310" y="1302" width="18" height="15" rx="4" fill="#5fc3ff"/><path d="M-292 1306a5 5 0 0 1 0 8" stroke="#5fc3ff" strokeWidth="3" fill="none"/>
 <ellipse cx="-264" cy="1317" rx="22" ry="5" fill="#fff" stroke="#e2d3c0" strokeWidth="2"/><circle cx="-272" cy="1312" r="6" fill="#d99a50"/><circle cx="-258" cy="1311" r="6" fill="#e2a85c"/><circle cx="-272" cy="1311" r="1.5" fill="#7a4a1a"/><circle cx="-258" cy="1310" r="1.5" fill="#7a4a1a"/>
 {/* Stage 1 corner: family drawing, clock, coat hooks with the key, plant, round rug */}
 <rect x="272" y="1068" width="126" height="84" rx="6" fill="#ffd166" stroke="#e8a93a" strokeWidth="3"/><rect x="280" y="1076" width="110" height="68" fill="#fffdf7"/>
 <circle cx="372" cy="1092" r="8" fill="#ffd23f"/><path d="M372 1078v-3M384 1092h3M372 1106v3M360 1092h-3" stroke="#ffd23f" strokeWidth="2.5" strokeLinecap="round"/>
 <path d="M296 1132V1110H326V1132M292 1112L311 1096 330 1112" stroke="#ff7a8a" strokeWidth="3" fill="none" strokeLinejoin="round"/><rect x="306" y="1120" width="9" height="12" fill="#ffd166"/>
 <circle cx="346" cy="1114" r="6" fill="none" stroke="#5fa8ff" strokeWidth="2.5"/><path d="M346 1120v12M340 1124h12M346 1132l-5 6M346 1132l5 6" stroke="#5fa8ff" strokeWidth="2.5" strokeLinecap="round"/>
 <circle cx="364" cy="1120" r="5" fill="none" stroke="#ff8fab" strokeWidth="2.5"/><path d="M364 1125v9M359 1128h10M364 1134l-4 5M364 1134l4 5" stroke="#ff8fab" strokeWidth="2.5" strokeLinecap="round"/>
 <path d="M340 1092c-4-3-6-5-6-7a3 3 0 0 1 6-1.5 3 3 0 0 1 6 1.5c0 2-2 4-6 7z" fill="#ff7a8a"/><path d="M282 1140q10-6 20 0t20 0t20 0t20 0t20 0" stroke="#5bb84d" strokeWidth="2.5" fill="none"/>
 <circle cx="450" cy="1094" r="28" fill="#fff" stroke="#5fa8ff" strokeWidth="6"/><path d="M450 1094V1077M450 1094L463 1100" stroke="#1a2b4a" strokeWidth="3.5" strokeLinecap="round"/><circle cx="450" cy="1094" r="3.5" fill="#ff7a8a"/>
 {[[450,1072],[472,1094],[450,1116],[428,1094]].map(([x,y])=><circle key={x+'-'+y} cx={x} cy={y} r="2.5" fill="#8fa3c8"/>)}
 <rect x="430" y="1146" width="72" height="12" rx="4" fill="#c98448"/><circle cx="444" cy="1162" r="4" fill="#9a5d2e"/><circle cx="466" cy="1162" r="4" fill="#9a5d2e"/><circle cx="488" cy="1162" r="4" fill="#9a5d2e"/>
 <path d="M438 1162h14l5 64h-14z" fill="#7fd8be"/><path d="M440 1180h14M441 1198h14M442 1216h14" stroke="#fff" strokeWidth="3"/>
 <circle cx="488" cy="1174" r="6.5" fill="none" stroke="#f2c14e" strokeWidth="3"/><rect x="486" y="1180" width="4" height="20" fill="#f2c14e"/><rect x="490" y="1192" width="6" height="3" fill="#f2c14e"/><rect x="490" y="1197" width="4" height="3" fill="#f2c14e"/>
 <ellipse cx="480" cy="1220" rx="10" ry="30" fill="#4fae46" transform="rotate(-28 480 1220)"/><ellipse cx="496" cy="1236" rx="10" ry="28" fill="#5bb84d" transform="rotate(30 496 1236)"/><ellipse cx="468" cy="1252" rx="9" ry="24" fill="#5bb84d" transform="rotate(-50 468 1252)"/>
 <rect x="455" y="1286" width="52" height="10" rx="4" fill="#ef8c62"/><path d="M458 1294H504L498 1340H464Z" fill="#e07a52" stroke="#c45f3a" strokeWidth="2"/>
 <ellipse cx="345" cy="1372" rx="140" ry="10" fill="#5a3410" opacity=".15"/>
 <ellipse cx="345" cy="1362" rx="134" ry="19" fill="#ff8fab"/><ellipse cx="345" cy="1361" rx="104" ry="14" fill="#ffd166"/><ellipse cx="345" cy="1360" rx="72" ry="9" fill="#7fd8be"/><ellipse cx="345" cy="1359" rx="40" ry="5" fill="#fff2b8"/>
 {/* Entrance hall: front door, doormat, coat stand, umbrella, shoes (wide screens) */}
 <circle className="pqh-lampglow" cx="606" cy="1140" r="110" fill="url(#pqh-glow)"/>
 <path d="M628 1330V1166a72 66 0 0 1 144 0V1330" fill="none" stroke="#fff8ee" strokeWidth="12"/>
 <path d="M640 1330V1172a60 56 0 0 1 120 0V1330Z" fill="#ff8a65" stroke="#d9653f" strokeWidth="4"/>
 <rect x="654" y="1226" width="38" height="50" rx="6" fill="#ff9f80" stroke="#e5764f" strokeWidth="2"/><rect x="708" y="1226" width="38" height="50" rx="6" fill="#ff9f80" stroke="#e5764f" strokeWidth="2"/>
 <rect x="654" y="1284" width="38" height="38" rx="6" fill="#ff9f80" stroke="#e5764f" strokeWidth="2"/><rect x="708" y="1284" width="38" height="38" rx="6" fill="#ff9f80" stroke="#e5764f" strokeWidth="2"/>
 <circle cx="700" cy="1178" r="20" fill="url(#pqh-glass-day)" stroke="#fff8ee" strokeWidth="5"/><circle cx="744" cy="1262" r="6" fill="#ffd166"/>
 <rect x="628" y="1342" width="144" height="22" rx="8" fill="#d9a35f"/><path d="M646 1344v18M664 1344v18M682 1344v18M700 1344v18M718 1344v18M736 1344v18M754 1344v18" stroke="#c48a46" strokeWidth="3"/>
 <rect x="600" y="1128" width="12" height="20" rx="4" fill="#c98448"/><path d="M594 1132h24l-4-16h-16z" fill="#ffd166"/>
 <rect x="566" y="1150" width="8" height="186" fill="#9a5d2e"/><ellipse cx="570" cy="1338" rx="22" ry="6" fill="#9a5d2e"/><path d="M552 1166h36" stroke="#9a5d2e" strokeWidth="5" strokeLinecap="round"/>
 <ellipse cx="570" cy="1142" rx="22" ry="6" fill="#5fa8ff"/><path d="M556 1142a14 14 0 0 1 28 0z" fill="#5fa8ff"/>
 <path d="M574 1168h22l8 70h-30z" fill="#ffd166"/><path d="M584 1180v50" stroke="#f0b54a" strokeWidth="3"/>
 <rect x="806" y="1290" width="26" height="46" rx="6" fill="#7fd8be" stroke="#4fbf9f" strokeWidth="2"/><path d="M819 1290V1218a8 8 0 0 0-16 0" stroke="#8a5a33" strokeWidth="4" fill="none"/><path d="M812 1290L819 1236 826 1290Z" fill="#ff7a8a"/>
 <ellipse cx="788" cy="1360" rx="14" ry="6" fill="#ff7a90"/><ellipse cx="808" cy="1362" rx="14" ry="6" fill="#ff7a90"/>
</g>;

const STAIRS=<g>
 <path d={STAIR_EDGE+'V1012L170 1330Z'} fill="url(#pqh-wood)" stroke="#8f5a2b" strokeWidth="3" strokeLinejoin="round"/>
 <path d="M-108 1030L182 1312" stroke="#e8b47a" strokeWidth="5" opacity=".6"/>
 {STEPS.map((s,i)=><rect key={i} x={s.x} y={s.y-12} width="37" height="12" fill="#f2c48a"/>)}
 <path d={STAIR_EDGE} fill="none" stroke="#e2475d" strokeWidth="14" strokeLinejoin="round"/>
 <path d={STAIR_EDGE} fill="none" stroke="#ff8a9c" strokeWidth="3" strokeLinejoin="round" transform="translate(0 -4)"/>
 {STEPS.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r="5" fill="#ffd166" stroke="#e8a93a" strokeWidth="1.5"/>)}
 {STEPS.map((s,i)=>{const x=s.x+28;return <rect key={i} x={x-4} y={railY(x)} width="8" height={s.y-12-railY(x)} rx="3" fill="#fffaf0" stroke="#e2cfb2" strokeWidth="1.5"/>})}
 <path d="M234 1176L-130 798" stroke="#9a5c2c" strokeWidth="14" strokeLinecap="round"/><path d="M234 1170L-130 792" stroke="#c98a55" strokeWidth="4" strokeLinecap="round"/>
 <rect x="226" y="1168" width="22" height="166" rx="4" fill="#b06f3a" stroke="#8f5a2b" strokeWidth="2"/><circle cx="237" cy="1160" r="14" fill="#c98448" stroke="#8f5a2b" strokeWidth="2"/><circle cx="232" cy="1155" r="4" fill="#f0c38a"/>
 <rect x="-146" y="790" width="20" height="165" rx="4" fill="#b06f3a" stroke="#8f5a2b" strokeWidth="2"/><circle cx="-136" cy="784" r="12" fill="#c98448" stroke="#8f5a2b" strokeWidth="2"/>
</g>;

const LADDER=<g>
 <rect x="-462" y="580" width="56" height="400" fill="#3a2410" opacity=".06" transform="translate(8 6)"/>
 <rect x="-466" y="556" width="10" height="432" rx="4" fill="#c98448" stroke="#9a5d2e" strokeWidth="2"/><rect x="-408" y="556" width="10" height="432" rx="4" fill="#c98448" stroke="#9a5d2e" strokeWidth="2"/>
 {Array.from({length:9},(_,i)=><rect key={i} x="-458" y={612+i*42} width="54" height="8" rx="3" fill="#dfa868" stroke="#9a5d2e" strokeWidth="1.5"/>)}
</g>;

const SHELL=<g>
 <rect x="372" y="236" width="76" height="150" fill="url(#pqh-brick)" stroke="#b9583b" strokeWidth="3"/><rect x="362" y="222" width="96" height="22" rx="6" fill="#b9583b"/>
 <g className="pqh-smoke"><circle cx="410" cy="196" r="16" fill="#fff" opacity=".85"/><circle cx="426" cy="156" r="22" fill="#fff" opacity=".7"/><circle cx="412" cy="108" r="28" fill="#fff" opacity=".55"/></g>
 <rect x="-880" y="598" width="1760" height="836" fill="#fbe6c6"/>
</g>;

const FRAME=<g>
 {[[-880,-140],[130,880]].map(([a,b])=><g key={a}><rect x={a} y="1000" width={b-a} height="6" fill="#d49a5a"/><rect x={a} y="1042" width={b-a} height="3" fill="#e6c79c"/></g>)}
 {[[-880,-472],[-394,880]].map(([a,b])=><g key={a}><rect x={a} y="600" width={b-a} height="6" fill="#d49a5a"/><rect x={a} y="637" width={b-a} height="3" fill="#e6c79c"/></g>)}
 <rect x="-892" y="1385" width="1784" height="50" rx="8" fill="url(#pqh-stone)" stroke="#b89f80" strokeWidth="3"/>
 <rect x="-844" y="612" width="6" height="773" fill="#e8cfa6"/><rect x="838" y="612" width="6" height="773" fill="#e8cfa6"/>
 {/* Balcony beyond the playroom (wide screens) */}
 <rect x="844" y="772" width="36" height="226" fill="#cfe9ff" stroke="#e6caa0" strokeWidth="3"/><path d="M862 780V990" stroke="#fff" strokeWidth="3"/>
 <rect x="876" y="998" width="138" height="22" rx="6" fill="#fbe6c6" stroke="#e2c08f" strokeWidth="3"/>
 {[892,916,940,964,988].map(x=><rect key={x} x={x} y="932" width="7" height="66" rx="3" fill="#fffaf2" stroke="#e2cfb2" strokeWidth="1.5"/>)}
 <rect x="880" y="924" width="132" height="10" rx="5" fill="#c98448"/>
 <rect x="888" y="940" width="116" height="20" rx="5" fill="#e07a52"/>{[900,922,944,966,988].map((x,i)=><circle key={x} cx={x} cy="934" r="9" fill={FLOWER_COLORS[i]}/>)}
</g>;

const ROOF=<g>
 <polygon points="-1000,600 0,150 1000,600 1000,664 0,214 -1000,664" fill="url(#pqh-roof)"/>
 <polygon points="-1000,600 0,150 1000,600 1000,664 0,214 -1000,664" fill="url(#pqh-shingle)"/>
 <polyline points="-1004,602 0,148 1004,602" fill="none" stroke="#ffab80" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round"/>
 <polyline points="-1000,664 0,214 1000,664" fill="none" stroke="#fff1dc" strokeWidth="10" strokeLinejoin="round"/>
 <rect x="-1010" y="594" width="16" height="74" rx="6" fill="#c24f38"/><rect x="994" y="594" width="16" height="74" rx="6" fill="#c24f38"/>
 <path d="M-62 180L0 151 62 180" fill="none" stroke="#c24f38" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
 <path d="M0 150V114" stroke="#9a5d2e" strokeWidth="5" strokeLinecap="round"/><path d="M0 116c-12-8-17-13-17-19a8.5 8.5 0 0 1 17-4 8.5 8.5 0 0 1 17 4c0 6-5 11-17 19z" fill="#ff7a8a" stroke="#fff" strokeWidth="3"/>
 <Bird x={-300} y={285}/><Bird x={-246} y={261} flip/>
</g>;

const PATH=<g className="pqh-path">
 <g className="pqh-seg-a">{SEG_A.map(([x,y],i)=><Foot key={i} x={x} y={y} i={i}/>)}</g>
 <g className="pqh-seg-b">{SEG_B.map(([x,y],i)=><Foot key={i} x={x} y={y} i={i}/>)}</g>
</g>;

const SPARKLES=<g>{Object.entries(SPARKS).map(([floor,list])=><g key={floor} className={'pqh-spark pqh-spark-'+floor} opacity="0">{list.map(([x,y],i)=><g key={i} transform={`translate(${x} ${y}) scale(${.8+(i%3)*.25})`}><path className="pqh-twinkle" style={{animationDelay:i*.35+'s'}} d={STAR} fill="#fff7c2"/></g>)}</g>)}</g>;

const ART=<>{DEFS}{OUTSIDE}{SHELL}{ATTIC}{UPPER}{GROUND}{STAIRS}{FRAME}{LADDER}{ROOF}{PATH}{SPARKLES}</>;

export default function HomeArt({layout,className=''}){
 return <svg className={'pqh-art '+className} viewBox={`${layout.x} ${layout.y} ${layout.w} ${layout.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">{ART}</svg>;
}
