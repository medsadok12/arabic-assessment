// Original vector scenes plus locally bundled Twemoji (CC BY 4.0) and Lucide (ISC).
// No remote images, fonts, embedded answers, or generic fallback pictures at runtime.
import fs from 'node:fs';import path from 'node:path';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),root=path.resolve('lms'),React=require(root+'/node_modules/react'),{renderToStaticMarkup}=require(root+'/node_modules/react-dom/server'),icons=require(root+'/node_modules/lucide-react');
const data=JSON.parse(fs.readFileSync(root+'/lib/picture-quest-curriculum-data.json','utf8')),artDir=process.env.TWEMOJI_SVG_DIR||'/tmp/twemoji-art/package';
const out=root+'/public/picture-quest/curriculum-v1';fs.mkdirSync(out,{recursive:true});
const navy='#233E55',blue='#84C8E0',gold='#E8B84B',cream='#FFF5DC',green='#76B66A';
const defs='<defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#7C5CD9"/></marker></defs>';
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280">${defs}${body}</svg>`;
const circle=(x,y,r,fill)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const rect=(x,y,w,h,fill,rx=8)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const line=(x1,y1,x2,y2,stroke=navy,width=5)=>`<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round"/>`;
const arrow=(x,y,ex,ey)=>`<path d="M${x} ${y}L${ex} ${ey}" fill="none" stroke="#7C5CD9" stroke-width="5" marker-end="url(#arrow)"/>`;
function ico(name,x=55,y=35,size=210,color=navy,fill=cream){if(!icons[name])throw Error('Unknown Lucide icon '+name);return renderToStaticMarkup(React.createElement(icons[name],{x,y,width:size,height:size,color,fill,strokeWidth:1.4}));}
function em(emoji,x=50,y=30,w=220,h=220){const code=[...emoji].filter(c=>c.codePointAt(0)!==0xfe0f).map(c=>c.codePointAt(0).toString(16)).join('-'),f0=artDir+'/'+code+'.svg',f=fs.existsSync(f0)?f0:artDir+'/'+[...emoji].map(c=>c.codePointAt(0).toString(16)).join('-')+'.svg';if(!fs.existsSync(f))throw Error('Missing emoji '+emoji+' '+code);return fs.readFileSync(f,'utf8').replace('<svg ',`<svg x="${x}" y="${y}" width="${w}" height="${h}" `);}
function asset(file){let f=root+'/public/'+file;return fs.readFileSync(f,'utf8').replace('<svg ', '<svg x="35" y="15" width="250" height="250" ');}
const original={stapler:'content-stapler',eraser:'bank-eraser',sharpener:'bank-sharpener',board:'bank-board',glue:'content-glue',pencilcase:'content-pencilcase',apricot:'content-apricot',pomegranate:'bank-pomegranate',dates:'content-dates',fig:'content-fig',melon:'content-melon',plum:'content-plum',papaya:'content-papaya',goose:'content-goose',ostrich:'content-ostrich'};
const iconMap={table:'Table2',desk:'PanelsTopLeft',shelf:'Library',library:'LibraryBig',displayboard:'Presentation','compass-tool':'DraftingCompass',stapler:'Stapler',wardrobe:'Cabinet',rug:'RectangleHorizontal',stairs:'ListStart',pillow:'RectangleHorizontal',fridge:'Refrigerator',oven:'Microwave',sink:'Bath',towel:'RectangleVertical',chimney:'House',latch:'LockKeyhole',mat:'RectangleHorizontal',skipping:'Cable',whistle:'Megaphone',tricycle:'Bike',toyrail:'Railroad',dollhouse:'House',dollpram:'Baby',fingerpuppet:'Hand',marble:'Circle',top:'Cone',sandshovel:'Shovel',sandmould:'Castle',swing:'Fence',rockinghorse:'RockingChair',puppetstage:'Theater',racetrack:'Route',belt:'RectangleHorizontal',hanger:'Shirt',button:'CircleDot',zip:'List',collar:'Shirt',pocket:'Pocket',rainboots:'Footprints',waterbottle:'BottleWine',ladle:'CookingPot',colander:'CookingPot',tray:'RectangleHorizontal',fruitbasket:'ShoppingBasket',juicer:'CupSoda',tongs:'Wrench',dehydrator:'Microwave',pram:'Baby',crib:'BedSingle',bib:'Shirt',pacifier:'Baby',nappy:'Baby',album:'Images',familyphoto:'ContactRound',den:'Mountain',burrow:'Mountain',barn:'Warehouse',cage:'Fence',birdhouse:'House',birdfeeder:'Birdhouse',fence:'Fence',bench:'Armchair',shovel:'Shovel',wateringcan:'SprayCan',hose:'Cable',wheelbarrow:'ShoppingCart',pruner:'Scissors',rake:'ForkKnifeCrossed',compost:'Leaf',greenhouse:'Warehouse',sail:'Sailboat',oar:'PencilLine',lighthouse:'TowerControl',flippers:'Footprints',fishingnet:'Grid2X2',submarine:'Ship',shipwreck:'Ship',wheel:'CircleDot',steering:'ShipWheel',carseat:'Armchair',seatbelt:'Ribbon',pedal:'Footprints',planewing:'Plane',crossing:'RectangleHorizontal',port:'Anchor',bakery:'Croissant',market:'Store',zoo:'Fence',grocer:'Store',clothesstore:'Store',toystore:'Store',pavement:'RectangleHorizontal',square:'Landmark',net:'Grid3X3',hoop:'Circle',pool:'Waves',track:'Route',fan:'Fan',aircon:'AirVent',raingauge:'TestTube',weathervane:'MoveUpRight',meteorite:'Gem',crater:'Circle',solarpanel:'Grid3X3',moonrover:'Car',shuttle:'Rocket',launchpad:'Rocket',observatory:'Telescope'};
const scenes={
 table:()=>rect(30,70,260,35,'#D2A16A',6)+rect(50,105,18,135,'#A5754D',2)+rect(252,105,18,135,'#A5754D',2),
 student:()=>em('🧒',30,15,160,180)+rect(85,170,210,20,'#D2A16A',4)+rect(105,190,15,60,navy,2)+rect(265,190,15,60,navy,2)+em('📓',190,105,90,80),
 colourbox:()=>rect(55,110,210,135,'#86B8CC',8)+['#D65F5A','#E8B84B','#7EB36C','#5489BB','#AD8FC8'].map((c,i)=>rect(75+i*35,50,18,135,c,4)+`<path d="M${75+i*35} 50L${84+i*35} 20L${93+i*35} 50Z" fill="#DAC19B"/>`).join('')+rect(55,185,210,60,'#86B8CC',8),
 toyrail:()=>line(100,20,70,260,navy,9)+line(220,20,250,260,navy,9)+[60,100,140,180,220].map(y=>line(60,y,260,y,'#B18D65',12)).join(''),
 wardrobe:()=>asset('discover-objects/objects/wardrobe.svg'),
 classroom:()=>ico('Presentation',135,35,130)+`<g transform="translate(5 155) scale(.4)">${scenes.table()}</g>`+ico('Armchair',165,165,85),
 playground:()=>rect(30,60,185,150,cream,0)+ico('Grid3X3',35,65,180,navy,'none')+em('⚽',190,175,70,70),
 room:()=>rect(35,35,250,205,cream)+rect(55,55,75,75,blue)+ico('Armchair',170,110,100)+line(35,240,285,240),
 kitchen:()=>ico('CookingPot',30,75,100)+ico('Refrigerator',170,30,130)+rect(25,185,270,60,gold),
 bedroom:()=>ico('BedDouble',40,70,230)+ico('LampDesk',225,15,65),
 livingroom:()=>ico('Sofa',35,90,240)+ico('LampFloor',235,20,70),
 garden:()=>em('🌳',0,0,180,200)+em('🌼',190,145,75,75)+rect(20,230,280,15,green),
 balcony:()=>rect(40,20,240,180,cream)+ico('DoorOpen',100,40,110)+ico('Fence',40,165,240),
 curtain:()=>rect(50,35,220,200,blue)+`<path d="M45 30H140L95 230H45ZM180 30H275V230H225Z" fill="#A185CE"/>`+line(30,30,290,30),
 wall:()=>brickWall()+arrow(300,30,225,100),
 ceiling:()=>rect(25,20,270,210,cream)+`<path d="M25 20H295L245 70H75Z" fill="#D8C9A8"/>`+arrow(160,135,160,45),
 floor:()=>rect(25,20,270,210,cream)+`<path d="M25 230H295L245 170H75Z" fill="#D8C9A8"/>`+arrow(160,100,160,205),
 blanket:()=>ico('BedDouble',40,70,230)+rect(100,145,145,57,'#B79ADC',4)+arrow(295,85,185,170),
 toycar:()=>em('🚗',65,75,175,150)+em('✋',225,130,70,90),toytrain:()=>em('🚂',55,60,190,170)+em('✋',235,150,60,65),toyplane:()=>em('✈️',65,35,180,175)+em('✋',225,150,70,80),toyboat:()=>em('⛵',55,25,190,190)+em('✋',230,160,65,65),
 cookedfish:()=>em('🍽️',30,20,260,240)+em('🐟',90,100,140,110),
 yogurt:()=>rect(95,70,130,155,'#FAFAF5',20)+rect(90,65,140,30,'#85B6D2')+circle(160,145,35,'#D9F0F3'),
 jam:()=>rect(100,70,120,150,'#D34357',18)+rect(90,45,140,35,'#CDA46B')+em('🍓',130,120,60,65),
 cup:()=>ico('CupSoda',60,35,200),
 peel:()=>em('🍌',35,15,240,240)+arrow(295,240,200,185),
 seed:()=>`<ellipse cx="160" cy="150" rx="45" ry="65" fill="#8D603C" transform="rotate(30 160 150)"/>`+line(140,175,180,120,'#D6B384',4),
 stone:()=>em('🍑',30,40,200,190)+`<ellipse cx="215" cy="165" rx="28" ry="45" fill="#8A5434"/>`+arrow(300,70,220,135),
 slice:()=>`<path d="M60 180A120 120 0 0 1 240 60L60 180Z" fill="#F3B63F" stroke="#E2872F" stroke-width="14"/>`,
 halfapple:()=>`<path d="M160 65C70 10 25 180 105 225Q160 245 215 225C295 180 250 10 160 65Z" fill="#E85853"/><path d="M160 75C95 40 70 175 120 210Q160 220 200 210C250 175 225 40 160 75Z" fill="#FFF4C9"/>`+`<ellipse cx="150" cy="145" rx="6" ry="13" fill="#7E523B"/>`,
 grapebunch:()=>em('🍇'),fruitsalad:()=>em('🥣',45,100,230,150)+em('🍓',70,55,70,70)+em('🥝',150,65,70,70)+em('🍇',210,65,55,65),
 fruitbasket:()=>ico('ShoppingBasket',35,105,250)+em('🍎',50,45,90,100)+em('🍊',175,45,90,100),
 twins:()=>em('👶',20,60,125,140)+em('👶',175,60,125,140)+line(60,230,260,230,gold),
 neighbours:()=>ico('House',5,65,145)+ico('House',170,65,145)+em('🧒',55,180,65,65)+em('👧',220,180,65,65),
 boyfriend:()=>em('🧒',20,65,130,150)+em('🧒',170,65,130,150)+line(110,200,210,200,gold,10),
 girlfriend:()=>em('👧',20,65,130,150)+em('👧',170,65,130,150)+line(110,200,210,200,gold,10),
 album:()=>ico('BookOpen',35,30,250)+em('👨‍👩‍👧‍👦',100,90,130,110),familyphoto:()=>rect(25,30,270,220,'#D2AC6E')+rect(40,45,240,190,cream)+em('👨‍👩‍👧‍👦',65,55,190,170),
 grass:()=>`<path d="M30 240L20 130L70 185L100 70L135 185L180 90L205 190L270 100L260 240Z" fill="${green}"/>`,
 plantleaf:()=>em('🍃'),trunk:()=>em('🌳',45,0,230,250)+arrow(20,245,145,205),branch:()=>em('🌳',45,0,230,250)+arrow(300,190,185,125),
 root:()=>rect(20,115,280,135,'#B9845A')+em('🌱',85,5,150,135)+`<path d="M160 120V235M160 150L110 190M160 170L210 210M160 210L140 245" stroke="#6D4C36" stroke-width="8" fill="none"/>`+arrow(295,180,175,190),
 bud:()=>line(160,245,160,115,green,12)+`<path d="M160 150Q80 120 160 35Q240 120 160 150" fill="#D98DAD" stroke="${green}" stroke-width="6"/>`,soil:()=>rect(30,80,260,150,'#986C4B',25)+Array.from({length:15},(_,i)=>circle(50+(i*47)%215,100+(i*29)%100,5,'#BC9164')).join(''),
 path:()=>rect(15,15,290,245,'#BFD891')+`<path d="M115 260Q275 140 120 15H190Q315 150 205 260Z" fill="#F2DEA4"/>`,
 sea:()=>rect(15,30,290,200,'#85D1E0')+ico('Waves',20,70,270,'#168AA7','none'),sand:()=>`<path d="M10 210Q65 70 160 145Q250 80 310 205V260H10Z" fill="#EACB87"/>`+Array.from({length:25},(_,i)=>circle(30+(i*37)%265,185+(i*13)%50,2,'#BC9B5E')).join(''),
 seaturtle:()=>em('🐢')+ico('Waves',0,195,320,'#65BED5','none'),
 spring:()=>ico('TreeDeciduous',35,30,230,green,'#A7D88B')+em('🌼',30,100,60,60)+em('🌼',175,65,60,60)+em('🌼',230,185,60,60),
 summer:()=>em('☀️',180,0,120,120)+em('🏖️',10,70,240,200),autumn:()=>ico('TreeDeciduous',45,20,230,'#B87040','#E9AB53')+em('🍂',180,165,110,100),winter:()=>em('🌨️',30,0,180,130)+ico('TreePine',110,70,180,'#799C97','#EAF5F9')+rect(20,235,280,15,'#E7F3FB'),
 hail:()=>em('🌧️',40,0,230,180)+[70,120,170,220].map((x,i)=>circle(x,220-i%2*30,12,'#A1CEE1')).join(''),
 puddle:()=>`<ellipse cx="160" cy="180" rx="120" ry="45" fill="#8ACBDD"/><ellipse cx="160" cy="180" rx="75" ry="25" fill="none" stroke="white" stroke-width="4"/>`,
 frost:()=>ico('Leaf',45,35,220,'#7F9A83','#BADCB1')+[50,110,180,230].map((x,i)=>ico('Snowflake',x,70+i*20,45,'#E6F5FD','none')).join(''),
 dunes:()=>`<path d="M0 210Q90 30 175 160Q235 90 320 210V280H0Z" fill="#E5BA68"/><path d="M100 280Q220 80 320 210V280Z" fill="#C9984B"/>`,
};
function brickWall(){return rect(30,35,260,200,'#D7A479',4)+[80,130,180,230].map(y=>line(30,y,290,y,cream,5)).join('')+[80,160,240].map(x=>line(x,35,x,230,cream,5)).join('');}
// Parts use a stable full-body diagram and a precise arrow, never a disembodied generic icon.
const bodyTargets={head:[160,47],hair:[160,22],face:[160,62],neck:[160,99],leg:[137,209],belly:[160,155],back:[160,142],finger:[94,168],shoulder:[125,108],elbow:[101,142],wrist:[95,161],palm:[92,174],nail:[85,187],knee:[137,202],heel:[133,247],toes:[115,248],forehead:[160,39],eyebrow:[149,49],eyelash:[149,57],cheek:[143,70],chin:[160,84],thumb:[101,177],forearm:[98,152],shin:[136,228]};
function bodyPart(name){let [x,y]=bodyTargets[name];const detailed=['finger','palm','nail','thumb','wrist'].includes(name);if(detailed){const target={finger:[170,58],palm:[160,165],nail:[170,42],thumb:[235,145],wrist:[155,239]}[name];return em('✋',40,10,230,240)+circle(target[0],target[1],12,'none').replace('fill="none"','fill="none" stroke="#7C5CD9" stroke-width="3"')+arrow(290,65,target[0],target[1]);}
 let body=`<path d="M135 100Q160 90 185 100L205 165L188 175L177 140V180L187 245H164L160 190L155 245H130L142 180V140L130 175L111 165Z" fill="#EFC598" stroke="${navy}" stroke-width="3"/>`+rect(133,98,54,82,name==='back'?'#7CA8C1':'#8BC7D5',15)+circle(160,55,35,'#F4CFA6')+`<path d="M126 49Q120 7 160 14Q200 7 195 49L180 30L155 33L137 29Z" fill="#725341"/>`+circle(148,55,3,navy)+circle(172,55,3,navy)+`<path d="M150 72Q160 79 170 72" fill="none" stroke="${navy}" stroke-width="3"/>`;
 if(name==='back')body=body.replace(circle(148,55,3,navy),'').replace(circle(172,55,3,navy),'').replace('<path d="M150 72Q160 79 170 72" fill="none" stroke="'+navy+'" stroke-width="3"/>','').replace(circle(160,55,35,'#F4CFA6'),circle(160,55,35,'#725341'));
 const closeup=['forehead','eyebrow','eyelash','cheek','chin','face','hair'].includes(name);return (closeup?`<g transform="translate(-135 -10) scale(1.85)">${body}</g>`:body)+arrow(285,closeup?210:60,closeup?x*1.85-135:x,closeup?y*1.85-10:y);
}
const relatives=['father','mother','brother','sister','grandfather','grandmother','son','daughter','paternaluncle','paternalaunt','maternaluncle','maternalaunt','grandson','granddaughter','familytree'];
function family(name){
 const pts={grandfather:[66,25,'👴'],grandmother:[131,25,'👵'],father:[88,112,'👨'],mother:[185,112,'👩'],paternaluncle:[22,112,'👨'],paternalaunt:[22,112,'👩'],maternaluncle:[257,112,'👨'],maternalaunt:[257,112,'👩'],brother:[208,212,'🧒'],sister:[208,212,'👧'],son:[210,212,'🧒'],daughter:[210,212,'👧'],grandson:[210,212,'🧒'],granddaughter:[210,212,'👧']};
 let target=pts[name],ref=['son','daughter'].includes(name)?[88,112]:['grandson','granddaughter'].includes(name)?[66,25]:[115,212];
 let tree=line(96,65,96,100,'#B8C4C5',4)+line(40,95,115,95,'#B8C4C5',4)+line(185,70,185,100,'#B8C4C5',4)+line(115,150,185,150,'#B8C4C5',4)+line(150,150,150,195,'#B8C4C5',4)+line(115,195,238,195,'#B8C4C5',4)+line(115,195,115,212,'#B8C4C5',4)+line(235,195,235,212,'#B8C4C5',4);
 const nodes=[pts.grandfather,pts.grandmother,pts.father,pts.mother,[115,212,'🧒'],pts[name==='sister'?'sister':name==='daughter'?'daughter':name==='granddaughter'?'granddaughter':'brother']];
 if(name.includes('paternal')||name.includes('maternal'))nodes.push(target);
 for(const[x,y,e]of nodes)tree+=em(e,x-15,y-15,55,55);
 if(target)tree+=`<rect x="${target[0]-17}" y="${target[1]-17}" width="59" height="59" fill="none" stroke="${gold}" stroke-width="6" rx="9"/>`;
 if(name!=='familytree')tree+=`<rect x="${ref[0]-18}" y="${ref[1]-18}" width="61" height="61" fill="none" stroke="#568EC9" stroke-width="4" rx="9"/>`+`<text x="${ref[0]+12}" y="${ref[1]+58}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${navy}">أنا</text>`;
 return tree;
}
const veg={cabbage:['#B8D48A','round'],cauliflower:['#F9EDCD','flower'],courgette:['#4F974D','long'],peas:['#81BC65','peas'],spinach:['#589455','leaves'],radish:['#D45C6E','root'],beet:['#983D63','root'],turnip:['#E8DED1','root'],okra:['#67A263','long'],celery:['#95BC6C','stalk'],broadbeans:['#AEBA73','beans'],lentils:['#A0784D','lentils'],peapod:['#81BC65','pod'],leek:['#D5DFC0','stalk'],artichoke:['#7FA768','artichoke'],rocketleaf:['#589455','leaves']};
function vegetable(name){const[c,type]=veg[name];if(type==='round')return circle(160,155,86,c)+`<path d="M160 75Q70 120 160 235M170 75Q250 120 170 235M80 145Q170 100 240 150M82 175Q160 150 240 185" stroke="#739C62" stroke-width="5" fill="none"/>`;
 if(type==='flower')return em('🥦').replaceAll('#77B255','#E4DEBC').replaceAll('#5C913B','#C6C4A5');
 if(type==='root')return `<path d="M110 110Q75 195 160 225Q245 195 210 110Z" fill="${c}"/>`+`<path d="M160 225Q155 250 180 260" fill="none" stroke="${c}" stroke-width="8"/>`+em('🌿',95,0,130,130);
 if(type==='long')return `<path d="M95 220Q100 160 195 45Q230 50 220 80Q135 220 110 240Z" fill="${c}" stroke="#397246" stroke-width="4"/>`+[0,1,2].map(i=>line(115+i*20,207-i*25,190+i*6,70+i*10,'#A2C46C',3)).join('');
 if(type==='leaves')return Array.from({length:5},(_,i)=>`<ellipse cx="${90+i*33}" cy="${100+i%2*25}" rx="30" ry="65" fill="${c}" transform="rotate(${i*12-25} ${90+i*33} ${100+i%2*25})"/>`+line(90+i*33,110,160,245,'#76AF6A',5)).join('');
 if(type==='stalk')return [100,140,180,220].map((x,i)=>`<path d="M160 240L${x-10} 50L${x+15} 40L180 240Z" fill="${c}"/>`+em('🌿',x-35,0,65,65)).join('');
 if(['peas','pod','beans'].includes(type))return `<path d="M55 180Q145 35 265 95Q235 245 55 180Z" fill="#46965B"/>`+[0,1,2,3,4].map(i=>circle(90+i*32,165-i*12,19,c)).join('');
 if(type==='lentils')return em('🥣',40,60,240,180)+Array.from({length:25},(_,i)=>`<ellipse cx="${85+(i*29)%150}" cy="${125+(i*17)%45}" rx="9" ry="5" fill="${c}"/>`).join('');
 return [0,1,2].map(i=>`<ellipse cx="${115+i*45}" cy="${135+i%2*35}" rx="40" ry="65" fill="${c}" transform="rotate(${i*20-20} ${115+i*45} 135)"/>`).join('')+em('🌿',95,180,130,80);
}
const birdStyles={ostrich:['#4A4A4A','long'],goose:['#F5F4EC','long'],seagull:['#DDE7EC','wings'],hoopoe:['#D5A56C','crest'],swallow:['#38596C','fork'],canary:['#F3D351','small'],falcon:['#876D54','hook'],woodpecker:['#363D42','redcrest'],stork:['#F3EEE0','redlong']};
function bird(name){let[c,type]=birdStyles[name];const long=type.includes('long');return `<ellipse cx="155" cy="${long?165:150}" rx="65" ry="43" fill="${c}"/><path d="M160 160Q195 140 185 ${long?70:110}" fill="none" stroke="${c}" stroke-width="${long?23:35}"/>`+circle(190,long?62:100,25,c)+circle(200,long?57:95,4,navy)+`<path d="M212 ${long?65:100}L${type==='redlong'?285:250} ${long?75:110}L210 ${long?78:115}Z" fill="#D79A45"/>`+`<path d="M125 143Q175 100 180 160L130 175Z" fill="${type==='small'?'#E5B742':'#7C8B8A'}"/>`+line(125,200,120,240,type==='redlong'?'#D8654E':navy,5)+line(175,200,180,240,type==='redlong'?'#D8654E':navy,5)+`<path d="M95 150L40 125L55 175Z" fill="${c}"/>`+(type.includes('crest')?`<path d="M165 85L160 35L180 65L185 25L200 65L220 45L211 85Z" fill="${type==='redcrest'?'#D94F4B':c}"/>`:'');}
function birdPart(name){const target={wing:[155,148],beak:[234,100],birdtail:[65,150],talon:[145,233]}[name];return bird('canary')+arrow(285,240,...target);}
const garments={skirt:'skirt',jacket:'coat',pyjamas:'pyjamas',raincoat:'coat',uniform:'uniform',thobe:'long',abaya:'long',sleeve:'shirt',collar:'shirt',pocket:'shirt',vest:'vest',apron:'apron'};
function garment(name){const long=['thobe','abaya','raincoat'].includes(name),c=name==='abaya'?'#4A5061':name==='raincoat'?gold:'#8DBCCF';if(name==='skirt')return `<path d="M110 60H210L265 230H55Z" fill="#B6A0D7" stroke="${navy}" stroke-width="4"/>`+rect(106,48,108,25,gold,3);
 let drawing=`<path d="M110 45L145 28Q160 55 175 28L210 45L255 100L218 127L202 100L${long?215:200} 240H${long?105:120}L118 100L102 127L65 100Z" fill="${c}" stroke="${navy}" stroke-width="4"/>`;
 if(name==='vest')drawing=`<path d="M110 45L145 28L160 90L175 28L210 45L198 240H120Z" fill="${c}" stroke="${navy}" stroke-width="4"/>`;
 if(name==='apron')drawing=`<path d="M125 60Q160 40 195 60L205 130L240 235H80L115 130Z" fill="${gold}" stroke="${navy}" stroke-width="4"/>`+`<path d="M135 60V25H185V60" stroke="${navy}" stroke-width="8" fill="none"/>`;
 if(name==='pyjamas')drawing=ico('Shirt',20,30,150,'#6B81A7','#BAD7E4')+ico('RectangleVertical',190,60,80)+line(225,100,225,230,cream,8);
 if(['pocket','uniform'].includes(name))drawing+=`<path d="M170 105H195V135Q182 150 170 135Z" fill="${gold}" stroke="${navy}" stroke-width="3"/>`;
 if(['sleeve','collar','pocket'].includes(name)){let[x,y]={sleeve:[221,95],collar:[160,45],pocket:[183,122]}[name];drawing+=arrow(290,180,x,y);}
 return drawing;
}
const jobs={baker:['👨‍🍳','🍞'],carpenter:['👷','🪚'],driver:['🧑','🚗'],dentist:['👨‍⚕️','🦷'],nurse:['👩‍⚕️','🏥'],tailor:['🧑','🧵'],fisherman:['🧑','🎣'],electrician:['👷','🔌'],mechanic:['👨‍🔧','🚗'],gardener:['👨‍🌾','🌱'],photographer:['🧑','📷'],seller:['🧑','🏪'],cleaner:['🧑','🧹'],postman:['🧑','✉️'],captain:['👨‍✈️','🚢'],guard:['🧑','🛡️'],florist:['👩','💐'],vet:['👩‍⚕️','🐈'],librarian:['👩','📚'],potter:['🧑','🏺'],sculptor:['🧑','🗿'],beekeeper:['🧑','🐝']};
const colours={red:'#DD5555',blue:'#528ECD',yellow:'#EBCB47',green:'#62A36B',white:'#FFFFFF',black:'#353C44',orange:'#E59F45',purple:'#9266AF',pink:'#D98FB4',brown:'#9A6D48',gray:'#A3A6A8'};
function geometric(name){
 if(colours[name])return `<rect x="60" y="40" width="200" height="200" rx="18" fill="${colours[name]}" stroke="${navy}" stroke-width="3"/>`;
 const fill=name==='redcircle'?'#DD5555':blue,st=`fill="${fill}" stroke="${navy}" stroke-width="4" stroke-linejoin="round"`;
 if(['circle','redcircle','sphere'].includes(name))return circle(160,140,95,fill)+(name==='sphere'?`<ellipse cx="160" cy="140" rx="95" ry="30" fill="none" stroke="${navy}" stroke-width="3"/><ellipse cx="160" cy="140" rx="40" ry="95" fill="none" stroke="${navy}" stroke-width="3"/>`:'');
 if(name==='oval')return `<ellipse cx="160" cy="140" rx="115" ry="70" ${st}/>`;
 if(name==='square-shape')return `<rect x="65" y="45" width="190" height="190" ${st}/>`;
 if(name==='rectangle')return `<rect x="40" y="85" width="240" height="130" ${st}/>`;
 if(name==='triangle'||name==='righttriangle')return `<path d="${name==='triangle'?'M160 30L280 240H40Z':'M55 35V240H270Z'}" ${st}/>`;
 if(name==='diamond')return `<path d="M160 25L240 140L160 255L80 140Z" ${st}/>`;
 if(name==='semicircle')return `<path d="M45 200A115 115 0 0 1 275 200Z" ${st}/>`;
 if(name==='trapezoid')return `<path d="M100 65H220L285 235H35Z" ${st}/>`;
 const n={pentagon:5,hexagon:6,octagon:8}[name];if(n)return `<polygon points="${Array.from({length:n},(_,i)=>{let a=2*Math.PI*i/n-Math.PI/2;return[160+105*Math.cos(a),140+105*Math.sin(a)].join(',')}).join(' ')}" ${st}/>`;
 if(['cube','cuboid'].includes(name)){const x=name==='cube'?95:50,w=name==='cube'?130:210;return `<path d="M${x} 90L${x+45} 40H${x+w+45}L${x+w} 90Z" fill="#B3DAE8" stroke="${navy}" stroke-width="4"/><path d="M${x+w} 90L${x+w+45} 40V190L${x+w} 240Z" fill="#5696BA" stroke="${navy}" stroke-width="4"/>`+`<rect x="${x}" y="90" width="${w}" height="150" ${st}/>`;}
 if(name==='cylinder')return `<path d="M65 65V215C65 260 255 260 255 215V65Z" ${st}/><ellipse cx="160" cy="65" rx="95" ry="30" fill="#B3DAE8" stroke="${navy}" stroke-width="4"/>`;
 if(name==='cone')return `<path d="M160 25L65 220Q160 265 255 220Z" ${st}/><path d="M65 220Q160 180 255 220" fill="none" stroke="${navy}" stroke-width="3" stroke-dasharray="7 6"/>`;
 if(name==='pyramid')return `<path d="M160 25L40 210L200 255L280 200Z" ${st}/>`+line(160,25,200,255)+line(40,210,200,255);
 return null;
}
Object.assign(scenes,{
 stairs:()=>`<path d="M30 240V200H90V150H150V100H210V50H290V240Z" fill="#D8C4A5" stroke="${navy}" stroke-width="5"/>`,
 sink:()=>`<path d="M45 120H275L245 180H75Z" fill="#E4EBEC" stroke="${navy}" stroke-width="5"/>`+rect(135,180,50,70,'#D0DDDF',5)+`<path d="M160 120V55Q160 25 190 55" fill="none" stroke="${navy}" stroke-width="10"/>`,
 skipping:()=>`<path d="M80 75C-15 280 335 280 240 75" fill="none" stroke="#9C85C0" stroke-width="10"/>`+rect(60,30,35,90,gold,10)+rect(225,30,35,90,gold,10),
 top:()=>`<path d="M65 130L160 250L255 130Z" fill="#87BDCC" stroke="${navy}" stroke-width="4"/><ellipse cx="160" cy="130" rx="95" ry="30" fill="${gold}" stroke="${navy}" stroke-width="4"/>`+rect(150,40,20,95,navy,5)+`<path d="M30 180Q0 130 25 85M290 85Q320 130 290 180" fill="none" stroke="#B9A8CE" stroke-width="5"/>`,
 library:()=>ico('House',20,5,280)+rect(70,105,180,130,cream,0)+[120,170,220].map(y=>rect(75,y,170,8,'#B58A62',1)).join('')+ico('BookOpen',90,130,65)+ico('Library',165,130,65),
 racetrack:()=>scenes.track()+em('🚗',215,170,70,70),
 desk:()=>rect(35,75,250,25,'#D7AE79',4)+rect(45,100,85,120,'#C49968',4)+[110,150,190].map(y=>rect(55,y,65,25,cream,2)).join('')+line(265,100,265,240,navy,10),
 shelf:()=>[55,120,185,245].map(y=>rect(40,y,240,12,'#B88E5E',2)).join('')+line(40,55,40,245,navy,7)+line(280,55,280,245,navy,7)+ico('BookOpen',60,65,70),
 rug:()=>rect(40,45,240,190,'#B690CA',0)+rect(55,60,210,160,cream,0)+rect(70,75,180,130,'#B690CA',0)+[55,85,115,145,175,205,235,265].map(x=>line(x,35,x,45,gold,4)+line(x,235,x,247,gold,4)).join(''),
 mat:()=>rect(45,80,230,150,'#C9AE7A',3)+Array.from({length:10},(_,i)=>line(50,90+i*14,270,90+i*14,'#A08455',3)).join('')+Array.from({length:16},(_,i)=>line(55+i*14,85,55+i*14,225,'#B09362',2)).join(''),
 pillow:()=>`<path d="M45 70Q155 40 275 70Q260 145 275 220Q160 245 45 220Q60 145 45 70Z" fill="#EEDBBD" stroke="${navy}" stroke-width="4"/>`+`<path d="M60 85Q160 60 260 85L250 205Q160 225 60 205Z" fill="none" stroke="#C4B295" stroke-width="3"/>`,
 towel:()=>line(35,65,285,65,navy,10)+rect(85,65,150,175,'#98C9D6',3)+rect(85,195,150,15,gold,0),
 chimney:()=>ico('House',35,30,250)+rect(210,25,30,65,'#AE7555',1)+arrow(300,10,230,45),
 latch:()=>rect(40,100,190,85,'#B7BEC1',8)+rect(95,127,185,30,'#737F84',5)+rect(245,95,45,95,'#9FA8AB',4)+rect(150,102,22,60,gold,3),
 swing:()=>line(45,245,110,30,navy,12)+line(210,30,275,245,navy,12)+line(100,30,220,30,navy,12)+line(125,30,125,190,'#A79575',6)+line(195,30,195,190,'#A79575',6)+rect(100,190,120,22,gold,5),
 dollpram:()=>scenes.pram()+em('👶',145,100,65,65),
 fingerpuppet:()=>em('✋',110,100,120,150)+em('🐻',85,10,120,120),
 tricycle:()=>em('🚲',20,10,260,220)+circle(100,230,28,navy)+circle(100,230,17,cream),
 rockinghorse:()=>em('🐎',50,0,230,220)+`<path d="M35 220Q160 290 285 220" fill="none" stroke="#A27850" stroke-width="13"/>`,
 starfish:()=>`<path d="M160 25L185 105L275 95L210 155L235 245L160 195L85 245L110 155L45 95L135 105Z" fill="#DB9B6F" stroke="${navy}" stroke-width="4"/>`+[[-20,-15],[20,-15],[0,20]].map(([x,y])=>circle(160+x,140+y,6,'#A46B51')).join(''),
 seahorse:()=>`<path d="M190 60Q150 0 105 65L60 90L110 115L130 95Q185 120 145 165Q80 220 145 245Q205 260 200 215Q180 195 170 220" fill="#E2B25E" stroke="${navy}" stroke-width="5"/>`+circle(130,65,6,navy)+`<path d="M160 120L205 140L165 160" fill="#E9CA8B"/>`,
 whistle:()=>`<path d="M50 150H140V105H265V150H205A75 75 0 1 1 50 150Z" fill="${gold}" stroke="${navy}" stroke-width="5"/>`+rect(192,105,25,15,navy,0)+line(270,65,295,40,gold)+line(280,100,310,100,gold),
 hanger:()=>`<path d="M145 65C115 20 210 15 175 70L160 85L35 195Q25 210 50 210H270Q295 210 285 195L160 85" fill="none" stroke="${navy}" stroke-width="10"/>`,
 belt:()=>rect(30,110,260,55,'#996849',5)+rect(105,95,75,85,gold,5)+rect(120,110,45,55,cream,2)+[210,230,250].map(x=>circle(x,137,4,cream)).join(''),
 button:()=>circle(160,140,90,blue)+[[-25,-25],[25,-25],[-25,25],[25,25]].map(([x,y])=>circle(160+x,140+y,10,cream)).join(''),
 zip:()=>rect(120,20,80,240,'#D4BF90',3)+Array.from({length:15},(_,i)=>rect(140+i%2*18,25+i*15,22,9,navy,1)).join('')+rect(135,150,55,55,gold,8)+rect(150,180,25,70,navy,7),
 rainboots:()=>`<path d="M70 30H135V160Q200 155 200 215Q200 240 160 240H65Z" fill="${gold}" stroke="${navy}" stroke-width="5"/><path d="M165 30H230V160Q295 155 295 215Q295 240 255 240H160Z" fill="${gold}" stroke="${navy}" stroke-width="5"/>`,
 ladle:()=>`<path d="M190 30L125 180" stroke="${navy}" stroke-width="16" stroke-linecap="round"/><path d="M70 175H185A58 58 0 0 1 70 175Z" fill="${blue}" stroke="${navy}" stroke-width="5"/>`,
 colander:()=>`<path d="M55 100H265L240 220H80Z" fill="${blue}" stroke="${navy}" stroke-width="5"/>`+line(20,115,55,115)+line(265,115,300,115)+Array.from({length:18},(_,i)=>circle(95+(i%6)*26,130+Math.floor(i/6)*30,6,cream)).join(''),
 tray:()=>`<ellipse cx="160" cy="155" rx="125" ry="70" fill="${gold}" stroke="${navy}" stroke-width="5"/><ellipse cx="160" cy="150" rx="105" ry="48" fill="${cream}"/>`+line(5,150,35,150)+line(285,150,315,150),
 tongs:()=>`<path d="M155 40Q120 20 110 60L55 220M165 40Q200 20 210 60L265 220" fill="none" stroke="${navy}" stroke-width="12" stroke-linecap="round"/>`+rect(35,200,50,40,blue,5)+rect(235,200,50,40,blue,5),
 juicer:()=>ico('CupSoda',70,110,180)+em('🍊',110,15,100,90)+`<path d="M135 115L160 65L185 115Z" fill="${gold}"/>`,
 dehydrator:()=>rect(50,45,220,195,'#D9E2E4',20)+[75,120,165].map(y=>rect(70,y,180,30,'#6B7D83',5)+em('🍎',90,y,25,25)+em('🍌',150,y,25,25)).join(''),
 pram:()=>`<path d="M75 65A100 100 0 0 1 240 135H75Z" fill="#B8A2D8" stroke="${navy}" stroke-width="5"/><path d="M75 135H260Q235 220 125 205Z" fill="${blue}" stroke="${navy}" stroke-width="5"/>`+line(125,200,100,245)+line(235,200,255,245)+circle(100,245,17,navy)+circle(255,245,17,navy)+line(75,135,35,65),
 crib:()=>rect(45,90,230,130,'#D5AE78',5)+[65,105,145,185,225,265].map(x=>rect(x,70,9,170,'#A6764E',2)).join('')+rect(40,90,240,15,navy,2),
 bib:()=>`<path d="M95 80Q85 30 135 35Q160 95 185 35Q235 30 225 80L245 170Q240 250 160 250Q80 250 75 170Z" fill="${blue}" stroke="${navy}" stroke-width="5"/>`+em('⭐',125,145,70,70),
 pacifier:()=>`<ellipse cx="160" cy="125" rx="90" ry="45" fill="#A493C7"/>`+rect(140,50,40,75,'#D5C5B5',20)+`<ellipse cx="160" cy="185" rx="50" ry="65" fill="none" stroke="${gold}" stroke-width="15"/>`,
 nappy:()=>`<path d="M55 65H265L240 210Q160 265 80 210Z" fill="#F7F6E8" stroke="${navy}" stroke-width="5"/><path d="M55 90L105 145M265 90L215 145" stroke="${blue}" stroke-width="30"/>`,
 den:()=>`<path d="M20 235Q50 50 160 40Q270 50 300 235Z" fill="#9C876D"/><path d="M100 235Q90 125 160 120Q230 125 220 235Z" fill="#4F463C"/>`+em('🦁',110,140,100,100),
 burrow:()=>rect(10,130,300,120,'#B58A60',15)+`<ellipse cx="160" cy="150" rx="65" ry="60" fill="#5C4735"/>`+em('🐇',175,80,110,110)+em('🌿',20,70,90,90),
 barn:()=>ico('Warehouse',30,25,260,'#966D48','#E6C89D')+em('🐄',100,135,120,110),
 cage:()=>rect(65,80,190,160,cream)+`<path d="M65 80Q160-10 255 80" fill="none" stroke="${navy}" stroke-width="6"/>`+em('🐦',105,110,110,100)+[65,100,135,170,205,240,255].map(x=>line(x,80,x,240,navy,4)).join('')+line(60,240,260,240),
 birdhouse:()=>ico('House',60,25,200,'#9E7149','#E6C89D')+circle(160,130,30,'#4D453C')+line(130,210,190,210),
 birdfeeder:()=>ico('House',60,25,200,'#9E7149','#E6C89D')+rect(100,120,120,65,cream,0)+em('🐦',95,125,75,65)+line(70,215,250,215),
 wateringcan:()=>`<path d="M90 105H205V230H75Z" fill="${blue}" stroke="${navy}" stroke-width="5"/><path d="M205 135Q300 70 265 200H205" fill="none" stroke="${navy}" stroke-width="10"/><path d="M90 150L25 80L10 100L75 210" fill="${blue}" stroke="${navy}" stroke-width="5"/>`,
 wheelbarrow:()=>`<path d="M70 100H270L235 185H105Z" fill="${green}" stroke="${navy}" stroke-width="5"/>`+line(70,100,30,80)+line(110,185,90,240)+line(220,185,250,230)+circle(250,230,30,navy),
 rake:()=>line(160,250,160,75,'#AA7C4F',15)+line(65,75,255,75,navy,13)+[65,100,140,180,220,255].map(x=>line(x,75,x,40,navy,7)).join(''),
 bench:()=>rect(40,55,240,80,'#C49B68',3)+rect(30,165,260,25,'#C49B68',3)+[65,245].map(x=>line(x,120,x,240,navy,10)).join(''),
 hose:()=>`<path d="M50 50Q280-10 270 130Q270 240 100 230Q20 230 40 150Q60 70 150 90Q235 100 200 170Q180 215 100 180" fill="none" stroke="${green}" stroke-width="20" stroke-linecap="round"/>`+rect(80,157,45,30,gold,3),
 compost:()=>rect(60,90,200,150,'#926A49',10)+em('🍂',85,65,75,80)+em('🍌',155,45,75,90)+ico('Recycle',115,125,95,'#DEDBBA','none'),
 greenhouse:()=>ico('Warehouse',20,30,280,'#6A9B92','#D9EDF0')+em('🌱',65,145,75,80)+em('🌱',175,145,75,80),
 sail:()=>ico('Sailboat',45,20,230)+arrow(295,70,180,105),oar:()=>`<path d="M75 230L235 30" stroke="#A8784C" stroke-width="14" stroke-linecap="round"/><path d="M50 190L100 230L165 145L115 105Z" fill="${gold}" stroke="${navy}" stroke-width="4"/>`,
 lighthouse:()=>`<path d="M120 70H200L225 245H95Z" fill="#EEEAE0" stroke="${navy}" stroke-width="4"/>`+`<path d="M110 160H211L215 195H105Z" fill="#D56F5B"/>`+rect(115,30,90,45,gold,2)+`<path d="M105 30L160 0L215 30Z" fill="#D56F5B"/>`+line(65,50,10,30,gold,8)+line(255,50,310,30,gold,8),
 flippers:()=>`<path d="M55 30Q105 0 130 40L155 220Q100 260 30 225Z" fill="${blue}" stroke="${navy}" stroke-width="5"/><path d="M205 30Q255 0 280 40L300 220Q245 260 175 225Z" fill="${blue}" stroke="${navy}" stroke-width="5"/>`+rect(70,35,45,55,navy,16)+rect(220,35,45,55,navy,16),
 fishingnet:()=>line(235,20,115,190,'#A37C56',14)+`<path d="M25 180Q30 260 155 255Q215 225 180 170Z" fill="#D7E5DC" stroke="${navy}" stroke-width="4"/>`+ico('Grid3X3',50,170,130,navy,'none'),
 submarine:()=>rect(25,95,270,110,'#D9B151',55)+rect(130,55,75,50,gold,4)+line(150,55,150,25)+line(150,25,185,25)+[95,160,225].map(x=>circle(x,150,20,blue)).join('')+ico('Waves',15,210,290,'#5DB4CB','none'),
 shipwreck:()=>`<g transform="rotate(-25 160 150)">${em('🚢',40,20,240,200)}</g>`+ico('Waves',0,170,320,'#5DB4CB','none')+em('🐟',225,200,70,60),
 carseat:()=>ico('Armchair',50,35,220)+rect(150,70,20,160,navy,2),seatbelt:()=>ico('Armchair',50,35,220)+line(220,55,90,220,gold,17)+rect(125,175,30,35,navy,4),
 pedal:()=>em('🚲',20,20,260,240)+arrow(295,200,160,165),planewing:()=>em('✈️',30,10,260,240)+arrow(305,225,208,145),
 crossing:()=>rect(10,45,300,190,'#68757D',2)+[70,110,150,190,230].map(x=>rect(x,65,22,150,'#F7F3E8',0)).join(''),
 port:()=>em('🚢',20,90,190,150)+line(220,20,220,190,navy,9)+line(160,30,300,30,navy,9)+line(280,30,280,125,gold,5)+rect(260,125,40,30,gold,2)+ico('Waves',0,200,320,'#5DB4CB','none'),
 bakery:()=>ico('Store',35,20,250)+em('🥖',85,125,150,110),market:()=>ico('Store',5,60,150)+ico('Store',165,60,150)+em('🍎',40,150,60,60)+em('🐟',200,150,70,60),
 zoo:()=>em('🦒',15,15,140,175)+em('🐘',165,45,140,145)+ico('Fence',5,160,310),grocer:()=>ico('Store',35,20,250)+em('🥕',100,125,80,90)+em('🍎',170,125,70,80),clothesstore:()=>ico('Store',35,20,250)+em('👕',100,110,120,110),toystore:()=>ico('Store',35,20,250)+em('🧸',100,110,120,110),
 pavement:()=>rect(0,170,320,100,'#788288',0)+rect(0,130,320,40,'#D8D1BE',0)+[40,100,160,220,280].map(x=>line(x,130,x,170,'#AAA58E',2)).join('')+em('🚶',130,10,120,150),
 square:()=>rect(20,70,280,180,'#D7D1C2',0)+ico('Landmark',30,5,95)+ico('Building2',220,5,80)+em('⛲',115,90,100,100),
 jump:()=>em('🧒',90,20,140,150)+`<ellipse cx="160" cy="250" rx="55" ry="12" fill="#CBD3CB"/>`+arrow(65,210,65,100),
 kick:()=>em('⚽',205,170,70,70)+ico('PersonStanding',55,0,220)+arrow(185,190,240,190),throw:()=>ico('PersonStanding',35,30,200)+em('🏀',225,35,70,70)+arrow(150,95,215,70),
 net:()=>ico('Grid3X3',35,30,250)+line(35,50,35,250)+line(285,50,285,250),hoop:()=>rect(70,20,180,110,cream,0)+`<ellipse cx="160" cy="150" rx="65" ry="22" fill="none" stroke="#D76E4B" stroke-width="10"/><path d="M95 150L125 225H195L225 150M125 150L145 225M195 150L175 225" fill="none" stroke="${navy}" stroke-width="4"/>`,
 pool:()=>rect(20,30,280,220,'#8DC8DD',15)+ico('Waves',45,50,230,'#DCEFF1','none')+ico('Waves',45,135,230,'#DCEFF1','none')+ico('Fence',15,30,70),
 track:()=>`<rect x="25" y="30" width="270" height="220" rx="100" fill="#BD8772"/>`+[15,30,45].map(n=>`<rect x="${25+n}" y="${30+n}" width="${270-2*n}" height="${220-2*n}" rx="${100-n}" fill="none" stroke="${cream}" stroke-width="3"/>`).join('')+rect(105,100,110,80,green,30),
 balance:()=>ico('PersonStanding',50,0,220)+line(60,250,260,250,'#A07749',15)+circle(160,240,9,gold),
 raingauge:()=>rect(100,45,120,195,'#D5EAF0',6)+rect(106,130,108,105,blue,0)+Array.from({length:7},(_,i)=>line(110,65+i*23,140,65+i*23,navy,3)).join('')+em('🌧️',110,0,100,75),
 weathervane:()=>line(160,250,160,50,navy,10)+arrow(45,100,275,100)+em('🐓',105,0,100,100),
 planet:()=>em('🪐'),spacestation:()=>ico('Satellite',90,55,150)+ico('Grid3X3',10,80,110)+ico('Grid3X3',205,80,110),spacesuit:()=>em('🧑‍🚀')+arrow(295,230,160,170),spacehelmet:()=>em('🧑‍🚀')+arrow(300,60,170,70),
 meteorite:()=>ico('Gem',60,60,200,'#827565','#C2B19B')+rect(15,240,290,10,'#BA9876',0),crater:()=>`<ellipse cx="160" cy="175" rx="130" ry="75" fill="#B8ACA1"/><ellipse cx="160" cy="170" rx="85" ry="40" fill="#817A73"/><ellipse cx="155" cy="183" rx="70" ry="25" fill="#A49788"/>`,
 orbit:()=>em('🌍',105,70,110,110)+`<ellipse cx="160" cy="135" rx="145" ry="70" fill="none" stroke="${gold}" stroke-width="4" stroke-dasharray="8 6" transform="rotate(-25 160 135)"/>`+em('🛰️',225,10,65,65)+arrow(35,250,95,197),
 saturnrings:()=>em('🪐')+arrow(300,230,205,165),mars:()=>circle(160,140,95,'#C96D4D')+circle(130,115,25,'#AA573F')+circle(195,165,18,'#AA573F')+circle(140,185,12,'#AA573F'),jupiter:()=>circle(160,140,100,'#D8BC93')+`<path d="M75 90Q160 110 245 90M65 125Q160 145 255 125M65 165Q160 185 255 165M90 205Q160 215 230 205" fill="none" stroke="#B58D70" stroke-width="14"/>`+`<ellipse cx="210" cy="163" rx="28" ry="15" fill="#B77150"/>`,
 solarpanel:()=>ico('Grid3X3',30,25,260,'#45648A','#82A8D0')+line(160,235,160,270),moonrover:()=>ico('Car',30,100,250)+ico('SatelliteDish',100,15,140),shuttle:()=>em('🚀')+`<path d="M80 190L40 240L100 225M240 190L280 240L220 225" fill="#D9E5EA" stroke="${navy}" stroke-width="3"/>`,
 launchpad:()=>em('🚀',80,5,150,190)+rect(20,230,280,25,'#A4B7BC',0)+ico('TowerControl',0,50,105),
 solarsystem:()=>em('☀️',0,50,100,100)+Array.from({length:7},(_,i)=>circle(100+i*29,140+i%2*25,7+i*2,['#B9AB95','#D9B678','#74ADC8','#C4795A','#CDB48F','#D9CA97','#76B5C4'][i])).join(''),
 nebula:()=>rect(15,15,290,250,'#233451',20)+circle(125,120,70,'#6C5C9F')+circle(190,145,60,'#9D78AB')+em('✨',120,45,120,120),
 probe:()=>ico('Satellite',55,25,210)+ico('Radar',185,5,100),observatory:()=>`<path d="M65 140A95 95 0 0 1 255 140Z" fill="${blue}" stroke="${navy}" stroke-width="5"/>`+rect(65,140,190,100,cream,0)+ico('Telescope',135,65,140),
});

