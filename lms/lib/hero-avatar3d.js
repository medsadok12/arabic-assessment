/* محرك بطل «استوديو الأبطال» ثلاثي الأبعاد — يُبنى البطل بالكود من أشكال بسيطة،
   فكل قطعة تُلبس أو تُلوَّن فوراً بلا ملفات نماذج ثقيلة، ويبقى خفيفاً على الجوال والآيباد.
   يُحمَّل كسولاً من components/HeroAvatar3D.jsx فلا يثقل three.js بقية الصفحات. */
import * as T from 'three';
import { SKIN, HAIR_C, HIJAB_C, CLOTH_C, PANTS_C, SHOE_C, normalizeLook } from './hero-catalog';

/* الألوان والإضاءة كما اعتُمدت في المعاينة: بلا تحويل ألوان، وشدة الضوء بوحدات three القديمة (× π).
   لا يستعمل three.js في المنصة غير هذا الملف، فالضبط العام هنا آمن. */
T.ColorManagement.enabled = false;
const LIGHT = Math.PI;

const PET_IMG = '/heroes/faheem-pet.webp';
const HY = 2.44; // مركز الرأس
/* خطوط المنصة تأتي من next/font بأسماء مولَّدة — نقرؤها من متغيرات CSS لنكتب بها على القمصان والدرع */
function cssFont(name, fallback) {
  try { const v = getComputedStyle(document.body).getPropertyValue(name).trim(); if (v) return `${v}, ${fallback}`; } catch { /* خارج المتصفح */ }
  return fallback;
}
const ease = (p) => 1 - Math.pow(1 - p, 3);

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

/* ── أدوات الرسم ─────────────────────────────────────────────────────────── */
const M = (c, o = {}) => new T.MeshStandardMaterial({
  color: c, roughness: o.r ?? .58, metalness: o.m ?? 0, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1,
  transparent: o.op !== undefined, opacity: o.op ?? 1, side: o.ds ? T.DoubleSide : T.FrontSide, map: o.map || null,
});
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; }
const shade = (hex, f) => new T.Color(hex).multiplyScalar(f);

