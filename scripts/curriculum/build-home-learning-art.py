"""Original, self-contained home teaching vectors; no fonts or remote assets.
Run from repository root. Room scenes depict the whole room; arrows isolate surfaces.
"""
from pathlib import Path
OUT=Path('lms/public/picture-quest/home-learning-v2');OUT.mkdir(parents=True,exist_ok=True)
INK='#31465b'; WOOD='#b97745'; LIGHT='#eac291'; BLUE='#69b7d5'; TEAL='#419c96'; GOLD='#e9b44c'
def rect(x,y,w,h,c,r=7,stroke=INK,sw=3):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def path(d,c='none',stroke=INK,sw=3):return f'<path d="{d}" fill="{c}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>'
def line(x,y,a,b,c=INK,sw=3):return path(f'M{x} {y}L{a} {b}',stroke=c,sw=sw)
def circle(x,y,r,c,stroke=INK,sw=3):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" stroke="{stroke}" stroke-width="{sw}"/>'
def ellipse(x,y,rx,ry,c):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}"/>'
def group(s,x=0,y=0,k=1):return f'<g transform="translate({x} {y}) scale({k})">{s}</g>'
def arrow(x,y,a,b):return f'<path d="M{x} {y}L{a} {b}" fill="none" stroke="#c4494d" stroke-width="7" stroke-linecap="round" marker-end="url(#tip)"/>'
def window():return rect(0,0,100,100,'#d9f2fb',5)+path('M3 65L35 43L62 64L98 33L98 98L3 98Z','#a7c791',stroke='none')+circle(72,23,11,'#ffda75',stroke='none')+line(50,0,50,100,'#f9f4e7',6)+line(0,50,100,50,'#f9f4e7',6)+rect(-7,-7,114,114,'none',4,WOOD,7)
def door():return path('M0 200V32Q0 0 30 0H90Q120 0 120 32V200Z',TEAL)+rect(13,25,94,74,'#69b7af')+rect(13,113,94,72,'#69b7af')+circle(97,109,6,GOLD)+path('M-9 202V27Q-9 -12 31 -12H90Q129 -12 129 27V202','none',WOOD,9)+rect(-15,200,150,10,LIGHT,1)
def bed():return rect(0,0,220,112,WOOD,12)+rect(12,22,196,100,'#f7e7cb',9)+rect(20,29,80,44,'#fffdf2',10)+rect(118,29,80,44,'#fffdf2',10)+rect(-12,78,244,98,'#77bccb',13)+rect(-12,149,244,31,'#559baa',5)+rect(-4,176,16,24,WOOD,2)+rect(209,176,16,24,WOOD,2)+line(13,87,13,142,'#b3e2df',4)+line(199,87,199,142,'#b3e2df',4)
def chair():return rect(25,0,100,110,WOOD,12)+rect(39,15,72,78,LIGHT,5)+rect(5,106,140,27,'#79afa1')+path('M15 134L6 215M134 134L144 215M32 152H121',stroke=WOOD,sw=12)
def table():return path('M20 65L12 177M222 65L230 177M64 65L66 151M181 65L181 151',stroke=WOOD,sw=13)+ellipse(122,42,135,36,LIGHT)+path('M-13 42V53Q-5 91 122 91Q244 91 257 53V42',WOOD)+ellipse(122,40,135,36,'#e7b77c')
def sofa():return rect(14,0,222,94,TEAL,24)+rect(28,12,92,70,'#7ac1b8',15)+rect(131,12,92,70,'#7ac1b8',15)+rect(14,84,222,75,TEAL,15)+rect(31,83,187,35,'#72b8af',12)+rect(0,51,34,106,'#56aaa2',16)+rect(216,51,34,106,'#56aaa2',16)+rect(17,157,17,18,WOOD,2)+rect(216,157,17,18,WOOD,2)+path('M160 30L197 33L194 72L156 68Z',GOLD)
def wardrobe():return rect(0,0,165,215,WOOD,8)+rect(9,10,147,190,LIGHT,3)+line(82,10,82,198)+rect(20,23,50,157,'#dba96f',5)+rect(94,23,50,157,'#dba96f',5)+circle(70,99,4,GOLD)+circle(96,99,4,GOLD)+rect(10,215,15,13,WOOD,1)+rect(140,215,15,13,WOOD,1)
def fridge():return rect(0,0,130,225,'#d5e6eb',15)+rect(8,8,114,67,'#eff8fa',9)+rect(8,83,114,133,'#eff8fa',9)+line(22,26,22,56,INK,6)+line(22,103,22,148,INK,6)+rect(17,225,15,10,INK,1)+rect(98,225,15,10,INK,1)
def oven():return rect(0,0,190,190,'#d6e2e4',9)+rect(0,-18,190,25,'#627d87',5)+ellipse(49,-6,26,8,'#2d4653')+ellipse(139,-6,26,8,'#2d4653')+rect(11,56,168,120,'#334f62',7)+rect(24,84,142,77,'#64889a',5)+line(30,70,160,70,'#e7eff1',8)+''.join(circle(x,30,8,'#fff7e5') for x in [30,70,120,160])+line(50,110,132,110,'#9bc1cb',3)
def sink():return rect(0,110,210,100,'#a6c9c4',6)+line(106,112,106,210)+circle(91,159,4,GOLD)+circle(121,159,4,GOLD)+ellipse(105,104,116,26,'#eef4ec')+ellipse(105,103,82,14,'#85c5d3')+path('M104 80V44Q104 13 133 13Q160 13 160 43',stroke='#647f8b',sw=11)+line(75,66,75,82,'#647f8b',6)+line(69,66,81,66,'#647f8b',6)
def lamp():return path('M110 86L109 203',stroke=WOOD,sw=12)+ellipse(109,210,53,12,WOOD)+path('M63 0H156L181 88H38Z',GOLD)+ellipse(109,88,71,12,'#f8dc8e')+line(164,89,164,118,WOOD,3)+circle(164,121,4,GOLD)
def pillow():return path('M4 20Q-7 -4 23 3Q80 13 168 4Q202 -5 196 24Q186 64 198 101Q205 129 177 122Q90 114 22 123Q-6 131 3 104Q16 62 4 20Z','#f8deaa')+path('M20 25Q83 33 177 23M21 100Q82 92 177 103',stroke='#d4a46d',sw=3)
def blanket():return path('M0 0H213L233 171Q125 196 17 176Z','#78b8c4')+''.join(line(5+i*34,4,21+i*34,172,'#d4efea',9) for i in range(6))+''.join(line(5,25+i*36,218,25+i*36,'#d4efea',9) for i in range(5))+''.join(line(22+i*14,178,22+i*14,194,TEAL,3) for i in range(15))
def plant():return path('M24 62V12M24 41Q-7 45 0 20Q22 12 24 33M24 27Q53 25 48 3Q28 0 24 20', '#6daf72',stroke='#427454',sw=3)+path('M4 55H46L40 90H10Z','#cf8867')
def room():return rect(17,20,366,263,'#fae8c7',10)+path('M18 239H382V283H18Z','#d9b083',stroke='none')+path('M18 238L68 197H338L382 238',stroke='#c69b6e')+line(68,22,68,197,'#e8cba1')+line(338,22,338,197,'#e8cba1')
def house():return path('M40 117L191 12L350 117','#c66f53',sw=5)+rect(63,111,265,165,'#f7dbad',3)+rect(171,170,59,106,TEAL,8)+group(window(),88,144,.5)+group(window(),251,144,.5)+rect(276,27,31,65,WOOD,2)+circle(219,223,4,GOLD)+path('M28 278H361',stroke='#79a56d',sw=12)
def garden():return rect(15,25,370,260,'#d9eff0',16)+path('M17 153Q103 126 179 154Q262 124 382 147V283H17Z','#a2cb81',stroke='none')+path('M174 285Q185 222 236 177L250 181Q214 227 229 285Z','#edcc98',stroke='none')+''.join(rect(x,132,13,62,LIGHT,3,WOOD,2) for x in range(27,375,31))+line(23,150,378,150,WOOD,5)+line(23,179,378,179,WOOD,5)+path('M79 139V74',stroke=WOOD,sw=17)+circle(79,70,45,'#78ad66')+circle(57,90,32,'#78ad66')+circle(109,89,33,'#78ad66')+''.join(group(plant(),x,y,.43) for x,y in [(35,210),(102,225),(274,205),(330,225)])+circle(316,70,24,'#f3d17a',stroke='none')
def balcony():return rect(40,25,319,230,'#f5e1bd',8)+rect(135,47,113,198,'#c5e6ec',2,WOOD,6)+line(190,50,190,233,'#fcf4df',5)+path('M10 215H390V276H10Z','#dec39d')+group(plant(),48,137,.8)+group(plant(),295,137,.8)+''.join(line(x,202,x,265,'#667f86',5) for x in range(25,390,24))+line(10,200,389,200,'#667f86',8)+line(12,265,389,265,'#667f86',6)
def stairs():return path('M25 274V236H82V196H140V156H198V116H256V76H318V274Z',LIGHT)+path('M25 236H82V196H140V156H198V116H256V76H318',stroke=WOOD,sw=7)+line(37,176,303,9,WOOD,9)+''.join(line(x,y,x,y+63,WOOD,5) for x,y in [(48,169),(110,129),(172,90),(235,49),(301,9)])
def surface(n):
 s=room()+group(window(),231,67,.62)
 if n==21:s+=path('M69 23H337V196H69Z','#b3d4cf',sw=3)+group(window(),231,67,.62)+arrow(160,56,163,134)
 if n==22:s+=path('M18 21H382L338 65H68Z','#e8bd71')+arrow(195,112,193,46)
 if n==23:s+=path('M18 238L68 197H338L382 238V282H18Z','#b9d2a5')+''.join(line(40,245+i*13,360,245+i*13,'#8ea87c',2) for i in range(3))+arrow(191,168,190,248)
 return s