Object.assign(scenes,{
 cauliflower:()=>`<path d="M55 150Q30 245 160 255Q285 245 265 150Q220 175 160 160Q100 175 55 150" fill="#6B9C58"/>`+[[160,80,55],[110,100,40],[205,100,40],[75,135,30],[245,135,30],[160,135,65]].map(([x,y,r])=>circle(x,y,r,'#F1E9D3')).join(''),
 pumpkin:()=>`<ellipse cx="160" cy="150" rx="110" ry="85" fill="#EBA246"/><ellipse cx="160" cy="150" rx="75" ry="85" fill="none" stroke="#CE8434" stroke-width="4"/><ellipse cx="160" cy="150" rx="35" ry="85" fill="none" stroke="#CE8434" stroke-width="4"/>`+rect(145,35,30,45,'#6E9656',5),
 peas:()=>[[80,100],[135,85],[195,110],[240,155],[180,185],[110,180],[60,155]].map(([x,y])=>circle(x,y,27,'#83B964')+circle(x-8,y-8,7,'#A6D18B')).join(''),
 broadbeans:()=>`<path d="M40 200Q80 25 265 85Q280 235 40 200Z" fill="#6B9A56"/>`+[90,145,205].map((x,i)=>`<ellipse cx="${x}" cy="${165-i*23}" rx="27" ry="18" fill="#D2CF9A" transform="rotate(-25 ${x} ${165-i*23})"/>`).join(''),
 lentils:()=>`<path d="M45 115H275Q260 245 160 245Q60 245 45 115Z" fill="#8AB6C8"/><ellipse cx="160" cy="115" rx="115" ry="40" fill="#D0BB94"/>`+Array.from({length:48},(_,i)=>`<ellipse cx="${65+(i*31)%190}" cy="${95+(i*13)%40}" rx="8" ry="4" fill="${i%2?'#B77B54':'#D39B6C'}"/>`).join(''),
 artichoke:()=>line(160,250,160,195,'#6B985A',16)+[0,1,2,3].map(i=>Array.from({length:4},(_,j)=>`<path d="M${85+j*30} ${100+i*30}Q${70+j*30} ${65+i*30} ${105+j*30} ${35+i*30}Q${140+j*30} ${80+i*30} ${115+j*30} ${110+i*30}Z" fill="${i%2?'#7FA261':'#9BB67A'}" stroke="#64864F" stroke-width="2"/>`).join('')).join(''),
 rocketleaf:()=>`<path d="M160 250V40M160 70L125 35L120 70L75 65L110 105L60 125L120 150L80 185L145 190M160 70L195 35L200 70L245 65L210 105L260 125L200 150L240 185L175 190" fill="#79AA62" stroke="#4C8B52" stroke-width="5" stroke-linejoin="round"/>`,
 okra:()=>`<path d="M65 235L190 40L225 50L90 245Z" fill="#70A354" stroke="#4F7F45" stroke-width="4"/>`+line(85,228,207,48,'#A4C77A',4)+`<path d="M220 180L240 170L260 180L260 205L240 218L220 205Z" fill="#A4C77A" stroke="#4F7F45" stroke-width="3"/>`+circle(240,194,5,cream),
 courgette:()=>`<path d="M75 220Q50 200 90 140L175 50Q195 25 220 50Q245 75 210 105L125 215Q100 250 75 220Z" fill="#5B9354" stroke="#477948" stroke-width="4"/>`+line(210,42,235,20,'#719F5C',15),
 gazelle:()=>`<ellipse cx="145" cy="140" rx="70" ry="40" fill="#C8A174"/><path d="M190 140L220 70L245 80L225 155Z" fill="#C8A174"/>`+`<ellipse cx="238" cy="70" rx="35" ry="18" fill="#C8A174"/>`+circle(245,64,4,navy)+`<path d="M225 58Q210 25 220 5M240 55Q230 20 243 5" fill="none" stroke="#665244" stroke-width="7"/>`+[[95,155,80,245],[125,155,140,245],[180,155,175,245],[210,155,225,245]].map(a=>line(...a,'#9C7856',9)).join(''),
 vulture:()=>`<ellipse cx="150" cy="160" rx="75" ry="60" fill="#77756A"/><path d="M195 145Q235 80 205 60" fill="none" stroke="#D9C5AC" stroke-width="22"/>`+circle(205,55,24,'#C8908C')+circle(216,48,4,navy)+`<path d="M224 53L252 65L225 80Z" fill="#B6AA85"/>`+line(120,210,110,250,navy,7)+line(170,210,175,250,navy,7),
 pharmacy:()=>ico('Store',35,20,250)+em('💊',100,125,120,90),
 restaurant:()=>ico('House',25,10,270)+em('🍽️',100,100,130,130),
 firestation:()=>ico('Warehouse',25,10,270)+em('🚒',70,120,180,125),policestation:()=>ico('House',25,10,270)+em('🚓',70,120,180,125),
 tunnel:()=>`<path d="M20 260Q25 20 160 20Q295 20 300 260Z" fill="#B8B0A2"/><path d="M70 260V140A90 90 0 0 1 250 140V260Z" fill="#4F5B65"/><path d="M155 260V170" stroke="${cream}" stroke-width="7" stroke-dasharray="18 12"/>`,
 skyscraper:()=>rect(90,30,140,230,'#8DB5CB',3)+rect(135,10,50,25,navy,0)+Array.from({length:24},(_,i)=>rect(105+(i%4)*30,45+Math.floor(i/4)*32,17,20,'#D5EAF0',0)).join(''),
 clocktower:()=>rect(100,65,120,195,'#D5B584',0)+`<path d="M80 65L160 5L240 65Z" fill="#BD7B5B"/>`+circle(160,120,43,cream)+line(160,120,160,88)+line(160,120,185,135),
 waterbottle:()=>rect(132,25,56,30,blue,4)+`<path d="M130 55H190L210 95V240H110V95Z" fill="#C1E1E8" stroke="${navy}" stroke-width="4"/>`+rect(112,150,96,65,blue,0)+em('💧',140,165,40,40),
 necktie:()=>`<path d="M120 35H200L180 75L210 220L160 260L110 220L140 75Z" fill="#A88AC2" stroke="${navy}" stroke-width="4"/>`,
 helmet:()=>`<path d="M45 155Q45 45 160 45Q275 45 275 155L245 180H75Z" fill="${gold}" stroke="${navy}" stroke-width="4"/>`+[95,140,185,230].map(x=>rect(x,75,10,55,navy,5)).join('')+`<path d="M75 175Q110 265 160 235Q210 265 245 175" fill="none" stroke="${navy}" stroke-width="10"/>`,
 spacesuit:()=>`<circle cx="160" cy="65" r="50" fill="#EDF1EE" stroke="${navy}" stroke-width="4"/><rect x="128" y="40" width="64" height="45" rx="20" fill="#7FA9C0"/><path d="M130 110H190L220 190L200 205L185 160L190 255H165L160 195L155 255H130L135 160L120 205L100 190Z" fill="#EDF1EE" stroke="${navy}" stroke-width="4"/>`+rect(140,120,40,30,blue,2)+arrow(295,190,172,155),
 spacehelmet:()=>circle(160,135,105,'#E1E8E5')+rect(85,70,150,120,'#79A3BB',45)+rect(35,105,30,65,gold,8)+rect(255,105,30,65,gold,8)+line(100,220,220,220,navy,10),
 spacecraft:()=>`<path d="M100 65L220 65L260 205Q160 255 60 205Z" fill="#CDD6D8" stroke="${navy}" stroke-width="5"/>`+circle(160,135,35,'#78A9C2')+rect(115,220,90,20,'#7F9097',4)+em('✨',100,0,50,50),
 meteorite:()=>`<path d="M45 180L75 90L160 65L245 100L275 190L195 240L90 225Z" fill="#827C70" stroke="${navy}" stroke-width="4"/>`+[[100,130,15],[190,120,22],[200,195,12],[130,195,20]].map(([x,y,r])=>circle(x,y,r,'#5F5D56')).join('')+rect(15,250,290,8,'#BFA578',0),
 galaxy:()=>rect(10,10,300,250,'#233451',15)+`<path d="M160 140C90 100 135 55 200 75C295 110 245 220 140 225C30 225 0 110 80 55M160 140C225 175 180 220 115 200C20 165 75 65 170 55" fill="none" stroke="#9D90C9" stroke-width="20" stroke-linecap="round"/>`+circle(160,140,25,'#EFE3B5'),
 nebula:()=>rect(10,10,300,250,'#233451',15)+[[110,120,60],[170,100,50],[210,145,50],[150,175,55]].map(([x,y,r],i)=>circle(x,y,r,['#645B9A','#8271A8','#9B739F','#7766A1'][i])).join('')+[[60,40],[265,55],[245,225],[50,220],[160,125]].map(([x,y])=>circle(x,y,3,cream)).join(''),
});