function canvasTex(draw, w = 256, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
}
function star2d(x, cx, cy, r1, r2, fill) {
  x.fillStyle = fill; x.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1; const a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
  x.closePath(); x.fill();
}
function starShape(r1, r2) {
  const s = new T.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1; const a = Math.PI / 2 + i * Math.PI / 5; const p = [r * Math.cos(a), r * Math.sin(a)]; i ? s.lineTo(...p) : s.moveTo(...p); }
  return s;
}
function makeTextures() {
  const tex = {};
  const story = cssFont('--font-naskh', '"Noto Naskh Arabic", "Amiri", "Geeza Pro", serif');
  const ui = cssFont('--font-cairo', 'Cairo, sans-serif');
  tex.tee = canvasTex((x) => {
    x.fillStyle = 'rgba(255,255,255,.96)'; x.beginPath(); x.arc(128, 128, 96, 0, 7); x.fill();
    x.fillStyle = '#1A2B4A'; x.font = `700 150px ${story}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ع', 128, 150);
  });
  tex.jersey = canvasTex((x) => { x.fillStyle = '#fff'; x.font = `900 170px ${ui}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('10', 128, 140); });
  tex.space = canvasTex((x) => {
    x.fillStyle = '#3B6FD9'; x.beginPath(); x.arc(128, 128, 92, 0, 7); x.fill();
    x.strokeStyle = '#E8B84B'; x.lineWidth = 12; x.beginPath(); x.ellipse(128, 128, 110, 40, -.4, 0, 7); x.stroke();
    star2d(x, 128, 128, 46, 20, '#fff');
  });
  tex.shield = canvasTex((x) => {
    x.fillStyle = '#E8B84B'; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
    x.fillStyle = '#2E4FB5'; x.beginPath(); x.arc(128, 128, 104, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.font = `700 170px ${story}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('أ', 128, 150);
  });
  tex.shemagh = canvasTex((x, w) => {
    x.fillStyle = '#FBF8F4'; x.fillRect(0, 0, w, w);
    x.fillStyle = '#C8313E';
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) x.fillRect(i * 32 + 8, j * 32 + 8, 16, 16);
  });
  tex.shemagh.wrapS = tex.shemagh.wrapT = T.RepeatWrapping; tex.shemagh.repeat.set(5, 3);
  return tex;
}

/* غطاء رأس بفتحة للوجه (حجاب أو شماغ) */
function hood(head, mat, gap, r) {
  head.add(mesh(new T.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, .78), mat));
  head.add(mesh(new T.SphereGeometry(r, 48, 30, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, .76, 1.62), mat));
  head.add(mesh(new T.CylinderGeometry(.42, .7, .5, 48, 1, true), mat, 0, -.68, 0));
}

/* ── بناء البطل من مظهره ─────────────────────────────────────────────────── */
function buildAvatar(L, TEX, petTex) {
  const g = new T.Group(); const parts = {};
  const skin = SKIN[L.skin];
  const skinM = M(skin, { r: .62 });
  const top = L.top;
  const topCol = top === 'thobe' ? '#F8F7F2' : top === 'space' ? '#F2F4F8' : CLOTH_C[L.topC];
  const topM = M(topCol, { r: .7 });
  const pantsM = M(top === 'space' ? '#E3E8F0' : PANTS_C[L.pantsC], { r: .7 });
  const shoeM = M(top === 'space' ? '#8E9AAD' : SHOE_C[L.shoeC], { r: .42 });
  const soleM = M('#FFFFFF', { r: .5 });

  /* الساقان والحذاء */
  if (top !== 'thobe') {
    for (const sx of [-1, 1]) {
      if (L.bottom === 'shorts' && top !== 'space') {
        g.add(mesh(new T.CylinderGeometry(.18, .18, .32, 24), pantsM, sx * .2, .8, 0));
        g.add(mesh(new T.CylinderGeometry(.13, .125, .48, 20), skinM, sx * .2, .42, 0));
      } else g.add(mesh(new T.CylinderGeometry(.17, .155, .78, 24), pantsM, sx * .2, .57, 0));
    }
    g.add(mesh(new T.CylinderGeometry(.43, .41, .16, 32), pantsM, 0, .94, 0));
  }
  for (const sx of [-1, 1]) {
    const s = mesh(new T.SphereGeometry(.2, 24, 16), shoeM, sx * .2, .2, .07); s.scale.set(1, .62, 1.45); g.add(s);
    const so = mesh(new T.CylinderGeometry(.2, .2, .05, 24), soleM, sx * .2, .1, .07); so.scale.set(1, 1, 1.45); g.add(so);
  }

  /* الجذع */
  const body = new T.Group(); parts.body = body; g.add(body);
  if (top === 'thobe') {
    body.add(mesh(new T.CylinderGeometry(.47, .62, 1.62, 40), topM, 0, 1.0, 0));
    const btn = M('#E8B84B', { r: .3, m: .5 });
    for (let i = 0; i < 3; i++) body.add(mesh(new T.SphereGeometry(.028, 10, 8), btn, 0, 1.66 - i * .12, .465));
  } else {
    body.add(mesh(new T.CylinderGeometry(.46, .43, .88, 40), topM, 0, 1.36, 0));
    const print = { tee: TEX.tee, jersey: TEX.jersey, space: TEX.space }[top];
    if (print) {
      const pm = M(0xffffff, { map: print, r: .7, op: 1 }); pm.alphaTest = .05;
      const pr = new T.Mesh(new T.CylinderGeometry(.452, .452, .44, 24, 1, true, -.52, 1.04), pm);
      pr.position.y = 1.4; body.add(pr);
    }
    if (top === 'hoodie') {
      const hd = mesh(new T.TorusGeometry(.3, .11, 14, 30), topM, 0, 1.86, -.22); hd.rotation.x = 1.25; body.add(hd);
      body.add(mesh(new T.BoxGeometry(.5, .2, .06), M(shade(topCol, .88), { r: .7 }), 0, 1.16, .43));
      const cord = M('#FFFFFF');
      body.add(mesh(new T.CylinderGeometry(.016, .016, .2, 8), cord, -.08, 1.7, .45));
      body.add(mesh(new T.CylinderGeometry(.016, .016, .2, 8), cord, .08, 1.7, .45));
    }
    if (top === 'jersey') { const tr = M('#FFFFFF'); for (const sx of [-1, 1]) body.add(mesh(new T.BoxGeometry(.04, .86, .02), tr, sx * .36, 1.36, .25)); }
  }
  const sh = mesh(new T.SphereGeometry(.46, 40, 20), topM, 0, 1.79, 0); sh.scale.y = .42; body.add(sh);
  body.add(mesh(new T.CylinderGeometry(.13, .145, .2, 20), skinM, 0, 1.9, 0));
  if (top === 'thobe') { const col = mesh(new T.TorusGeometry(.155, .035, 10, 24), topM, 0, 1.92, 0); col.rotation.x = Math.PI / 2; body.add(col); }

  /* الذراعان */
  const longSleeve = ['hoodie', 'thobe', 'space'].includes(top);
  const makeArm = (sx) => {
    const a = new T.Group(); a.position.set(sx * .57, 1.76, 0);
    const inner = new T.Group(); inner.rotation.z = sx * .13; a.add(inner);
    if (longSleeve) inner.add(mesh(new T.CylinderGeometry(.145, .125, .66, 20), topM, 0, -.33, 0));
    else {
      inner.add(mesh(new T.CylinderGeometry(.155, .145, .3, 20), topM, 0, -.13, 0));
      inner.add(mesh(new T.CylinderGeometry(.115, .105, .42, 20), skinM, 0, -.47, 0));
    }
    const hand = new T.Group(); hand.position.y = -.72; inner.add(hand);
    hand.add(mesh(new T.SphereGeometry(.135, 20, 14), top === 'space' ? M('#8E9AAD') : skinM));
    a.userData.hand = hand; return a;
  };
  parts.armR = makeArm(-1); parts.armL = makeArm(1); body.add(parts.armR, parts.armL);

  /* الرأس والوجه */
  const head = new T.Group(); head.position.y = HY; parts.head = head; g.add(head);
  const skull = mesh(new T.SphereGeometry(.62, 48, 36), skinM); skull.scale.set(1, .96, .98); head.add(skull);
  for (const sx of [-1, 1]) { const e = mesh(new T.SphereGeometry(.12, 16, 12), skinM, sx * .6, -.02, 0); e.scale.set(.55, 1, .9); head.add(e); }
  const eyes = new T.Group(); parts.eyes = eyes; head.add(eyes);
  const eyeM = M('#1A2433', { r: .18 }); const glint = M('#ffffff', { e: 0xffffff, ei: .6 });
  for (const sx of [-1, 1]) {
    const e = mesh(new T.SphereGeometry(.09, 20, 16), eyeM, sx * .21, .04, .55); e.scale.set(1, 1.15, .7); eyes.add(e);
    eyes.add(mesh(new T.SphereGeometry(.03, 10, 8), glint, sx * .21 + .03, .085, .615));
    const brow = mesh(new T.BoxGeometry(.15, .035, .04), M(shade(HAIR_C[L.hairC], .9)), sx * .21, .2, .56); brow.rotation.z = sx * -.12; head.add(brow);
  }
  head.add(mesh(new T.SphereGeometry(.045, 12, 10), M(shade(skin, .9), { r: .6 }), 0, -.06, .61));
  const mouth = mesh(new T.TorusGeometry(.085, .02, 10, 24, Math.PI), M('#8E2F3A'), 0, -.15, .585); mouth.rotation.z = Math.PI; head.add(mouth);
  const blush = M('#FF8FA8', { op: .45 });
  for (const sx of [-1, 1]) { const c = new T.Mesh(new T.CircleGeometry(.075, 20), blush); c.position.set(sx * .34, -.08, .505); c.rotation.y = sx * .58; head.add(c); }

  /* الشعر أو الحجاب — الشماغ يغطي الرأس كله فيُخفي ما تحته */
  const hairM = M(HAIR_C[L.hairC], { r: .75 });
  if (L.hair === 'hijab' && L.head !== 'shemagh') hood(head, M(HIJAB_C[L.hijabC], { r: .8, ds: true }), 1.75, .71);
  else if (L.hair !== 'hijab' && L.head !== 'shemagh') {
    const cap1 = mesh(new T.SphereGeometry(.655, 48, 24, 0, Math.PI * 2, 0, 1.28), hairM); cap1.rotation.x = -.2; head.add(cap1);
    const cap2 = mesh(new T.SphereGeometry(.645, 48, 24, 0, Math.PI * 2, 0, 1.25), hairM); cap2.rotation.x = -1.15; head.add(cap2);
    if (L.hair === 'curly') {
      for (let i = 0; i < 30; i++) {
        const th = .25 + (i % 6) * .2, ph = i * 2.399;
        const v = new T.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).multiplyScalar(.66);
        v.applyAxisAngle(new T.Vector3(1, 0, 0), -.35);
        if (v.z > .38 && v.y < .42) continue;
        head.add(mesh(new T.SphereGeometry(.15, 14, 10), hairM, v.x, v.y, v.z));
      }
    }
    if (L.hair === 'long') {
      const back = mesh(new T.SphereGeometry(.5, 32, 24), hairM, 0, -.36, -.3); back.scale.set(1.2, 1.4, .72); head.add(back);
      for (const sx of [-1, 1]) { const lock = mesh(new T.SphereGeometry(.18, 20, 14), hairM, sx * .56, -.3, -.02); lock.scale.set(.75, 1.9, .9); head.add(lock); }
    }
    if (L.hair === 'pony') {
      head.add(mesh(new T.SphereGeometry(.1, 14, 10), M('#E8578C'), 0, .16, -.66));
      const tail = mesh(new T.SphereGeometry(.21, 20, 16), hairM, 0, -.2, -.8); tail.scale.set(.85, 1.75, .85); head.add(tail);
    }
  }

  /* على الرأس */
  if (L.head === 'cap') {
    const capM = M('#E8B84B', { r: .55 }), brimM = M('#1A2B4A', { r: .55 });
    const c = mesh(new T.SphereGeometry(.67, 48, 20, 0, Math.PI * 2, 0, 1.42), capM); c.rotation.x = -.08; head.add(c);
    const b = mesh(new T.CylinderGeometry(.42, .42, .04, 40, 1, false, -Math.PI / 2, Math.PI), brimM, 0, .2, .46); b.scale.z = 1.35; b.rotation.x = .14; head.add(b);
    head.add(mesh(new T.SphereGeometry(.06, 12, 10), brimM, 0, .67, -.04));
  }
  if (L.head === 'headphones') {
    head.add(mesh(new T.TorusGeometry(.67, .05, 12, 48, Math.PI), M('#7C5CD9', { r: .4 })));
    for (const sx of [-1, 1]) { const cup = mesh(new T.CylinderGeometry(.17, .17, .14, 28), M('#E8578C', { r: .4 }), sx * .66, 0, 0); cup.rotation.z = Math.PI / 2; head.add(cup); }
  }
  if (L.head === 'shemagh') {
    hood(head, M(0xffffff, { map: TEX.shemagh, r: .85, ds: true }), 1.95, .72);
    for (const dy of [.36, .44]) { const agal = mesh(new T.TorusGeometry(.53, .05, 12, 48), M('#1B1B1F', { r: .5 }), 0, dy, -.03); agal.rotation.x = Math.PI / 2 - .12; head.add(agal); }
  }
  if (L.head === 'story') {
    const hm = M('#22304F', { r: .6 });
    head.add(mesh(new T.CylinderGeometry(.84, .84, .045, 48), hm, 0, .42, 0));
    const cone = mesh(new T.ConeGeometry(.52, 1.05, 40), hm, 0, .96, 0); cone.rotation.z = .1; head.add(cone);
    const band = mesh(new T.TorusGeometry(.5, .05, 10, 40), M('#E8B84B', { m: .4, r: .35 }), 0, .5, 0); band.rotation.x = Math.PI / 2; head.add(band);
    const st = M('#FFD866', { e: 0xffcc33, ei: .6 });
    for (const [x, y, z] of [[.2, .8, .3], [-.18, 1.05, .2], [.06, 1.3, .14], [-.3, .66, .28]]) head.add(mesh(new T.SphereGeometry(.045, 10, 8), st, x, y, z));
  }
  if (L.head === 'astro') {
    head.add(mesh(new T.SphereGeometry(.86, 48, 36), M('#CFE8FF', { op: .22, r: .05, m: .1 })));
    const col = mesh(new T.TorusGeometry(.46, .09, 14, 40), M('#E9EDF3', { r: .4 }), 0, -.66, 0); col.rotation.x = Math.PI / 2; head.add(col);
    head.add(mesh(new T.CylinderGeometry(.02, .02, .3, 8), M('#B9C4D6'), .35, .9, 0));
    head.add(mesh(new T.SphereGeometry(.06, 12, 10), M('#E8578C', { e: 0xe8578c, ei: .5 }), .35, 1.06, 0));
  }
  if (L.head === 'crown') {
    const gold = M('#E8B84B', { r: .28, m: .65, ds: true });
    head.add(mesh(new T.CylinderGeometry(.44, .47, .26, 40, 1, true), gold, 0, .56, 0));
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; head.add(mesh(new T.ConeGeometry(.075, .22, 12), gold, Math.sin(a) * .45, .79, Math.cos(a) * .45)); }
    ['#E8578C', '#2ABB7A', '#3B9BEF'].forEach((c, i) => head.add(mesh(new T.SphereGeometry(.05, 12, 10), M(c, { r: .15, m: .2 }), (i - 1) * .22, .55, .44 - Math.abs(i - 1) * .05)));
  }

  /* النظارة */
  if (L.eyes === 'round') {
    const fm = M('#1A1A22', { r: .3 });
    for (const sx of [-1, 1]) head.add(mesh(new T.TorusGeometry(.13, .022, 10, 32), fm, sx * .21, .05, .6));
    const br = mesh(new T.CylinderGeometry(.015, .015, .16, 8), fm, 0, .08, .62); br.rotation.z = Math.PI / 2; head.add(br);
  }
  if (L.eyes === 'star') {
    const sm = M('#FFC83D', { r: .3, e: 0xff9f1c, ei: .25 });
    const geo = new T.ExtrudeGeometry(starShape(.16, .075), { depth: .03, bevelEnabled: false });
    for (const sx of [-1, 1]) head.add(mesh(geo, sm, sx * .21, .05, .6));
    const br = mesh(new T.CylinderGeometry(.015, .015, .14, 8), sm, 0, .08, .63); br.rotation.z = Math.PI / 2; head.add(br);
  }

  /* على الظهر */
  if (L.back === 'bag') {
    const bm = M('#E8578C', { r: .6 }), bm2 = M('#C93F72', { r: .6 });
    body.add(mesh(new T.BoxGeometry(.64, .7, .3), bm, 0, 1.42, -.58));
    body.add(mesh(new T.BoxGeometry(.46, .28, .08), bm2, 0, 1.24, -.76));
    for (const sx of [-1, 1]) {
      body.add(mesh(new T.BoxGeometry(.08, .42, .03), bm2, sx * .23, 1.56, .45));
      body.add(mesh(new T.BoxGeometry(.08, .03, .5), bm2, sx * .23, 1.84, -.06));
    }
  }
  if (L.back === 'cape') {
    body.add(mesh(new T.CylinderGeometry(.5, .82, 1.5, 40, 1, true, Math.PI - 1.08, 2.16), M('#D93B4B', { r: .7, ds: true }), 0, 1.12, 0));
    const clasp = mesh(new T.TorusGeometry(.32, .04, 10, 32), M('#E8B84B', { m: .5, r: .3 }), 0, 1.86, -.02); clasp.rotation.x = Math.PI / 2; body.add(clasp);
  }
  if (L.back === 'wings') {
    const wm = M('#FFFFFF', { r: .45, e: 0xd8ccff, ei: .25 });
    parts.wings = [];
    for (const sx of [-1, 1]) {
      const w = new T.Group(); w.position.set(sx * .2, 1.6, -.45);
      const f1 = mesh(new T.SphereGeometry(.5, 24, 16), wm, sx * .42, .14, 0); f1.scale.set(1, .5, .12); f1.rotation.z = sx * .45; w.add(f1);
      const f2 = mesh(new T.SphereGeometry(.38, 24, 16), wm, sx * .36, -.24, .02); f2.scale.set(1, .45, .12); f2.rotation.z = sx * -.2; w.add(f2);
      w.userData.sx = sx; parts.wings.push(w); body.add(w);
    }
  }

  /* في اليد */
  const rh = parts.armR.userData.hand, lh = parts.armL.userData.hand;
  parts.holding = L.hand !== 'none';
  if (L.hand === 'book') {
    const bk = new T.Group(); bk.position.set(0, -.04, .18); bk.rotation.x = -.35;
    bk.add(mesh(new T.BoxGeometry(.4, .5, .1), M('#2E4FB5', { r: .6 })));
    bk.add(mesh(new T.BoxGeometry(.37, .46, .11), M('#FFFFFF'), .02, 0, 0));
    bk.add(mesh(new T.BoxGeometry(.12, .12, .02), M('#E8B84B', { m: .4 }), 0, .06, .062));
    rh.add(bk);
  }
  if (L.hand === 'mic') {
    const mc = new T.Group(); mc.position.set(0, .12, .12); mc.rotation.x = -.5;
    mc.add(mesh(new T.CylinderGeometry(.05, .04, .34, 16), M('#1F2430', { r: .3 })));
    mc.add(mesh(new T.SphereGeometry(.11, 20, 16), M('#B9C2D0', { r: .25, m: .6 }), 0, .22, 0));
    rh.add(mc);
  }
  if (L.hand === 'pen') {
    const pn = new T.Group(); pn.position.set(0, .22, .12); pn.rotation.x = -.35;
    pn.add(mesh(new T.CylinderGeometry(.045, .045, .7, 16), M('#7C5CD9', { r: .35 })));
    const tip = mesh(new T.ConeGeometry(.045, .14, 16), M('#E8B84B', { m: .5, r: .3 }), 0, -.42, 0); tip.rotation.x = Math.PI; pn.add(tip);
    const glow = mesh(new T.ExtrudeGeometry(starShape(.13, .06), { depth: .04, bevelEnabled: false }), M('#FFD866', { e: 0xffc83d, ei: .9 }), 0, .42, -.02);
    pn.add(glow); parts.glow = glow;
    rh.add(pn);
  }
  if (L.hand === 'lantern') {
    const ln = new T.Group(); ln.position.set(0, -.3, .16);
    const goldM = M('#C8962E', { m: .6, r: .35 });
    const glass = mesh(new T.CylinderGeometry(.15, .19, .32, 6), M('#FFB347', { e: 0xff8c1a, ei: .9, op: .92 }));
    ln.add(glass);
    ln.add(mesh(new T.ConeGeometry(.19, .18, 6), goldM, 0, .25, 0));
    ln.add(mesh(new T.CylinderGeometry(.2, .16, .05, 6), goldM, 0, -.18, 0));
    ln.add(mesh(new T.TorusGeometry(.08, .018, 8, 20), goldM, 0, .38, 0));
    parts.glow = glass;
    rh.add(ln);
  }
  if (L.hand === 'shield') {
    const side = M('#C8962E', { m: .5, r: .35 });
    const face = M(0xffffff, { map: TEX.shield, r: .5 });
    const sd = new T.Mesh(new T.CylinderGeometry(.42, .42, .08, 48), [side, face, side]);
    sd.rotation.x = Math.PI / 2; sd.position.set(0, 0, .24);
    lh.add(sd);
  }

  /* الرفيق */
  if (L.pet === 'faheem' && petTex) {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: petTex, transparent: true }));
    sp.scale.set(.86, 1.1, 1); sp.position.set(1.18, 2.15, .3); g.add(sp); parts.pet = sp;
  }

  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: g, parts };
}

function disposeTree(o) {
  o.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => m.dispose());
  });
}

/* ── المسرح ──────────────────────────────────────────────────────────────────
   createHeroStage(canvas, { look, interactive, onTap }) ← { setLook, jump, peek, snapshot, dispose }
   interactive: السحب يدير البطل. اللمس (بلا سحب) يجعله يقفز ويستدعي onTap في الحالتين. */
export function createHeroStage(canvas, { look, interactive = true, onTap } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = T.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(28, 1, .1, 60);
  camera.position.set(0, 2.1, 8.6);
  camera.lookAt(0, 1.8, 0);
  scene.add(new T.HemisphereLight(0xffffff, 0xd8dcf5, .85 * LIGHT));
  const sun = new T.DirectionalLight(0xffffff, .78 * LIGHT);
  sun.position.set(2.6, 6.5, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 4.5, bottom: -.5, near: 1, far: 16 });
  sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new T.DirectionalLight(0xe9e2ff, .32 * LIGHT); fill.position.set(-4, 3, -2); scene.add(fill);
  const rim = new T.DirectionalLight(0xffffff, .25 * LIGHT); rim.position.set(0, 4, -5); scene.add(rim);

  const podium = new T.Group();
  const pTop = new T.Mesh(new T.CylinderGeometry(1.3, 1.42, .2, 64), new T.MeshStandardMaterial({ color: 0xffffff, roughness: .5 }));
  pTop.position.y = -.1; pTop.receiveShadow = true; podium.add(pTop);
  const pRing = new T.Mesh(new T.TorusGeometry(1.36, .045, 12, 80), new T.MeshStandardMaterial({ color: 0xe8b84b, roughness: .35, metalness: .4 }));
  pRing.rotation.x = Math.PI / 2; pRing.position.y = -.02; podium.add(pRing);
  scene.add(podium);

  const root = new T.Group(); scene.add(root);
  const TEX = makeTextures();
  let petTex = null;
  let current = normalizeLook(look);
  let avatar = null, parts = {};

  function ensurePet(L) {
    if (L.pet !== 'faheem' || petTex) return;
    petTex = new T.TextureLoader().load(PET_IMG, () => { if (current.pet === 'faheem') rebuild(); });
  }
  function rebuild() {
    if (avatar) { root.remove(avatar); disposeTree(avatar); }
    ensurePet(current);
    const built = buildAvatar(current, TEX, petTex?.image ? petTex : null);
    avatar = built.group; parts = built.parts; root.add(avatar);
  }
  rebuild();

  /* الحركة */
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let yaw = .38, vel = 0, dragging = false, moved = 0, lastX = 0, celebrate = -1, peekAt = -1, lookOff = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < .9 ? 32 : 28;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    const t = now / 1000;
    if (!dragging) { yaw += vel; vel *= .93; }
    let spin = 0, lift = 0;
    if (celebrate >= 0) {
      const p = (now - celebrate) / 1000;
      if (p >= 1.1) celebrate = -1;
      else { const q = Math.min(p, 1); spin = Math.PI * 2 * ease(q); lift = Math.sin(Math.PI * q) * .6; }
    }
    lookOff = 0;
    if (peekAt >= 0) {
      const p = (now - peekAt) / 2600;
      if (p >= 1) peekAt = -1;
      else lookOff = Math.PI * (p < .3 ? ease(p / .3) : p < .7 ? 1 : 1 - ease((p - .7) / .3));
    }
    root.rotation.y = yaw + spin + lookOff + (reduce ? 0 : Math.sin(t * .55) * .12);
    root.position.y = lift;
    if (parts.body && !reduce) {
      parts.body.scale.y = 1 + .012 * Math.sin(t * 2.2);
      parts.head.rotation.z = .05 * Math.sin(t * 1.1);
      parts.head.rotation.x = .03 * Math.sin(t * 1.7);
      parts.armL.rotation.x = .1 * Math.sin(t * 1.6);
      parts.armR.rotation.x = (parts.holding ? -.55 : 0) + .08 * Math.sin(t * 1.6 + Math.PI);
      parts.eyes.scale.y = (t % 3.8) < .12 ? .12 : 1;
      if (parts.wings) parts.wings.forEach(w => { w.rotation.y = w.userData.sx * (.35 + .28 * Math.sin(t * 5)); });
      if (parts.pet) parts.pet.position.y = 2.15 + .1 * Math.sin(t * 2.1);
      if (parts.glow) parts.glow.material.emissiveIntensity = .7 + .3 * Math.sin(t * 4);
    } else if (parts.armR) parts.armR.rotation.x = parts.holding ? -.55 : 0;
    renderer.render(scene, camera);
  }

  /* لا نرسم إلا والبطل ظاهر والصفحة مفتوحة — توفيراً للبطارية */
  let visible = true, running = false;
  const sync = () => {
    const want = visible && !document.hidden;
    if (want !== running) { running = want; renderer.setAnimationLoop(want ? frame : null); }
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
  io.observe(canvas);
  const ro = new ResizeObserver(() => { resize(); if (!running) renderer.render(scene, camera); });
  ro.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  resize();
  sync();

  /* اللمس والسحب */
  const jump = () => { celebrate = performance.now(); };
  const onDown = (e) => {
    yaw += lookOff; peekAt = -1; lookOff = 0;
    dragging = true; moved = 0; lastX = e.clientX; vel = 0;
    if (interactive) canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging || !interactive) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    yaw += dx * .012; vel = dx * .012;
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) { jump(); onTap?.(); }
  };
  const onCancel = () => { dragging = false; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);

  return {
    setLook(next) {
      const L = normalizeLook(next);
      if (Object.keys(L).every(k => L[k] === current[k])) return;
      current = L; rebuild();
      if (!running) renderer.render(scene, camera);
    },
    jump,
    /* قطع الظهر لا تُرى من الأمام: يستدير البطل ليريها ثم يعود */
    peek() { peekAt = performance.now(); },
    /* صورة مصغّرة للوجه والكتفين (للأيقونة الصغيرة في اللوحة) — data URL أو null */
    snapshot(size = 160) {
      try {
        const cam = new T.PerspectiveCamera(30, 1, .1, 60);
        cam.position.set(0, 2.3, 4.4); cam.lookAt(0, 2.2, 0);
        const saved = { ry: root.rotation.y, py: root.position.y, pr: renderer.getPixelRatio(), size: renderer.getSize(new T.Vector2()) };
        podium.visible = false; if (parts.pet) parts.pet.visible = false;
        root.rotation.y = .25; root.position.y = 0;
        renderer.setPixelRatio(1); renderer.setSize(size, size, false);
        renderer.render(scene, cam);
        const out = document.createElement('canvas'); out.width = out.height = size;
        const x = out.getContext('2d');
        const grad = x.createRadialGradient(size / 2, size * .35, size * .05, size / 2, size / 2, size * .75);
        grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(.55, '#EEF0FF'); grad.addColorStop(1, '#DCD3FF');
        x.fillStyle = grad; x.fillRect(0, 0, size, size);
        x.drawImage(canvas, 0, 0, size, size);
        podium.visible = true; if (parts.pet) parts.pet.visible = true;
        root.rotation.y = saved.ry; root.position.y = saved.py;
        renderer.setPixelRatio(saved.pr); renderer.setSize(saved.size.x, saved.size.y, false);
        renderer.render(scene, camera);
        const webp = out.toDataURL('image/webp', .85);
        return webp.startsWith('data:image/webp') ? webp : out.toDataURL('image/png');
      } catch { return null; }
    },
    dispose() {
      renderer.setAnimationLoop(null);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      disposeTree(scene);
      Object.values(TEX).forEach(t => t.dispose());
      petTex?.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch { /* المتصفح حرّر السياق مسبقاً */ }
    },
  };
}