art={}
art[1]=group(door(),140,58,.95)
art[2]=group(window(),111,63,1.75)
art[3]=group(bed(),89,70,.95)
art[4]=group(chair(),132,45,1.05)
art[5]=group(table(),80,89,.94)
art[6]=group(house(),9,13,.95)
art[7]=room()+group(window(),243,68,.64)+path('M21 240L70 197M380 240L338 197',stroke='#c69b6e')
# Full, distinct room scenes: several spatial cues rather than a floating icon.
art[8]=room()+group(window(),82,47,.63)+group(fridge(),279,81,.7)+group(oven(),78,156,.57)+group(sink(),184,127,.49)+rect(77,116,186,25,'#d7a36f',2)+rect(77,59,67,48,LIGHT,4)+rect(164,59,72,48,LIGHT,4)+line(110,61,110,106)+line(200,61,200,106)
art[9]=room()+rect(84,55,81,91,'#b7dfeb',32)+ellipse(193,213,130,30,'#f6fcfc')+path('M63 210Q71 270 110 270H274Q308 265 324 210Z','#b2d9df')+path('M287 188V155Q287 131 310 131',stroke='#6c8894',sw=9)+rect(295,89,30,48,'#e4b3a0',2)+line(288,86,334,86,WOOD,4)
art[10]=group(sofa(),75,91,1)
art[11]=group(wardrobe(),125,42,1.04)
art[12]=group(lamp(),91,51,1)
art[13]=ellipse(200,135,83,108,WOOD)+ellipse(200,132,70,94,'#badce9')+path('M158 153L228 66M180 176L243 96',stroke='#eff9f9',sw=9)+path('M164 242H236M200 241V262M157 265H243',stroke=WOOD,sw=9)
art[14]=path('M59 70H343L365 250H37Z','#c9876a')+path('M80 91H322L340 230H61Z','#f0cd91')+path('M200 112L277 159L201 211L123 161Z',TEAL)+''.join(line(x,62,x,77,WOOD,3)+line(x-12,248,x-12,264,WOOD,3) for x in range(60,345,14))
art[15]=group(window(),124,71,1.5)+line(69,48,331,48,WOOD,10)+path('M74 55H154Q128 159 111 254L66 266Z','#679eae')+path('M249 55H325L334 266L288 254Q267 158 249 55Z','#679eae')+path('M93 60L78 249M119 60L101 235M275 60L299 235M302 60L320 249',stroke='#a3cad1',sw=5)
art[16]=room()+group(window(),265,56,.58)+group(bed(),89,115,.8)+group(wardrobe(),274,133,.35)+rect(44,182,40,61,WOOD,3)+group(lamp(),40,122,.22)+rect(91,47,68,44,'#fff9ec',3)+path('M101 80L125 57L150 80Z','#9ebd83')+ellipse(194,260,101,14,'#d6c2a4')
art[17]=room()+group(window(),238,52,.69)+group(sofa(),93,119,.73)+group(table(),126,231,.54)+group(lamp(),36,78,.7)+rect(144,52,52,41,'#fffbec',3)+circle(171,70,10,'#e7c37d',stroke='none')+group(plant(),326,177,.58)
art[18]=garden();art[19]=balcony();art[20]=group(stairs(),36,24,.93)
for n in [21,22,23]:art[n]=surface(n)
art[24]=circle(133,119,49,GOLD)+circle(133,119,24,'#fff8e8')+path('M165 149L276 260L302 234L276 209L255 230L235 211L250 197L189 137Z',GOLD,sw=5)
art[25]=group(pillow(),75,88,1.25)
art[26]=group(blanket(),85,59,1)
art[27]=group(fridge(),131,41,1.04)
art[28]=group(oven(),104,69,1)
art[29]=group(sink(),94,51,1)
art[30]=line(79,70,323,70,'#83959e',8)+rect(105,59,191,208,'#80b6c6',5)+rect(124,59,26,206,'#a3d1da',3)+line(112,235,288,235,'#e3f1ec',8)+line(112,250,288,250,'#e3f1ec',3)
art[31]=group(house(),11,14,.95)+arrow(339,27,293,62)
art[32]=rect(43,47,314,229,LIGHT,5)+line(276,48,276,274,WOOD,7)+rect(84,133,170,32,'#748c96',6)+rect(267,121,31,56,'#748c96',5)+rect(115,126,45,46,'#c0d1d4',5)+arrow(171,66,173,131)
art[33]=path('M65 83H335L357 238H43Z','#d5b37a')+''.join(line(71,96+i*13,331,96+i*13,'#9d804e',3) for i in range(10))+''.join(line(80+i*15,88,64+i*16,233,'#edcf97',3) for i in range(16))
for n,body in art.items():
 shadow='' if n in [7,8,9,16,17,18,19,21,22,23,31,32] else ellipse(200,285,123,12,'#e9e2d5')
 text=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320"><defs><marker id="tip" markerWidth="20" markerHeight="20" refX="16" refY="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M2 2L17 10L2 18" fill="none" stroke="#c4494d" stroke-width="5" stroke-linejoin="round"/></marker></defs>{shadow}{body}</svg>'
 (OUT/f'{n:02}.svg').write_text(text)
print(f'Built {len(art)} home illustrations')