function custom(name){
 if(bodyTargets[name])return bodyPart(name);if(relatives.includes(name))return family(name);if(veg[name])return scenes[name]?scenes[name]():vegetable(name);if(birdStyles[name])return bird(name);if(['wing','beak','birdtail','talon'].includes(name))return birdPart(name);if(garments[name])return garment(name);if(jobs[name])return em(jobs[name][0],5,20,170,220)+em(jobs[name][1],165,100,150,150);let g=geometric(name);if(g)return g;
 if(scenes[name])return scenes[name]();if(original[name]&&fs.existsSync(root+'/public/picture-quest/'+original[name]+'.svg'))return asset('picture-quest/'+original[name]+'.svg');if(iconMap[name])return ico(iconMap[name]);throw Error('No specific illustration for '+name);
}
const failures=[];for(const w of data.worlds)for(const r of w.words){try{r.artSpec.startsWith('@')?custom(r.artSpec.slice(1)):em(r.artSpec)}catch(e){failures.push([r.artSpec,e.message])}}if(failures.length){console.log(JSON.stringify([...new Map(failures.map(x=>[x[0],x])).values()]));process.exit(1)}
let bytes=0;
for(const world of data.worlds)for(const row of world.words){const body=row.artSpec.startsWith('@')?custom(row.artSpec.slice(1)):em(row.artSpec),file=out+'/'+world.id+'-'+String(row.order).padStart(2,'0')+'.svg',text=svg(body);fs.writeFileSync(file,text);bytes+=Buffer.byteLength(text);}
console.log(JSON.stringify({images:660,bytes}));
