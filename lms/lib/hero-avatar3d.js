/* محرك بطل «استوديو الأبطال» ثلاثي الأبعاد — يُبنى البطل بالكود من أشكال بسيطة،
   فكل قطعة تُلبس أو تُلوَّن فوراً بلا ملفات نماذج ثقيلة، ويبقى خفيفاً على الجوال والآيباد.
   يُحمَّل كسولاً من components/HeroAvatar3D.jsx فلا يثقل three.js بقية الصفحات. */
import * as T from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HAIR_C, HIJAB_C, CLOTH_C, PANTS_C, SHOE_C, CHARACTERS, normalizeLook, charOf } from './hero-catalog';

/* مظهر «اللعبة اللامعة»: ألوان sRGB صحيحة، إضاءة استوديو ناعمة (RoomEnvironment) وانعكاسات خفيفة كالمجسمات */

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
  const t = new T.CanvasTexture(c); t.anisotropy = 4; t.colorSpace = T.SRGBColorSpace; return t;
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
  // غطاء الأسطوانة بعد تدويرها نحو الأمام يُظهر الحرف مائلاً ربع دورة — نعيده قائماً
  tex.shield.center.set(.5, .5); tex.shield.rotation = Math.PI / 2;
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

/* ── وجوه الشخصيات ───────────────────────────────────────────────────────────
   كل شخصية تبني رأسها (وذيلها إن كان لها) على الجسم نفسه، فتلبس كل القطع.
   تُرجع موضع العينين لتُركَّب النظارة عليهما. */
const lighten = (hex, f) => new T.Color(hex).lerp(new T.Color('#FFFFFF'), f);
const Y_AXIS = new T.Vector3(0, 1, 0);

/* عينان لامعتان بلمعتين، ومعهما عينا الفرح «^^» المخفيتان حتى يفرح البطل */
function eyesAt(head, parts, { x = .21, y = .04, z = .55, s = 1, col = '#1A2433' } = {}) {
  const eyes = new T.Group(); eyes.position.y = y; parts.eyes = eyes; head.add(eyes);
  const eyeM = M(col, { r: .12 }); const glint = M('#ffffff', { e: 0xffffff, ei: 1 });
  for (const sx of [-1, 1]) {
    const e = mesh(new T.SphereGeometry(.095 * s, 24, 18), eyeM, sx * x, 0, z); e.scale.set(1, 1.18, .7); eyes.add(e);
    eyes.add(mesh(new T.SphereGeometry(.034 * s, 12, 10), glint, sx * x + .03 * s, .05 * s, z + .066 * s));
    eyes.add(mesh(new T.SphereGeometry(.016 * s, 10, 8), glint, sx * x - .028 * s, -.042 * s, z + .068 * s));
  }
  const happy = new T.Group(); happy.position.y = y; happy.visible = false; parts.happyEyes = happy; head.add(happy);
  for (const sx of [-1, 1]) happy.add(mesh(new T.TorusGeometry(.07 * s, .02 * s, 8, 18, Math.PI), eyeM, sx * x, -.02, z + .02));
  return { x, y, z };
}
/* فم مبتسم + فم مفتوح فرحاً (مخفي) */
function openMouth(head, parts, y, z, w = .09) {
  const o = new T.Group(); o.position.set(0, y, z); o.visible = false; parts.mouthOpen = o; head.add(o);
  const m = mesh(new T.SphereGeometry(w, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M('#6E1C2A', { r: .5 })); m.scale.set(1, .9, .45); o.add(m);
  const tg = mesh(new T.SphereGeometry(w * .55, 14, 10), M('#F27C8E', { r: .6 }), 0, -w * .55, .01); tg.scale.set(1, .5, .5); o.add(tg);
}
function smile(head, y, z, r = .085, col = '#8E2F3A', parts) {
  const m = mesh(new T.TorusGeometry(r, .02, 10, 24, Math.PI), M(col), 0, y, z); m.rotation.z = Math.PI; head.add(m);
  if (parts) { parts.mouth = m; openMouth(head, parts, y + .01, z - .01, r * 1.05); }
}
function catMouth(head, y, z, parts) {
  const mm = M('#8E2F3A'); const g = new T.Group(); head.add(g);
  for (const sx of [-1, 1]) { const a = mesh(new T.TorusGeometry(.042, .012, 8, 16, Math.PI), mm, sx * .042, y, z); a.rotation.z = Math.PI; g.add(a); }
  if (parts) { parts.mouth = g; openMouth(head, parts, y - .02, z - .015, .065); }
}
function blushAt(head, x = .34, y = -.08, z = .505, ry = .58) {
  const bm = M('#FF8FA8', { op: .45 });
  for (const sx of [-1, 1]) { const c = new T.Mesh(new T.CircleGeometry(.075, 20), bm); c.position.set(sx * x, y, z); c.rotation.y = sx * ry; head.add(c); }
}
function muzzle(head, col, { x = .075, y = -.16, z = .5, r = .13 } = {}) {
  const mz = M(col, { r: .7 });
  for (const sx of [-1, 1]) { const m = mesh(new T.SphereGeometry(r, 20, 16), mz, sx * x, y, z); m.scale.set(1.1, .85, .8); head.add(m); }
}
function nose(head, col, y, z, s = 1) {
  const n = mesh(new T.SphereGeometry(.05 * s, 14, 10), M(col, { r: .4 }), 0, y, z); n.scale.set(1.35, .9, .8); head.add(n);
}
/* مخروط يبرز عمودياً على سطح الرأس أو الظهر (أشواك دينو) */
function spike(parent, mat, pos, r, h, dir) {
  const s = mesh(new T.ConeGeometry(r, h, 16), mat); s.position.copy(pos);
  s.quaternion.setFromUnitVectors(Y_AXIS, (dir ?? pos.clone()).normalize()); parent.add(s); return s;
}
/* ذيل: أنبوب منحنٍ أو كرات متتالية، محوره عند جذعه ليهتز في مكانه */
function addTail(body, parts, pts, mat, { r = .06, puffs = null, tip = null } = {}) {
  const base = new T.Vector3(...pts[0]);
  const g = new T.Group(); g.position.copy(base); body.add(g); parts.tail = g;
  const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p).sub(base)));
  if (puffs) {
    const n = puffs.length;
    puffs.forEach((rad, i) => g.add(mesh(new T.SphereGeometry(rad, 18, 14), mat, ...curve.getPoint(i / (n - 1)).toArray())));
  } else g.add(mesh(new T.TubeGeometry(curve, 28, r, 12), mat));
  if (tip) g.add(mesh(new T.SphereGeometry(tip.r, 18, 14), tip.mat, ...curve.getPoint(1).toArray()));
  return g;
}
function roundedRect(w, h, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const HEADS = {
  kid(head, { L, skin, skinM, parts }) {
    const skull = mesh(new T.SphereGeometry(.62, 48, 36), skinM); skull.scale.set(1, .96, .98); head.add(skull);
    for (const sx of [-1, 1]) { const e = mesh(new T.SphereGeometry(.12, 16, 12), skinM, sx * .6, -.02, 0); e.scale.set(.55, 1, .9); head.add(e); }
    const face = eyesAt(head, parts);
    for (const sx of [-1, 1]) { const brow = mesh(new T.BoxGeometry(.15, .035, .04), M(shade(HAIR_C[L.hairC], .9)), sx * .21, .2, .56); brow.rotation.z = sx * -.12; head.add(brow); }
    head.add(mesh(new T.SphereGeometry(.045, 12, 10), M(shade(skin, .9), { r: .6 }), 0, -.06, .61));
    smile(head, -.15, .585, .085, '#8E2F3A', parts);
    blushAt(head);
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
    return face;
  },

  cat(head, { skin, skinM, parts, body, covered }) {
    const sk = mesh(new T.SphereGeometry(.62, 48, 36), skinM); sk.scale.set(1.07, .93, .96); head.add(sk);
    parts.ears = [];
    if (!covered) for (const sx of [-1, 1]) {
      const ear = new T.Group(); ear.position.set(sx * .37, .42, -.02); ear.rotation.z = -sx * .4; head.add(ear);
      ear.add(mesh(new T.ConeGeometry(.21, .38, 24), skinM, 0, .15, 0));
      ear.add(mesh(new T.ConeGeometry(.12, .25, 20), M('#F7A9B8', { r: .7 }), 0, .11, .075));
      parts.ears.push(ear);
    }
    const pale = lighten(skin, .7);
    muzzle(head, pale);
    nose(head, '#F27FA0', -.085, .6);
    catMouth(head, -.215, .585, parts);
    const wm = M(shade(skin, .45));
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
      const w = mesh(new T.CylinderGeometry(.006, .006, .3, 6), wm, sx * .33, -.12 + (i - 1) * .05, .47); w.rotation.z = Math.PI / 2 + sx * (i - 1) * .18; head.add(w);
    }
    // خطوط القط على الجبهة (للألوان الداكنة)
    if (new T.Color(skin).getHSL({}).l < .78) {
      const st = M(shade(skin, .72), { r: .7 });
      for (const [x, rz] of [[-.13, .25], [0, 0], [.13, -.25]]) { const b = mesh(new T.BoxGeometry(.05, .17, .03), st, x, .4, .43); b.rotation.set(-.75, 0, rz); head.add(b); }
    }
    blushAt(head, .36, -.1, .49);
    addTail(body, parts, [[0, .98, -.4], [.05, .78, -.72], [.18, 1.0, -.98], [.12, 1.42, -1.0], [-.02, 1.62, -.9]], skinM, { r: .075, tip: { r: .09, mat: M(pale, { r: .7 }) } });
    return eyesAt(head, parts, { x: .22, y: .06, z: .53, s: 1.12 });
  },

  bunny(head, { skin, skinM, parts, body, covered }) {
    const sk = mesh(new T.SphereGeometry(.62, 48, 36), skinM); sk.scale.set(1, .95, .95); head.add(sk);
    for (const sx of [-1, 1]) { const ch = mesh(new T.SphereGeometry(.24, 20, 16), skinM, sx * .24, -.2, .3); ch.scale.set(1, .8, .8); head.add(ch); }
    parts.ears = [];
    if (!covered) for (const sx of [-1, 1]) {
      const ear = new T.Group(); ear.position.set(sx * .2, .5, -.06); ear.rotation.z = sx === 1 ? -.95 : .12; ear.rotation.x = -.1; head.add(ear);
      ear.add(mesh(new T.CapsuleGeometry(.12, .5, 8, 16), skinM, 0, .36, 0));
      const inner = mesh(new T.CapsuleGeometry(.065, .42, 8, 12), M('#F7A9B8', { r: .7 }), 0, .36, .07); inner.scale.z = .5; ear.add(inner);
      parts.ears.push(ear);
    }
    const pale = lighten(skin, .75);
    muzzle(head, pale, { x: .06, y: -.17, z: .52, r: .11 });
    nose(head, '#F27FA0', -.1, .61, .9);
    const tooth = M('#FFFFFF', { r: .3 });
    for (const sx of [-1, 1]) head.add(mesh(new T.BoxGeometry(.045, .075, .02), tooth, sx * .025, -.275, .565));
    blushAt(head, .36, -.1, .49);
    body.add(mesh(new T.SphereGeometry(.17, 20, 16), M(lighten(skin, .85), { r: .9 }), 0, 1.0, -.47));
    return eyesAt(head, parts, { x: .22, y: .05, z: .53, s: 1.12 });
  },

  panda(head, { skinM, parts, body, covered }) {
    const black = M('#24242C', { r: .7 });
    const sk = mesh(new T.SphereGeometry(.62, 48, 36), skinM); sk.scale.set(1.06, .95, .97); head.add(sk);
    parts.ears = [];
    if (!covered) for (const sx of [-1, 1]) { const e = mesh(new T.SphereGeometry(.18, 20, 16), black, sx * .43, .43, -.04); e.scale.z = .7; head.add(e); parts.ears.push(e); }
    for (const sx of [-1, 1]) { const p = mesh(new T.SphereGeometry(.15, 20, 16), black, sx * .22, .03, .49); p.scale.set(1, 1.3, .5); p.rotation.z = sx * .55; head.add(p); }
    muzzle(head, '#FFFFFF', { x: .07, y: -.17, z: .5, r: .14 });
    nose(head, '#24242C', -.09, .62, 1.2);
    catMouth(head, -.225, .585, parts);
    blushAt(head, .38, -.12, .47);
    body.add(mesh(new T.SphereGeometry(.12, 16, 12), skinM, 0, 1.0, -.46));
    // عيون بيضاء لامعة فوق البقعة السوداء
    return eyesAt(head, parts, { x: .22, y: .04, z: .555, s: .95, col: '#0E0E12' });
  },

  fox(head, { skin, skinM, parts, body, covered }) {
    const sk = mesh(new T.SphereGeometry(.62, 48, 36), skinM); sk.scale.set(1.05, .93, .96); head.add(sk);
    const white = M(skin === '#F4F6FA' ? '#FFFFFF' : '#FFF7EE', { r: .75 });
    // قناع أبيض أسفل الوجه + خطم صغير وأنف أسود — شكل الثعلب الكرتوني المحبوب
    const mask = mesh(new T.SphereGeometry(.44, 36, 24), white, 0, -.2, .22); mask.scale.set(1.22, .6, .82); head.add(mask);
    const sn = mesh(new T.SphereGeometry(.15, 20, 16), white, 0, -.15, .56); sn.scale.set(1.15, .8, .9); head.add(sn);
    nose(head, '#24242C', -.1, .69, 1.2);
    catMouth(head, -.215, .64, parts);
    parts.ears = [];
    if (!covered) for (const sx of [-1, 1]) {
      const ear = new T.Group(); ear.position.set(sx * .33, .45, -.04); ear.rotation.z = -sx * .28; head.add(ear);
      ear.add(mesh(new T.ConeGeometry(.21, .46, 24), skinM, 0, .2, 0));
      ear.add(mesh(new T.ConeGeometry(.12, .3, 20), white, 0, .14, .08));
      ear.add(mesh(new T.ConeGeometry(.08, .15, 16), M('#3A2A22', { r: .7 }), 0, .38, 0));
      parts.ears.push(ear);
    }
    blushAt(head, .37, -.08, .48);
    addTail(body, parts, [[0, .98, -.4], [.08, .74, -.78], [.24, .98, -1.12], [.26, 1.42, -1.1]], skinM,
      { puffs: [.1, .14, .18, .21, .22, .2, .17], tip: { r: .16, mat: white } });
    return eyesAt(head, parts, { x: .2, y: .08, z: .53, s: 1.1 });
  },

  lion(head, { skin, skinM, parts, body, covered }) {
    const maneM = M(shade(skin, .62).lerp(new T.Color('#B4521E'), .35), { r: .85 });
    if (!covered) {
      const ring = mesh(new T.TorusGeometry(.6, .2, 16, 48), maneM, 0, -.02, -.13); head.add(ring);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; head.add(mesh(new T.SphereGeometry(.18, 16, 12), maneM, Math.cos(a) * .76, Math.sin(a) * .74 - .02, -.18)); }
      for (const [x, y, z] of [[-.12, .6, .2], [.06, .64, .18], [.2, .57, .2]]) head.add(mesh(new T.SphereGeometry(.13, 14, 10), maneM, x, y, z));
    }
    const sk = mesh(new T.SphereGeometry(.6, 48, 36), skinM); sk.scale.set(1.02, .95, .96); head.add(sk);
    parts.ears = [];
    if (!covered) for (const sx of [-1, 1]) {
      const e = mesh(new T.SphereGeometry(.13, 16, 12), skinM, sx * .42, .46, .06); e.scale.z = .55; head.add(e); parts.ears.push(e);
      const inn = mesh(new T.SphereGeometry(.07, 12, 10), M('#F2A5A0', { r: .7 }), sx * .42, .45, .12); inn.scale.z = .4; head.add(inn);
    }
    muzzle(head, lighten(skin, .65), { y: -.17, z: .49 });
    nose(head, '#6B3E26', -.09, .59, 1.15);
    catMouth(head, -.225, .575, parts);
    blushAt(head, .35, -.08, .48);
    addTail(body, parts, [[0, .98, -.4], [0, .7, -.78], [.05, .82, -1.08], [.06, 1.05, -1.16]], skinM, { r: .045, tip: { r: .13, mat: maneM } });
    return eyesAt(head, parts, { x: .21, y: .07, z: .53, s: 1.08 });
  },

  dino(head, { skin, skinM, parts, body, covered }) {
    const sk = mesh(new T.SphereGeometry(.6, 48, 36), skinM); sk.scale.set(1, .92, 1); head.add(sk);
    const sn = mesh(new T.SphereGeometry(.42, 36, 28), skinM, 0, -.2, .3); sn.scale.set(1.05, .72, .88); head.add(sn);
    const dark = M(shade(skin, .55), { r: .6 });
    for (const sx of [-1, 1]) head.add(mesh(new T.SphereGeometry(.03, 10, 8), dark, sx * .1, -.12, .66));
    const mouth = mesh(new T.TorusGeometry(.15, .016, 10, 28, Math.PI), M(shade(skin, .4)), 0, -.25, .6); mouth.rotation.set(-.35, 0, Math.PI); head.add(mouth);
    parts.mouth = mouth; openMouth(head, parts, -.26, .59, .14);
    const tooth = M('#FFFFFF', { r: .3 });
    for (const sx of [-1, 1]) { const tt = mesh(new T.ConeGeometry(.025, .06, 10), tooth, sx * .1, -.335, .585); tt.rotation.x = Math.PI - .35; head.add(tt); }
    const spikeM = M('#FFC94A', { r: .5 });
    if (!covered) for (const [y, z] of [[.56, .1], [.52, -.22], [.36, -.46], [.08, -.6]]) spike(head, spikeM, new T.Vector3(0, y, z), .09, .22);
    for (const [y, z] of [[1.72, -.4], [1.46, -.46], [1.2, -.45]]) spike(body, spikeM, new T.Vector3(0, y, z), .08, .2, new T.Vector3(0, .35, -1));
    blushAt(head, .36, -.12, .46);
    const tail = addTail(body, parts, [[0, .98, -.36], [0, .72, -.72], [0, .5, -1.05], [0, .38, -1.3]], skinM, { puffs: [.22, .19, .16, .13, .1, .075] });
    for (const [y, z] of [[.02, -.42], [-.18, -.68]]) spike(tail, spikeM, new T.Vector3(0, y + .16, z), .06, .14, new T.Vector3(0, 1, -.3));
    return eyesAt(head, parts, { x: .21, y: .2, z: .5, s: 1.15 });
  },

  robot(head, { skin, skinM, parts, covered }) {
    const geo = new T.ExtrudeGeometry(roundedRect(.98, .9, .24), { depth: .78, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 4, curveSegments: 10 });
    geo.center();
    head.add(mesh(geo, skinM));
    const screen = new T.Mesh(new T.ShapeGeometry(roundedRect(.78, .56, .14), 10), M('#1B2230', { r: .25 }));
    screen.position.set(0, -.01, .456); head.add(screen);
    const led = M('#5FF3FF', { e: 0x3FE0FF, ei: 1 });
    const eyes = new T.Group(); eyes.position.y = .05; parts.eyes = eyes; head.add(eyes);
    for (const sx of [-1, 1]) eyes.add(mesh(new T.CapsuleGeometry(.055, .08, 6, 12), led, sx * .17, 0, .47));
    const m = mesh(new T.TorusGeometry(.09, .018, 8, 20, Math.PI), led, 0, -.13, .47); m.rotation.z = Math.PI; head.add(m);
    const heart = new T.Shape(); heart.moveTo(0, -.06); heart.bezierCurveTo(-.11, .02, -.06, .1, 0, .045); heart.bezierCurveTo(.06, .1, .11, .02, 0, -.06);
    const hearts = new T.Group(); hearts.position.y = .05; hearts.visible = false; parts.happyEyes = hearts; head.add(hearts);
    for (const sx of [-1, 1]) hearts.add(mesh(new T.ShapeGeometry(heart, 12), M('#FF7AB6', { e: 0xff3d8e, ei: 1 }), sx * .17, 0, .47));
    const pink = M('#FF8FB8', { e: 0xff5f9e, ei: .7 });
    for (const sx of [-1, 1]) { const c = new T.Mesh(new T.CircleGeometry(.045, 16), pink); c.position.set(sx * .3, -.08, .462); head.add(c); }
    const bolt = M('#E8B84B', { r: .35, m: .4 });
    parts.ears = [];
    if (!covered) {
      for (const sx of [-1, 1]) { const e = mesh(new T.CylinderGeometry(.13, .13, .12, 24), bolt, sx * .58, 0, 0); e.rotation.z = Math.PI / 2; head.add(e); parts.ears.push(e); }
      head.add(mesh(new T.CylinderGeometry(.022, .022, .3, 8), M(shade(skin, .7)), 0, .6, 0));
      const ball = mesh(new T.SphereGeometry(.075, 16, 12), M('#FF6FAE', { e: 0xff4f9a, ei: .9 }), 0, .78, 0); head.add(ball); parts.led = ball;
    }
    return { x: .17, y: .05, z: .47 };
  },
};

/* ── بناء البطل من مظهره ─────────────────────────────────────────────────── */
function buildAvatar(L, TEX) {
  const g = new T.Group(); const parts = {};
  const C = charOf(L);
  const skin = C.colors[L.skin] ?? C.colors[0];
  const skinM = C.id === 'robot' ? M(skin, { r: .32, m: .35 }) : M(skin, { r: C.id === 'kid' ? .62 : .78 });
  const limbM = C.id === 'panda' ? M('#24242C', { r: .7 }) : skinM; // يدا الباندا وساقاه سوداء
  const top = L.top;
  const topCol = top === 'thobe' ? '#F8F7F2' : top === 'space' ? '#F2F4F8' : CLOTH_C[L.topC];
  const topM = M(topCol, { r: .7 });
  const pantsM = M(top === 'space' ? '#E3E8F0' : PANTS_C[L.pantsC], { r: .7 });
  const shoeM = M(top === 'space' ? '#8E9AAD' : SHOE_C[L.shoeC], { r: .42 });
  const soleM = M('#FFFFFF', { r: .5 });

  /* الساقان والحذاء — كل ساق مجموعة محورها عند الورك لتتحرك في الرقصات */
  parts.legs = [];
  for (const sx of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(sx * .2, .98, 0); g.add(leg); parts.legs.push(leg);
    if (top !== 'thobe') {
      if (L.bottom === 'shorts' && top !== 'space') {
        leg.add(mesh(new T.CylinderGeometry(.18, .18, .32, 24), pantsM, 0, -.18, 0));
        leg.add(mesh(new T.CylinderGeometry(.13, .125, .48, 20), limbM, 0, -.56, 0));
      } else leg.add(mesh(new T.CylinderGeometry(.17, .155, .78, 24), pantsM, 0, -.41, 0));
    }
    const s = mesh(new T.SphereGeometry(.2, 24, 16), shoeM, 0, -.78, .07); s.scale.set(1, .62, 1.45); leg.add(s);
    const so = mesh(new T.CylinderGeometry(.2, .2, .05, 24), soleM, 0, -.88, .07); so.scale.set(1, 1, 1.45); leg.add(so);
  }
  if (top !== 'thobe') g.add(mesh(new T.CylinderGeometry(.43, .41, .16, 32), pantsM, 0, .94, 0));

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
      inner.add(mesh(new T.CylinderGeometry(.115, .105, .42, 20), limbM, 0, -.47, 0));
    }
    const hand = new T.Group(); hand.position.y = -.72; inner.add(hand);
    hand.add(mesh(new T.SphereGeometry(.135, 20, 14), top === 'space' ? M('#8E9AAD') : limbM));
    a.userData.hand = hand; return a;
  };
  parts.armR = makeArm(-1); parts.armL = makeArm(1); body.add(parts.armR, parts.armL);

  /* الرأس والوجه — لكل شخصية رأسها؛ الشماغ وخوذة الفضاء يخفيان الآذان والعُرف والأشواك */
  const head = new T.Group(); head.position.y = HY; parts.head = head; g.add(head);
  const covered = L.head === 'shemagh' || L.head === 'astro';
  const face = HEADS[C.id](head, { L, skin, skinM, parts, body, covered });

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
  if (L.head === 'party') { // قبعة الاحتفال: مخروط مقلّم وكرة
    const pc = document.createElement('canvas'); pc.width = 64; pc.height = 256; const px = pc.getContext('2d');
    ['#7C5CD9', '#FFD24A', '#E8578C', '#2ABB7A'].forEach((c, i) => { for (let k = i; k < 8; k += 4) { px.fillStyle = c; px.fillRect(0, k * 32, 64, 32); } });
    const ptex = new T.CanvasTexture(pc); ptex.colorSpace = T.SRGBColorSpace;
    const cone = mesh(new T.ConeGeometry(.36, .78, 32), M(0xffffff, { map: ptex, r: .5 }), .08, .86, 0); cone.rotation.z = -.18; head.add(cone);
    head.add(mesh(new T.SphereGeometry(.09, 14, 10), M('#FFFFFF', { r: .9 }), .15, 1.24, 0));
  }
  if (L.head === 'laurel') { // إكليل المثابر
    const leaf = M('#3E9B4F', { r: .55 }), leaf2 = M('#5CBF62', { r: .55 });
    for (let i = 0; i < 22; i++) {
      const a = -Math.PI * .92 + i / 21 * Math.PI * 1.84;
      const l = mesh(new T.SphereGeometry(.09, 10, 8), i % 2 ? leaf : leaf2, Math.sin(a) * .6, .34 + .05 * Math.cos(i * 1.7), Math.cos(a) * .6);
      l.scale.set(1.8, .5, .8); l.rotation.y = a; l.rotation.z = (i % 2 ? .5 : -.5); head.add(l);
    }
    head.add(mesh(new T.SphereGeometry(.06, 12, 10), M('#E8B84B', { r: .3, m: .6 }), 0, .32, .62));
  }

  /* النظارة */
  const gx = face.x, gy = face.y + .01, gz = face.z + .05;
  if (L.eyes === 'round') {
    const fm = M('#1A1A22', { r: .3 });
    for (const sx of [-1, 1]) head.add(mesh(new T.TorusGeometry(.13, .022, 10, 32), fm, sx * gx, gy, gz));
    const br = mesh(new T.CylinderGeometry(.015, .015, gx * 2 - .26, 8), fm, 0, gy + .03, gz + .02); br.rotation.z = Math.PI / 2; head.add(br);
  }
  if (L.eyes === 'star') {
    const sm = M('#FFC83D', { r: .3, e: 0xff9f1c, ei: .25 });
    const geo = new T.ExtrudeGeometry(starShape(.16, .075), { depth: .03, bevelEnabled: false });
    for (const sx of [-1, 1]) head.add(mesh(geo, sm, sx * gx, gy, gz));
    const br = mesh(new T.CylinderGeometry(.015, .015, Math.max(.06, gx * 2 - .28), 8), sm, 0, gy + .03, gz + .03); br.rotation.z = Math.PI / 2; head.add(br);
  }
  if (L.eyes === 'heart') {
    const hm = M('#FF4F8B', { r: .3, e: 0xff2e74, ei: .2 });
    const hs = new T.Shape(); hs.moveTo(0, -.12); hs.bezierCurveTo(-.2, .02, -.12, .2, 0, .09); hs.bezierCurveTo(.12, .2, .2, .02, 0, -.12);
    const geo = new T.ExtrudeGeometry(hs, { depth: .03, bevelEnabled: false });
    for (const sx of [-1, 1]) head.add(mesh(geo, hm, sx * gx, gy, gz));
    const br = mesh(new T.CylinderGeometry(.015, .015, Math.max(.06, gx * 2 - .3), 8), hm, 0, gy + .04, gz + .03); br.rotation.z = Math.PI / 2; head.add(br);
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

  if (L.back === 'jetpack') { // حقيبة الصواريخ بلهب صغير
    const metal = M('#C9D1DC', { r: .3, m: .6 }), red = M('#E8463D', { r: .4 });
    parts.flames = [];
    for (const sx of [-1, 1]) {
      body.add(mesh(new T.CylinderGeometry(.16, .16, .62, 20), metal, sx * .2, 1.42, -.6));
      const nose = mesh(new T.ConeGeometry(.16, .2, 20), red, sx * .2, 1.83, -.6); body.add(nose);
      body.add(mesh(new T.CylinderGeometry(.1, .14, .1, 16), M('#5A6578', { r: .5, m: .5 }), sx * .2, 1.06, -.6));
      const fl = mesh(new T.ConeGeometry(.1, .32, 14), M('#FFB347', { e: 0xff7a1a, ei: 1.4, op: .9 }), sx * .2, .86, -.6); fl.rotation.x = Math.PI; fl.castShadow = false; body.add(fl); parts.flames.push(fl);
    }
    body.add(mesh(new T.BoxGeometry(.24, .4, .1), M('#1A2B4A', { r: .5 }), 0, 1.45, -.5));
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
  if (L.hand === 'balloon') { // بالون الفرح يطفو فوق اليد
    const bg = new T.Group(); bg.position.set(0, .05, .1); rh.add(bg); parts.balloon = bg;
    bg.add(mesh(new T.CylinderGeometry(.006, .006, 1.3, 6), M('#FFFFFF'), 0, .65, 0));
    const b = mesh(new T.SphereGeometry(.3, 28, 20), M('#FF5C8A', { r: .18 }), 0, 1.55, 0); b.scale.set(1, 1.15, 1); bg.add(b);
    bg.add(mesh(new T.ConeGeometry(.05, .07, 10), M('#FF5C8A', { r: .3 }), 0, 1.2, 0));
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

/* ── العوالم ─────────────────────────────────────────────────────────────────
   كل عالم مشهد خلف المنصة + سماء + ألوان إضاءة. الاستوديو بلا مشهد (خلفية الصفحة تظهر). */
function gradientTex(stops, h = 512) {
  const c = document.createElement('canvas'); c.width = 4; c.height = h;
  const x = c.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, h);
  stops.forEach(([p, col]) => gr.addColorStop(p, col)); x.fillStyle = gr; x.fillRect(0, 0, 4, h);
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; return tx;
}
let DOT = null;
function dotTex() {
  if (DOT) return DOT;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); DOT = new T.CanvasTexture(c); return DOT;
}
const flat = (geo, mat, y = -.2) => { const m = new T.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; };
const basic = (c, o = {}) => new T.MeshBasicMaterial({ color: c, transparent: o.op !== undefined, opacity: o.op ?? 1, depthWrite: o.op === undefined, side: o.ds ? T.DoubleSide : T.FrontSide, map: o.map || null });

function palm(x, z, s = 1, lean = .15) {
  const g = new T.Group(); g.position.set(x, -.2, z); g.scale.setScalar(s);
  const trunk = M('#8B5A2B', { r: .9 });
  let y = 0, px = 0;
  for (let i = 0; i < 7; i++) {
    const seg = mesh(new T.CylinderGeometry(.12 - i * .007, .155 - i * .007, .5, 10), trunk, px, y + .25, 0);
    seg.rotation.z = -lean * .6; g.add(seg); y += .46; px += lean * .3;
  }
  const leaf = M('#3E9B4F', { r: .7, ds: true }), leaf2 = M('#57B85F', { r: .7, ds: true });
  for (let i = 0; i < 8; i++) {
    const fr = new T.Group(); fr.position.set(px, y, 0); fr.rotation.y = i / 8 * Math.PI * 2; g.add(fr);
    const l = mesh(new T.SphereGeometry(.55, 16, 8), i % 2 ? leaf : leaf2, .6, -.16, 0); l.scale.set(1.4, .07, .3); l.rotation.z = -.5; fr.add(l);
  }
  for (const [cx, cz] of [[.12, .08], [-.1, .1], [0, -.12]]) g.add(mesh(new T.SphereGeometry(.1, 10, 8), M('#6B4423', { r: .7 }), px + cx, y - .12, cz));
  return g;
}

function bookshelf(x, z, flip) {
  const g = new T.Group(); g.position.set(x, -.2, z); g.rotation.y = flip ? -.35 : .35;
  const wood = M('#6E4224', { r: .8 });
  g.add(mesh(new T.BoxGeometry(2.3, 4.8, .55), wood, 0, 2.4, -.1));
  const cols = ['#C8463D', '#2E6FB5', '#2ABB7A', '#E8B84B', '#7C5CD9', '#E8578C', '#F07D3A', '#1A2B4A'];
  for (let s = 0; s < 4; s++) {
    const sy = .45 + s * 1.12;
    g.add(mesh(new T.BoxGeometry(2.1, .07, .5), M('#8A5532', { r: .8 }), 0, sy - .06, .06));
    let bx = -.95;
    let k = s * 3;
    while (bx < .9) {
      const w = .11 + ((k * 7) % 5) * .025, hh = .58 + ((k * 3) % 4) * .07;
      g.add(mesh(new T.BoxGeometry(w, hh, .36), M(cols[k % cols.length], { r: .7 }), bx + w / 2, sy + hh / 2, .1));
      bx += w + .02; k++;
    }
  }
  return g;
}
function openBook(col) {
  const g = new T.Group();
  const cover = M(col, { r: .6, ds: true }), page = M('#FFFDF5', { r: .9, ds: true });
  for (const sx of [-1, 1]) {
    const half = new T.Group(); half.rotation.z = sx * .35; g.add(half);
    half.add(mesh(new T.BoxGeometry(.42, .03, .56), cover, sx * .22, 0, 0));
    half.add(mesh(new T.BoxGeometry(.38, .04, .5), page, sx * .2, .03, 0));
    half.userData.sx = sx;
  }
  return g;
}

function buildWorld(id) {
  const g = new T.Group(); const anim = [];
  let sky = null, light = { sky: 0xffffff, ground: 0xd8dcf5, key: 0xffffff, rim: 0xffffff };
  if (id === 'oasis') {
    sky = gradientTex([[0, '#2E2A6E'], [.4, '#C2558C'], [.64, '#F48A6A'], [.82, '#FFC27A'], [1, '#FFE3B0']]);
    light = { sky: 0xffd6b0, ground: 0xc9876a, key: 0xffd9a8, rim: 0xff9ec2 };
    g.add(flat(new T.CircleGeometry(40, 48), M('#F1C98C', { r: 1 })));
    for (const [x, z, r, c] of [[-7, -11, 6, '#E3A961'], [6, -13, 7, '#D99A55'], [0, -18, 9, '#EDB874'], [-13, -8, 5, '#E9B474'], [12, -9, 5, '#E1A564']]) {
      const d = mesh(new T.SphereGeometry(r, 32, 16), M(c, { r: 1 }), x, -r * .2, z); d.scale.set(1, .3, .55); d.castShadow = false; d.receiveShadow = true; g.add(d);
    }
    const sun = new T.Mesh(new T.CircleGeometry(1.4, 48), basic('#FFE7A6')); sun.position.set(2.8, 3.4, -21); g.add(sun);
    const glow = new T.Mesh(new T.CircleGeometry(2.6, 48), basic('#FFD18A', { op: .28 })); glow.position.set(2.8, 3.4, -21.1); g.add(glow);
    const water = flat(new T.CircleGeometry(1.25, 40), M('#58C6DC', { r: .08, m: .1 }), -.19); water.scale.set(1.7, .75, 1); water.position.set(-2.7, -.19, -3.4); g.add(water);
    g.add(palm(-3.6, -4.6, 1.1, .22), palm(3.7, -5.4, 1.25, -.2), palm(-1.7, -8.6, .9, .12), palm(2.1, -10, .85, -.1));
    // نجوم المساء الأولى
    const pos = []; for (let i = 0; i < 70; i++) pos.push((Math.random() - .5) * 40, 8 + Math.random() * 10, -20 - Math.random() * 5);
    const st = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(pos, 3)), new T.PointsMaterial({ size: .22, map: dotTex(), transparent: true, depthWrite: false, opacity: .8 }));
    g.add(st);
  }
  if (id === 'space') {
    sky = gradientTex([[0, '#05061A'], [.55, '#151349'], [1, '#3A1F70']]);
    light = { sky: 0xc9d4ff, ground: 0x4a3a8a, key: 0xf2f0ff, rim: 0x9ad8ff };
    g.add(flat(new T.CircleGeometry(40, 48), M('#B9C0D6', { r: 1 })));
    for (let i = 0; i < 16; i++) {
      const a = i * 2.3, r = 2.4 + (i * 1.7) % 9;
      const c = flat(new T.CircleGeometry(.25 + (i % 4) * .14, 24), M('#9AA2BC', { r: 1 }), -.19); c.position.set(Math.cos(a) * r, -.19, -Math.abs(Math.sin(a) * r) - .5); g.add(c);
    }
    const pos = []; for (let i = 0; i < 600; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * .5; pos.push(Math.cos(th) * Math.sin(ph) * 30, Math.cos(ph) * 30 - 2, -Math.abs(Math.sin(th) * Math.sin(ph) * 30) - 4); }
    const st = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(pos, 3)), new T.PointsMaterial({ size: .26, map: dotTex(), transparent: true, depthWrite: false }));
    g.add(st); anim.push((t) => { st.material.opacity = .75 + .25 * Math.sin(t * 2); });
    const pc = document.createElement('canvas'); pc.width = 64; pc.height = 256; const px = pc.getContext('2d');
    ['#F6B26B', '#E8915A', '#F9C98E', '#D9774A', '#F6B26B', '#FBD7A4'].forEach((c, i) => { px.fillStyle = c; px.fillRect(0, i * 43, 64, 43); });
    const ptex = new T.CanvasTexture(pc); ptex.colorSpace = T.SRGBColorSpace;
    const planet = mesh(new T.SphereGeometry(1.7, 40, 28), M(0xffffff, { map: ptex, r: .8 }), -3.7, 5.4, -14); planet.castShadow = false; g.add(planet);
    const ring = new T.Mesh(new T.RingGeometry(2.3, 3.3, 64), basic('#F7D9A8', { op: .75, ds: true })); ring.position.copy(planet.position); ring.rotation.set(-1.2, .25, 0); g.add(ring);
    const moon = mesh(new T.SphereGeometry(.9, 32, 20), M('#E7ECF8', { r: .9 }), 3.9, 5.9, -12); moon.castShadow = false; g.add(moon);
    const blue = mesh(new T.SphereGeometry(.45, 24, 16), M('#7FD1F7', { r: .6, e: 0x2a6f9a, ei: .35 }), 4.6, 2.4, -10); blue.castShadow = false; g.add(blue);
    anim.push((t) => { planet.rotation.y = t * .1; blue.position.y = 2.4 + .15 * Math.sin(t * .8); });
    // شهاب يعبر السماء
    const comet = new T.Mesh(new T.SphereGeometry(.06, 8, 6), basic('#FFFFFF')); g.add(comet);
    const tail = new T.Mesh(new T.ConeGeometry(.05, 1.4, 8), basic('#BFE6FF', { op: .5 })); tail.rotation.z = Math.PI / 2 + .35; comet.add(tail); tail.position.x = .7;
    anim.push((t) => { const k = (t % 7) / 7; comet.position.set(6 - k * 14, 8.5 - k * 3, -15); comet.visible = k < .45; });
  }
  if (id === 'library') {
    sky = gradientTex([[0, '#1E1534'], [1, '#3D2A5C']]);
    light = { sky: 0xffe2b8, ground: 0x6b4a8c, key: 0xffe3c0, rim: 0xb9a2ff };
    g.add(flat(new T.CircleGeometry(40, 48), M('#9C6337', { r: .85 })));
    const rc = document.createElement('canvas'); rc.width = rc.height = 256; const rx = rc.getContext('2d');
    [['#8E2236', 128], ['#E8B84B', 112], ['#1A2B4A', 100], ['#B5303F', 92], ['#E8B84B', 40], ['#1A2B4A', 30]].forEach(([c, r]) => { rx.fillStyle = c; rx.beginPath(); rx.arc(128, 128, r, 0, 7); rx.fill(); });
    star2d(rx, 128, 128, 26, 12, '#FFF4D6');
    const rtex = new T.CanvasTexture(rc); rtex.colorSpace = T.SRGBColorSpace;
    const rug = flat(new T.CircleGeometry(2.4, 48), M(0xffffff, { map: rtex, r: .95 }), -.195); g.add(rug);
    const wall = new T.Mesh(new T.PlaneGeometry(40, 16), M('#4A3463', { r: .9 })); wall.position.set(0, 7, -7); g.add(wall);
    const arch = new T.Shape(); arch.moveTo(-1.3, 0); arch.lineTo(-1.3, 2.2); arch.absarc(0, 2.2, 1.3, Math.PI, 0, true); arch.lineTo(1.3, 0); arch.lineTo(-1.3, 0);
    const win = new T.Mesh(new T.ShapeGeometry(arch, 24), basic('#24357A')); win.position.set(0, 2.2, -6.95); g.add(win);
    const frame = new T.Mesh(new T.ShapeGeometry(arch, 24), M('#7A4A2A', { r: .8 })); frame.scale.setScalar(1.12); frame.position.set(0, 2.05, -6.97); g.add(frame);
    const moon = new T.Mesh(new T.CircleGeometry(.42, 32), basic('#FFF3C4')); moon.position.set(.45, 4.1, -6.9); g.add(moon);
    const bite = new T.Mesh(new T.CircleGeometry(.38, 32), basic('#24357A')); bite.position.set(.62, 4.2, -6.89); g.add(bite);
    for (const [sx, sy] of [[-.7, 4.4], [-.3, 3.3], [.8, 3.0], [-.9, 2.8], [.2, 2.6]]) { const s = new T.Mesh(new T.CircleGeometry(.05, 8), basic('#FFFFFF')); s.position.set(sx, sy, -6.9); g.add(s); }
    g.add(bookshelf(-3.7, -5.2, false), bookshelf(3.7, -5.2, true));
    const lamp = new T.PointLight(0xffb86b, 18, 14, 1.6); lamp.position.set(0, 4.2, -2.5); g.add(lamp);
    const books = [];
    ['#C8463D', '#2E6FB5', '#2ABB7A', '#E8B84B', '#7C5CD9'].forEach((c, i) => {
      const b = openBook(c); const a = i / 5 * Math.PI * 2 + .4;
      b.userData = { a, r: 2.6 + (i % 2) * .5, y: 3.0 + (i % 3) * .55 }; g.add(b); books.push(b);
    });
    anim.push((t) => books.forEach((b, i) => {
      const { a, r, y } = b.userData; const aa = a + t * .25;
      b.position.set(Math.cos(aa) * r, y + .18 * Math.sin(t * 1.4 + i), Math.sin(aa) * r * .55 - 2.2);
      b.rotation.y = -aa; b.children.forEach(h => { h.rotation.z = h.userData.sx * (.35 + .25 * Math.sin(t * 4 + i)); });
    }));
  }
  g.traverse(o => { if (o.isMesh && o.castShadow && o.parent !== g) o.castShadow = false; });
  return { group: g, sky, light, anim };
}

/* ── الهالات والمركبات والرفاق ─────────────────────────────────────────────── */
/* الحروف الـ28 بترتيب «الحروف الهجائية» (huroof_letter:N) — الهالة تُظهر ما أتقنه الطالب منها */
const LETTERS_28 = ['أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'];
function auraLetters(indices) {
  let list = (indices ?? []).filter(i => Number.isInteger(i) && i >= 0 && i < 28).map(i => LETTERS_28[i]);
  if (list.length < 3) list = LETTERS_28.slice(0, 6);           // بداية الرحلة: أول الحروف تشجيعاً
  if (list.length > 14) list = Array.from({ length: 14 }, (_, k) => list[Math.floor(k * list.length / 14)]);
  return list;
}
function letterSprite(ch, font) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.font = `800 92px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(255,200,80,.95)'; x.shadowBlur = 18;
  x.lineWidth = 8; x.strokeStyle = '#FFFFFF'; x.strokeText(ch, 64, 70);
  const gr = x.createLinearGradient(0, 20, 0, 110); gr.addColorStop(0, '#FFE58A'); gr.addColorStop(1, '#E39B1B');
  x.fillStyle = gr; x.fillText(ch, 64, 70);
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
  const s = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); s.scale.setScalar(.48); return s;
}
function butterfly(col) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = col; x.beginPath(); x.ellipse(32, 24, 26, 20, -.3, 0, 7); x.fill(); x.beginPath(); x.ellipse(28, 48, 16, 13, .4, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.arc(36, 22, 7, 0, 7); x.fill();
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace;
  const g = new T.Group(); const wm = new T.MeshBasicMaterial({ map: tx, transparent: true, side: T.DoubleSide, depthWrite: false });
  for (const sx of [-1, 1]) { const w = new T.Mesh(new T.PlaneGeometry(.32, .32), wm); w.position.x = sx * .16; w.scale.x = sx; const piv = new T.Group(); piv.add(w); piv.userData.sx = sx; g.add(piv); }
  g.add(new T.Mesh(new T.CapsuleGeometry(.02, .16, 4, 8), basic('#3A2A22')));
  return g;
}
function carpetTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d');
  x.fillStyle = '#A9213C'; x.fillRect(0, 0, 512, 320);
  x.fillStyle = '#E8B84B'; x.fillRect(14, 14, 484, 292); x.fillStyle = '#1A2B4A'; x.fillRect(26, 26, 460, 268);
  x.fillStyle = '#B92744'; x.fillRect(40, 40, 432, 240);
  x.fillStyle = '#E8B84B';
  for (let i = 0; i < 14; i++) { x.save(); x.translate(56 + i * 31, 33); x.rotate(Math.PI / 4); x.fillRect(-5, -5, 10, 10); x.restore(); x.save(); x.translate(56 + i * 31, 287); x.rotate(Math.PI / 4); x.fillRect(-5, -5, 10, 10); x.restore(); }
  star2d(x, 256, 160, 82, 40, '#E8B84B'); star2d(x, 256, 160, 52, 26, '#1A2B4A'); star2d(x, 256, 160, 26, 12, '#FFF4D6');
  for (const cx of [110, 402]) { star2d(x, cx, 160, 30, 14, '#E8B84B'); }
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
function eggTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#FFF4DC'; x.fillRect(0, 0, 256, 128);
  const cols = ['#7C5CD9', '#2ABB7A', '#E8578C', '#3B9BEF', '#E8B84B'];
  for (let i = 0; i < 22; i++) { x.fillStyle = cols[i % 5]; x.beginPath(); x.ellipse((i * 47) % 256, 14 + (i * 29) % 100, 9 + (i % 3) * 4, 7 + (i % 2) * 3, i, 0, 7); x.fill(); }
  x.strokeStyle = '#E8B84B'; x.lineWidth = 5; x.beginPath(); for (let i = 0; i <= 256; i += 16) x.lineTo(i, 64 + (i / 16 % 2 ? 9 : -9)); x.stroke();
  const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; return tx;
}
function babyDragon() {
  const g = new T.Group(); const p = {};
  const skin = M('#3CC4B4', { r: .55 }), belly = M('#FFE39A', { r: .6 }), horn = M('#FFF4D6', { r: .4 }), wingM = M('#8E6CE8', { r: .6, ds: true });
  const body = mesh(new T.SphereGeometry(.34, 28, 20), skin); body.scale.set(1, 1.08, .95); g.add(body);
  const bl = mesh(new T.SphereGeometry(.26, 20, 16), belly, 0, -.04, .14); bl.scale.set(1, 1.05, .6); g.add(bl);
  const head = new T.Group(); head.position.set(0, .5, .06); g.add(head);
  head.add(mesh(new T.SphereGeometry(.3, 28, 20), skin));
  const sn = mesh(new T.SphereGeometry(.17, 20, 14), skin, 0, -.08, .24); sn.scale.set(1.2, .8, .9); head.add(sn);
  for (const sx of [-1, 1]) {
    head.add(mesh(new T.SphereGeometry(.018, 8, 6), M('#1F6E66'), sx * .06, -.05, .39));
    const h = mesh(new T.ConeGeometry(.05, .16, 12), horn, sx * .13, .27, -.04); h.rotation.z = -sx * .35; head.add(h);
  }
  eyesAt(head, p, { x: .12, y: .07, z: .24, s: .78 });
  const wings = [];
  for (const sx of [-1, 1]) {
    const piv = new T.Group(); piv.position.set(sx * .2, .18, -.18); g.add(piv);
    const w = mesh(new T.SphereGeometry(.28, 18, 12), wingM, sx * .26, .08, 0); w.scale.set(1, .55, .08); w.rotation.z = sx * .5; piv.add(w);
    piv.userData.sx = sx; wings.push(piv);
  }
  const curve = new T.CatmullRomCurve3([new T.Vector3(0, -.22, -.25), new T.Vector3(0, -.32, -.5), new T.Vector3(.12, -.2, -.68)]);
  g.add(mesh(new T.TubeGeometry(curve, 16, .06, 8), skin));
  const tip = mesh(new T.ConeGeometry(.08, .14, 4), M('#8E6CE8', { r: .6 }), .12, -.16, -.72); tip.rotation.x = -1; g.add(tip);
  for (const sx of [-1, 1]) g.add(mesh(new T.SphereGeometry(.08, 12, 10), skin, sx * .15, -.34, .08));
  g.userData = { wings, eyes: p.eyes };
  return g;
}

function buildExtras(L, petTex, letters) {
  const g = new T.Group(); const x = { group: g };
  if (L.aura === 'letters') {
    const ring = new T.Group(); g.add(ring); x.aura = ring; x.auraKind = 'letters';
    const font = cssFont('--font-naskh', '"Noto Naskh Arabic", "Amiri", serif');
    const list = auraLetters(letters);
    list.forEach((ch, i) => { const s = letterSprite(ch, font); s.userData = { a: i / list.length * Math.PI * 2, y: 1.1 + (i % 3) * .75 }; ring.add(s); });
  }
  if (L.aura === 'leaves' || L.aura === 'snow') { // أوراق الخريف / ثلج الشتاء تتساقط حول البطل
    const ring = new T.Group(); g.add(ring); x.aura = ring; x.auraKind = L.aura;
    const n = L.aura === 'snow' ? 34 : 16;
    const mats = L.aura === 'snow' ? [basic('#FFFFFF')] : ['#E8752B', '#D9462E', '#F2B33D', '#B8562A'].map(c => M(c, { r: .7, ds: true }));
    for (let i = 0; i < n; i++) {
      const m = L.aura === 'snow' ? new T.Mesh(new T.SphereGeometry(.035 + (i % 3) * .012, 8, 6), mats[0]) : mesh(new T.CircleGeometry(.1, 5), mats[i % mats.length]);
      m.castShadow = false; if (L.aura === 'leaves') m.scale.set(1.5, .8, 1);
      const a = i * 2.39, r = .7 + (i % 5) * .22;
      m.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r * .8, y: (i / n) * 3.8, v: L.aura === 'snow' ? .45 + (i % 4) * .1 : .55 + (i % 3) * .15, ph: i };
      ring.add(m);
    }
  }
  if (L.aura === 'ramadan') { // هلال وفوانيس تدور
    const ring = new T.Group(); g.add(ring); x.aura = ring; x.auraKind = 'ramadan';
    const moon = new T.Group(); moon.userData = { a: 0, y: 3.0 };
    const cres = new T.Shape(); cres.absarc(0, 0, .26, 0, Math.PI * 2, false); const hole = new T.Path(); hole.absarc(.1, .06, .22, 0, Math.PI * 2, true); cres.holes.push(hole);
    moon.add(new T.Mesh(new T.ShapeGeometry(cres, 32), new T.MeshStandardMaterial({ color: 0xffe7a6, emissive: 0xffc94a, emissiveIntensity: .9, side: T.DoubleSide })));
    ring.add(moon);
    for (let i = 1; i <= 5; i++) {
      const ln = new T.Group(); ln.userData = { a: i / 6 * Math.PI * 2, y: 1.3 + (i % 2) * .7 };
      const col = ['#FF7A59', '#FFD24A', '#7FE0A8', '#8FD3FF', '#F59BC2'][i - 1];
      ln.add(mesh(new T.CylinderGeometry(.08, .1, .18, 6), M(col, { e: new T.Color(col).getHex(), ei: .9, op: .9 })));
      ln.add(mesh(new T.ConeGeometry(.1, .1, 6), M('#C8962E', { m: .6, r: .35 }), 0, .14, 0));
      ln.add(mesh(new T.CylinderGeometry(.11, .08, .03, 6), M('#C8962E', { m: .6, r: .35 }), 0, -.1, 0));
      ln.traverse(o => { if (o.isMesh) o.castShadow = false; });
      ring.add(ln);
    }
  }
  if (L.aura === 'fireworks') { const ring = new T.Group(); g.add(ring); x.aura = ring; x.auraKind = 'fireworks'; }
  if (L.aura === 'stars') {
    const ring = new T.Group(); ring.rotation.x = .35; g.add(ring); x.aura = ring; x.auraKind = 'stars';
    const sm = M('#FFD24A', { e: 0xffb800, ei: .8, r: .3 });
    for (let i = 0; i < 12; i++) { const s = mesh(new T.ExtrudeGeometry(starShape(.11, .05), { depth: .03, bevelEnabled: false }), sm); s.castShadow = false; s.userData = { a: i / 12 * Math.PI * 2, y: 1.7 + .25 * Math.sin(i) }; ring.add(s); }
  }
  if (L.aura === 'butterflies') {
    const ring = new T.Group(); g.add(ring); x.aura = ring; x.auraKind = 'butterflies';
    ['#F59BC2', '#8FD3FF', '#FFD166', '#B79CFF', '#7FE0A8', '#FF9F7A'].forEach((c, i) => { const b = butterfly(c); b.userData = { a: i / 6 * Math.PI * 2, y: 1.2 + (i % 3) * .7 }; ring.add(b); });
  }
  if (L.mount === 'carpet') {
    const geo = new T.PlaneGeometry(2.3, 1.45, 24, 16); geo.rotateX(-Math.PI / 2);
    const cm = M(0xffffff, { map: carpetTex(), r: .85, ds: true });
    const carpet = new T.Mesh(geo, cm); carpet.castShadow = true; carpet.receiveShadow = true;
    const base = geo.attributes.position.array.slice();
    const mg = new T.Group(); mg.add(carpet); g.add(mg);
    const tm = M('#E8B84B', { r: .4, m: .3 });
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { const tz = -.62 + i * .248; const ts = mesh(new T.SphereGeometry(.035, 8, 6), tm, sx * 1.22, -.04, tz); mg.add(ts); }
    x.mount = { group: mg, lift: .62, carpet, base, kind: 'carpet' };
  }
  if (L.mount === 'cloud') {
    const mg = new T.Group(); g.add(mg); const cm = M('#F7F9FF', { r: 1 });
    for (const [cx, cy, cz, r] of [[0, 0, 0, .55], [-.55, -.05, .1, .42], [.55, -.04, .05, .45], [-.25, .12, -.3, .4], [.3, .1, -.32, .42], [0, -.1, .38, .4], [-.85, -.12, -.1, .3], [.88, -.1, -.12, .32]]) {
      const s = mesh(new T.SphereGeometry(r, 20, 14), cm, cx, cy, cz); s.scale.y = .55; mg.add(s);
    }
    x.mount = { group: mg, lift: .55, kind: 'cloud' };
  }
  if (L.mount === 'board') {
    const mg = new T.Group(); g.add(mg);
    const geo = new T.ExtrudeGeometry(roundedRect(1.9, .72, .34), { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 3 }); geo.center(); geo.rotateX(-Math.PI / 2);
    mg.add(mesh(geo, M('#7C5CD9', { r: .35, m: .2 })));
    const grip = mesh(new T.BoxGeometry(1.5, .02, .5), M('#1A2B4A', { r: .9 }), 0, .07, 0); mg.add(grip);
    const glow = flat(new T.CircleGeometry(.8, 32), basic('#5FF3FF', { op: .45 }), -.09); glow.scale.set(1.25, .55, 1); mg.add(glow);
    for (const sx of [-1, 1]) mg.add(mesh(new T.SphereGeometry(.09, 12, 8), M('#5FF3FF', { e: 0x3fe0ff, ei: 1 }), sx * .7, -.08, 0));
    x.mount = { group: mg, lift: .48, kind: 'board', glow };
  }
  if (L.pet === 'faheem' && petTex) {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: petTex, transparent: true }));
    sp.scale.set(.86, 1.1, 1); sp.position.set(1.18, 2.15, .3); g.add(sp); x.pet = { obj: sp, y: 2.15, kind: 'sprite' };
  }
  if (L.pet === 'dragon') {
    const d = babyDragon(); d.position.set(1.3, 1.9, .3); d.rotation.y = -.5; g.add(d); x.pet = { obj: d, y: 1.9, kind: 'dragon' };
  }
  if (L.pet === 'egg') {
    const eg = new T.Group(); eg.position.set(1.05, 0, .45); g.add(eg);
    const nest = mesh(new T.TorusGeometry(.3, .09, 10, 24), M('#A07446', { r: 1 }), 0, .06, 0); nest.rotation.x = Math.PI / 2; eg.add(nest);
    const egg = mesh(new T.SphereGeometry(.3, 32, 24), M(0xffffff, { map: eggTex(), r: .45 }), 0, .4, 0); egg.scale.set(1, 1.3, 1); eg.add(egg);
    x.egg = { group: eg, egg, ring: null };
  }
  g.traverse(o => { if (o.isMesh && o.castShadow === undefined) o.castShadow = true; });
  return x;
}

/* ── المؤثرات: شرر ونجوم وغبار وموجة ─────────────────────────────────────── */
function makeFx(scene) {
  const group = new T.Group(); scene.add(group);
  const list = [];
  const starGeo = new T.ExtrudeGeometry(starShape(.09, .04), { depth: .02, bevelEnabled: false });
  const dustGeo = new T.SphereGeometry(.16, 12, 8);
  function add(obj, life, vel, spin = 0, grow = 0) { group.add(obj); list.push({ obj, life, age: 0, vel, spin, grow }); }
  return {
    group,
    sparkles(at, n = 18, colors = ['#FFD24A', '#FF8FB8', '#7FE0FF', '#B79CFF']) {
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(starGeo, new T.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true }));
        m.position.copy(at); const a = Math.random() * Math.PI * 2, u = Math.random() * 2 + 1.2;
        add(m, .9 + Math.random() * .5, new T.Vector3(Math.cos(a) * u, 2 + Math.random() * 2.2, Math.sin(a) * u * .6), 6);
      }
    },
    dust(at, n = 10) {
      for (let i = 0; i < n; i++) {
        const m = new T.Mesh(dustGeo, new T.MeshBasicMaterial({ color: '#FFF6E6', transparent: true, opacity: .8 }));
        const a = i / n * Math.PI * 2; m.position.set(at.x + Math.cos(a) * .5, at.y + .05, at.z + Math.sin(a) * .5);
        add(m, .8, new T.Vector3(Math.cos(a) * 1.6, .35, Math.sin(a) * 1.6), 0, 1.6);
      }
    },
    wave(at, color = '#FFD24A') {
      const m = new T.Mesh(new T.TorusGeometry(.6, .06, 8, 48), new T.MeshBasicMaterial({ color, transparent: true }));
      m.rotation.x = Math.PI / 2; m.position.copy(at); add(m, 1.0, new T.Vector3(), 0, 4.5);
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]; p.age += dt; const k = p.age / p.life;
        if (k >= 1) { group.remove(p.obj); p.obj.material.dispose(); if (p.grow > 1.5) p.obj.geometry.dispose(); list.splice(i, 1); continue; }
        p.obj.position.addScaledVector(p.vel, dt);
        if (!p.grow) p.vel.y -= 5.5 * dt;
        p.obj.rotation.z += p.spin * dt;
        if (p.grow) p.obj.scale.setScalar(1 + p.grow * k);
        p.obj.material.opacity = 1 - k;
      }
    },
    clear() { list.forEach(p => { group.remove(p.obj); p.obj.material.dispose(); }); list.length = 0; },
  };
}

/* ── المسرح ──────────────────────────────────────────────────────────────────
   createHeroStage(canvas, { look, interactive, onTap, level }) ←
   { setLook, jump, peek, wave, emote, special, setLevel, eggProgress, hatch, snapshot, portraits, poster, dispose }
   interactive: السحب يدير البطل. اللمس (بلا سحب) يجعله يقفز ويستدعي onTap في الحالتين. */
const PIV = 1.3; // محور الشقلبة والدحرجة عند منتصف الجسم
const LEVEL_RING = [
  { color: '#B07A44', m: .1, r: .7 }, { color: '#D5DCE6', m: .9, r: .22 }, { color: '#E8B84B', m: .8, r: .25 },
  { color: '#7FE7FF', m: .2, r: .2, e: 0x38cfff, ei: .9 }, { color: '#FF7AB6', m: .2, r: .2, e: 0xff3d8e, ei: .9, rainbow: true },
];

export function createHeroStage(canvas, { look, interactive = true, onTap, level = 2, letters: lettersInit = [] } = {}) {
  let letters = lettersInit;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;

  const scene = new T.Scene();
  const pmrem = new T.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), .04);
  scene.environment = envRT.texture; scene.environmentIntensity = .55;
  const camera = new T.PerspectiveCamera(28, 1, .1, 80);
  const CAM = new T.Vector3(0, 2.1, 8.6);
  camera.position.copy(CAM); camera.lookAt(0, 1.8, 0);
  const hemi = new T.HemisphereLight(0xffffff, 0xd8dcf5, 1.1); scene.add(hemi);
  const sun = new T.DirectionalLight(0xffffff, 2.1);
  sun.position.set(2.6, 6.5, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -2.8, right: 2.8, top: 5.5, bottom: -.5, near: 1, far: 18 });
  sun.shadow.radius = 4; sun.shadow.bias = -.0005;
  scene.add(sun);
  const fill = new T.DirectionalLight(0xe9e2ff, .7); fill.position.set(-4, 3, -2); scene.add(fill);
  const rim = new T.DirectionalLight(0xffffff, 1.1); rim.position.set(-1, 4, -5); scene.add(rim);

  /* المنصة: لونها وتوهجها يتطوران مع مستوى الطالب */
  const podium = new T.Group();
  const pTop = new T.Mesh(new T.CylinderGeometry(1.3, 1.42, .2, 64), new T.MeshStandardMaterial({ color: 0xffffff, roughness: .45 }));
  pTop.position.y = -.1; pTop.receiveShadow = true; podium.add(pTop);
  const ringMat = new T.MeshStandardMaterial({ color: 0xe8b84b, roughness: .25, metalness: .8 });
  const pRing = new T.Mesh(new T.TorusGeometry(1.36, .05, 14, 96), ringMat);
  pRing.rotation.x = Math.PI / 2; pRing.position.y = -.02; podium.add(pRing);
  const gems = new T.Group(); podium.add(gems);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const gm = new T.Mesh(new T.OctahedronGeometry(.07), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x7fe7ff, emissiveIntensity: .8, roughness: .1 })); gm.position.set(Math.cos(a) * 1.36, .05, Math.sin(a) * 1.36); gems.add(gm); }
  scene.add(podium);
  let lvl = 2;
  function setLevel(n) {
    lvl = Math.max(0, Math.min(4, n | 0)); const s = LEVEL_RING[lvl];
    ringMat.color.set(s.color); ringMat.metalness = s.m; ringMat.roughness = s.r;
    ringMat.emissive.set(s.e ?? 0x000000); ringMat.emissiveIntensity = s.ei ?? 1;
    gems.visible = lvl >= 3;
  }
  setLevel(level);

  const root = new T.Group(); scene.add(root);
  const pivot = new T.Group(); pivot.position.y = PIV; root.add(pivot);
  const fx = makeFx(scene);
  const TEX = makeTextures();
  let petTex = null;
  let current = normalizeLook(look);
  let avatar = null, parts = {}, extras = null, world = null, worldId = null;

  function ensurePet(L) {
    if (L.pet !== 'faheem' || petTex) return;
    petTex = new T.TextureLoader().load(PET_IMG, (tx) => { tx.colorSpace = T.SRGBColorSpace; if (current.pet === 'faheem') rebuild(); });
  }
  function setWorld(id) {
    if (id === worldId) return;
    if (world) { scene.remove(world.group); disposeTree(world.group); world.sky?.dispose(); }
    worldId = id;
    world = id && id !== 'studio' ? buildWorld(id) : null;
    if (world) scene.add(world.group);
    scene.background = world?.sky ?? null;
    const l = world?.light ?? { sky: 0xffffff, ground: 0xd8dcf5, key: 0xffffff, rim: 0xffffff };
    hemi.color.set(l.sky); hemi.groundColor.set(l.ground); sun.color.set(l.key); rim.color.set(l.rim);
  }
  function rebuild() {
    if (avatar) { pivot.remove(avatar); disposeTree(avatar); }
    if (extras) { root.remove(extras.group); disposeTree(extras.group); }
    ensurePet(current);
    const built = buildAvatar(current, TEX);
    avatar = built.group; parts = built.parts; avatar.position.y = -PIV; pivot.add(avatar);
    extras = buildExtras(current, petTex?.image ? petTex : null, letters); root.add(extras.group);
    if (extras.egg) setEggRing(eggK);
    setWorld(current.world);
  }

  /* البيضة: حلقة ذهبية تمتلئ بنجوم التعلّم (0..1)، ثم تفقس */
  let eggK = 0; const EGG_N = 1;
  function setEggRing(k) {
    eggK = Math.max(0, Math.min(EGG_N, Number(k) || 0));
    const e = extras?.egg; if (!e) return;
    if (e.ring) { e.group.remove(e.ring); e.ring.geometry.dispose(); e.ring.material.dispose(); e.ring = null; }
    if (eggK > .01) {
      e.ring = new T.Mesh(new T.TorusGeometry(.44, .035, 8, 48, Math.PI * 2 * eggK / EGG_N), new T.MeshStandardMaterial({ color: 0xffd24a, emissive: 0xffb800, emissiveIntensity: .7, roughness: .3 }));
      e.ring.rotation.x = Math.PI / 2; e.ring.position.y = .07; e.group.add(e.ring);
    }
  }
  rebuild();

  /* الحركة */
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let yaw = .38, vel = 0, dragging = false, moved = 0, lastX = 0, celebrate = -1, peekAt = -1, lookOff = 0;
  let act = null, happyUntil = 0, shakeUntil = 0, last = performance.now(), hatchAt = -1, onHatched = null, camLift = 0;
  const DUR = { wave: 1700, clap: 1600, star: 1500, dabke: 2600, kid: 1700, cat: 1300, bunny: 1900, panda: 1600, fox: 1500, lion: 1900, dino: 1700, robot: 2500 };
  const did = new Set(); // أحداث لحظية داخل الحركة (شرر، غبار) تُطلق مرة واحدة
  const once = (key, fn) => { if (!did.has(key)) { did.add(key); fn(); } };
  const feet = () => new T.Vector3(0, root.position.y + .05, 0).applyMatrix4(root.matrixWorld);

  function play(name) {
    act = { name, t0: performance.now(), dur: DUR[name] ?? 1500 }; did.clear();
    celebrate = -1; happyUntil = performance.now() + act.dur;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < .9 ? 32 : 28;
    camera.updateProjectionMatrix();
  }

  function frame(now) {
    const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
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
    const m = extras?.mount;
    const mountLift = m ? m.lift + .07 * Math.sin(t * 1.6) : 0;
    root.rotation.y = yaw + spin + lookOff + (reduce ? 0 : Math.sin(t * .55) * .12);
    root.position.y = lift;
    pivot.position.y = PIV + mountLift; pivot.rotation.set(0, 0, 0);
    if (m) {
      m.group.position.y = mountLift + .02;
      if (m.kind === 'carpet' && !reduce) {
        const pos = m.carpet.geometry.attributes.position, b = m.base;
        for (let i = 0; i < pos.count; i++) { const vx = b[i * 3], vz = b[i * 3 + 2]; pos.array[i * 3 + 1] = .05 * Math.sin(vx * 2.6 + t * 3.2) + .035 * Math.sin(vz * 3.4 + t * 2.1) + .04 * Math.abs(vx) * Math.abs(vx) * .3; }
        pos.needsUpdate = true; m.carpet.geometry.computeVertexNormals();
      }
      if (m.glow) m.glow.material.opacity = .35 + .15 * Math.sin(t * 6);
    }
    if (parts.body) {
      // أوضاع الراحة
      const L = parts.legs;
      L.forEach(l => { l.rotation.set(0, 0, 0); });
      parts.armL.rotation.set(reduce ? 0 : .1 * Math.sin(t * 1.6), 0, 0);
      parts.armR.rotation.set((parts.holding ? -.55 : 0) + (reduce ? 0 : .08 * Math.sin(t * 1.6 + Math.PI)), 0, 0);
      if (!reduce) {
        parts.body.scale.y = 1 + .012 * Math.sin(t * 2.2);
        parts.head.rotation.z = .05 * Math.sin(t * 1.1);
        parts.head.rotation.x = .03 * Math.sin(t * 1.7);
        if (parts.wings) parts.wings.forEach(w => { w.rotation.y = w.userData.sx * (.35 + .28 * Math.sin(t * 5)); });
        if (parts.glow) parts.glow.material.emissiveIntensity = .7 + .3 * Math.sin(t * 4);
        if (parts.tail) parts.tail.rotation.y = .32 * Math.sin(t * 3.1);
        if (parts.ears) parts.ears.forEach((e, i) => {
          if (e.userData.rx === undefined) e.userData.rx = e.rotation.x;
          e.rotation.x = e.userData.rx + ((t + i * .7) % 4.2 < .25 ? .18 * Math.sin((t % 4.2) * 25) : 0);
        });
        if (parts.led) parts.led.material.emissiveIntensity = (t % 1.6) < .8 ? 1 : .3;
        if (parts.flames) parts.flames.forEach((f, i) => { f.scale.y = .7 + .4 * Math.abs(Math.sin(t * 17 + i * 2)); });
        if (parts.balloon) { parts.balloon.rotation.z = .12 * Math.sin(t * 1.3); parts.balloon.rotation.x = .08 * Math.sin(t * 1.7); }
      }
      // الحركات
      if (act) {
        const p = (now - act.t0) / act.dur;
        if (p >= 1) { act = null; }
        else poseFor(act.name, p, t);
      }
      const happy = now < happyUntil;
      parts.eyes.visible = !happy || !parts.happyEyes;
      if (parts.happyEyes) parts.happyEyes.visible = happy;
      if (parts.mouthOpen) { parts.mouthOpen.visible = happy; if (parts.mouth) parts.mouth.visible = !happy; }
      parts.eyes.scale.y = !happy && (t % 3.8) < .12 ? .12 : 1;
    }
    // الهالة والرفيق والبيضة
    if (extras?.aura && (extras.auraKind === 'leaves' || extras.auraKind === 'snow')) {
      extras.aura.children.forEach((c) => {
        const u = c.userData; u.y -= dt * u.v; if (u.y < -.1) u.y = 3.9;
        c.position.set(u.x + .18 * Math.sin(t * 1.3 + u.ph), u.y + mountLift, u.z + .12 * Math.cos(t * 1.1 + u.ph));
        c.rotation.set(t * .8 + u.ph, t * 1.1 + u.ph, t * .6);
      });
    } else if (extras?.auraKind === 'fireworks') {
      if (!reduce && Math.random() < dt * 1.3) {
        const a = Math.random() * Math.PI * 2;
        fx.sparkles(new T.Vector3(Math.cos(a) * 1.3, 2.9 + Math.random() * .8 + mountLift, Math.sin(a) * .6).applyMatrix4(root.matrixWorld), 14,
          [['#FF4D6D', '#FFD24A'], ['#7FE0FF', '#B79CFF'], ['#7FE0A8', '#FFFFFF']][Math.floor(Math.random() * 3)]);
      }
    } else if (extras?.aura) {
      const ring = extras.aura, k = extras.auraKind;
      ring.rotation.y = t * (k === 'stars' ? .9 : .45);
      ring.children.forEach((c, i) => {
        const { a, y } = c.userData; const r = k === 'stars' ? 1.15 : 1.45;
        c.position.set(Math.cos(a) * r, y + .12 * Math.sin(t * 1.6 + i) + mountLift, Math.sin(a) * r);
        if (k === 'stars') c.rotation.y = t * 2 + i;
        if (k === 'butterflies') { c.rotation.y = -a + Math.PI / 2; c.children.forEach(w => { if (w.userData.sx) w.rotation.y = w.userData.sx * (.2 + .9 * Math.abs(Math.sin(t * 9 + i))); }); }
      });
    }
    const pet = extras?.pet;
    if (pet) {
      pet.obj.position.y = pet.y + .1 * Math.sin(t * 2.1) + mountLift * .5;
      if (pet.kind === 'dragon') { pet.obj.userData.wings.forEach(w => { w.rotation.z = w.userData.sx * (.3 + .5 * Math.sin(t * 10)); }); pet.obj.userData.eyes.scale.y = (t % 3.3) < .12 ? .12 : 1; }
    }
    const egg = extras?.egg;
    if (egg) {
      if (hatchAt >= 0) {
        const p = (now - hatchAt) / 1600;
        egg.egg.rotation.z = .35 * Math.sin(p * 40) * Math.min(1, p * 2);
        egg.egg.scale.set(1 + .12 * p, 1.3 + .1 * p, 1 + .12 * p);
        if (p >= 1) {
          hatchAt = -1; const at = new T.Vector3(); egg.egg.getWorldPosition(at);
          fx.sparkles(at, 30); fx.wave(at.clone().setY(.1), '#B79CFF');
          const cb = onHatched; onHatched = null; cb?.();
        }
      } else egg.egg.rotation.z = (t % 3 < .4) ? .12 * Math.sin(t * 30) * (eggK / EGG_N) : 0;
    }
    if (lvl >= 3) gems.children.forEach((gm, i) => { gm.position.y = .08 + .06 * Math.sin(t * 2 + i); gm.rotation.y = t * 2; });
    if (LEVEL_RING[lvl].rainbow) ringMat.emissive.setHSL((t * .15) % 1, .8, .55);
    if (lvl === 4 && !reduce && Math.random() < .08) { const a = Math.random() * Math.PI * 2; fx.sparkles(new T.Vector3(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35), 1); }
    world?.anim.forEach(f => f(t));
    fx.update(dt);
    // الكاميرا تتراجع قليلاً حين يطير البطل على مركبته، وتهتز مع الارتطام
    camLift += ((m ? .5 : 0) - camLift) * Math.min(1, dt * 4);
    camera.position.set(CAM.x, CAM.y + camLift * .7, CAM.z + camLift * 1.6);
    if (now < shakeUntil) { camera.position.x += (Math.random() - .5) * .14; camera.position.y += (Math.random() - .5) * .14; }
    camera.lookAt(0, 1.8 + camLift * .75, 0);
    renderer.render(scene, camera);
  }

  /* وضعيات الحركات: p من 0 إلى 1 */
  function poseFor(name, p, t) {
    const { armL, armR, legs } = parts;
    const bump = (a, b) => (p >= a && p < b ? Math.sin((p - a) / (b - a) * Math.PI) : 0);
    if (name === 'wave') {
      const up = p < .2 ? ease(p / .2) : p < .8 ? 1 : 1 - ease((p - .8) / .2);
      armL.rotation.x = 0; armL.rotation.z = up * 2.5 + (p > .15 && p < .85 ? .3 * Math.sin((p - .15) * 28) * up : 0);
    }
    if (name === 'clap') {
      const k = Math.abs(Math.sin(p * Math.PI * 7));
      armL.rotation.set(-1.25, 0, -.15 - .35 * (1 - k)); armR.rotation.set(-1.25, 0, .15 + .35 * (1 - k));
      for (let i = 1; i <= 6; i++) if (p > i / 7) once('c' + i, () => fx.sparkles(new T.Vector3(0, 1.95 + pivot.position.y - PIV, .9).applyMatrix4(root.matrixWorld), 5));
    }
    if (name === 'star') {
      const k = Math.abs(Math.sin(p * Math.PI * 2));
      pivot.position.y += k * .9;
      armL.rotation.set(0, 0, 2.6 * k); armR.rotation.set(0, 0, -2.6 * k);
      legs[0].rotation.z = -.45 * k; legs[1].rotation.z = .45 * k;
      if (p > .48) once('s1', () => fx.sparkles(feet(), 10)); if (p > .97) once('s2', () => fx.sparkles(feet(), 10));
    }
    if (name === 'dabke') {
      const beat = p * 8, ph = beat % 1, which = Math.floor(beat) % 2;
      pivot.position.y += .07 * Math.abs(Math.sin(beat * Math.PI));
      legs[which].rotation.x = -.7 * Math.sin(ph * Math.PI);
      legs[1 - which].rotation.x = 0;
      armL.rotation.set(-.2, 0, 1.15 + .12 * Math.sin(beat * Math.PI)); armR.rotation.set(-.2, 0, -1.15 - .12 * Math.sin(beat * Math.PI));
      pivot.rotation.z = .07 * Math.sin(beat * Math.PI / 2);
      for (let i = 1; i < 8; i += 2) if (beat > i + .5) once('d' + i, () => { fx.dust(feet(), 6); shakeUntil = performance.now() + 90; });
    }
    if (name === 'kid') { // قفزة البطل: قفزة عالية بدورتين ونجوم عند الهبوط
      pivot.position.y += 1.7 * Math.sin(p * Math.PI);
      pivot.rotation.y = Math.PI * 4 * ease(p);
      armL.rotation.set(0, 0, 2.7 * bump(0, 1)); armR.rotation.set(0, 0, -2.7 * bump(0, 1));
      once('k0', () => fx.sparkles(feet(), 12)); if (p > .95) once('k1', () => { fx.sparkles(feet(), 24); fx.wave(feet()); });
    }
    if (name === 'cat') { // شقلبة خلفية
      pivot.position.y += 1.2 * Math.sin(p * Math.PI);
      pivot.rotation.x = -Math.PI * 2 * ease(Math.min(1, p * 1.1));
      if (p > .95) once('c1', () => fx.sparkles(feet(), 14));
    }
    if (name === 'bunny') { // ثلاث قفزات تتعالى
      const seg = [[0, .3, .55], [.3, .62, .9], [.62, 1, 1.45]];
      seg.forEach(([a, b, h], i) => { if (p >= a && p < b) pivot.position.y += h * Math.sin((p - a) / (b - a) * Math.PI); if (p > b - .02) once('b' + i, () => fx.dust(feet(), 8)); });
      if (parts.ears) parts.ears.forEach(e => { e.rotation.x = (e.userData.rx ?? 0) - .5 * Math.sin(p * Math.PI * 6); });
    }
    if (name === 'panda') { // دحرجة
      pivot.position.y += .35 * Math.sin(p * Math.PI);
      pivot.rotation.x = Math.PI * 2 * ease(p);
      if (p > .9) once('p1', () => fx.dust(feet(), 10));
    }
    if (name === 'fox') { // دوامة
      pivot.rotation.y = Math.PI * 6 * ease(p);
      pivot.position.y += .45 * Math.sin(p * Math.PI);
      if (Math.floor(p * 12) !== Math.floor((p - .03) * 12)) fx.sparkles(new T.Vector3(0, 1.6, 0).applyMatrix4(root.matrixWorld), 3, ['#FF9F43', '#FFD24A']);
    }
    if (name === 'lion') { // زئير: انحناء، ثم رأس للخلف وموجة ذهبية
      if (p < .25) pivot.rotation.x = .18 * ease(p / .25);
      else { const k = p < .8 ? 1 : 1 - ease((p - .8) / .2); pivot.rotation.x = -.28 * k; parts.head.rotation.x = -.25 * k; armL.rotation.set(0, 0, 1.3 * k); armR.rotation.set(0, 0, -1.3 * k); }
      if (p > .27) once('l1', () => { fx.wave(feet(), '#FFC94A'); shakeUntil = performance.now() + 450; });
      if (p > .45) once('l2', () => fx.wave(feet(), '#FF9F43'));
    }
    if (name === 'dino') { // خطوة العملاق: قفزة ثقيلة وارتطام
      if (p < .55) { pivot.position.y += 1.05 * Math.sin(p / .55 * Math.PI); legs[0].rotation.x = -.5 * Math.sin(p / .55 * Math.PI); }
      if (p > .55) once('d1', () => { fx.dust(feet(), 14); fx.wave(feet(), '#E9D7B8'); shakeUntil = performance.now() + 380; });
    }
    if (name === 'robot') { // صاروخ: لهب تحت القدمين، طيران ثم هبوط
      const up = p < .3 ? ease(p / .3) : p < .72 ? 1 : 1 - ease((p - .72) / .28);
      pivot.position.y += 2.1 * up + (up > .9 ? .1 * Math.sin(t * 6) : 0);
      armL.rotation.set(0, 0, .5 * up); armR.rotation.set(0, 0, -.5 * up);
      if (p < .9 && Math.random() < .7) {
        const at = new T.Vector3(0, pivot.position.y - PIV + .05, 0).applyMatrix4(root.matrixWorld);
        fx.sparkles(at, 1, ['#FF7A1A', '#FFD24A', '#FF4D4D']);
      }
      if (p > .98) once('r1', () => fx.dust(feet(), 10));
    }
  }

  /* لا نرسم إلا والبطل ظاهر والصفحة مفتوحة — توفيراً للبطارية */
  let visible = true, running = false;
  const sync = () => {
    const want = visible && !document.hidden;
    if (want !== running) { running = want; last = performance.now(); renderer.setAnimationLoop(want ? frame : null); }
  };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
  io.observe(canvas);
  const ro = new ResizeObserver(() => { resize(); if (!running) renderer.render(scene, camera); });
  ro.observe(canvas);
  document.addEventListener('visibilitychange', sync);
  resize();
  sync();

  /* لقطات الوجه والكتفين: كاميرا ثابتة أمام البطل بلا منصة ولا عالم؛ كل «لقطة» تُجهّز المشهد ثم تُرسم */
  function portraitShots(size, withBg, shots, done) {
    const cam = new T.PerspectiveCamera(30, 1, .1, 60);
    cam.position.set(0, 2.42, 5.0); cam.lookAt(0, 2.32, 0);
    const saved = { ry: root.rotation.y, py: root.position.y, pr: renderer.getPixelRatio(), size: renderer.getSize(new T.Vector2()), bg: scene.background };
    const hide = [podium, extras?.group, world?.group, fx.group].filter(Boolean);
    hide.forEach(o => { o.visible = false; });
    scene.background = null;
    root.rotation.y = .3; root.position.y = 0; pivot.position.y = PIV; pivot.rotation.set(0, 0, 0);
    renderer.setPixelRatio(1); renderer.setSize(size, size, false);
    const urls = [];
    try {
      for (const prepare of shots) {
        prepare();
        renderer.render(scene, cam);
        const out = document.createElement('canvas'); out.width = out.height = size;
        const x = out.getContext('2d');
        if (withBg) {
          const grad = x.createRadialGradient(size / 2, size * .35, size * .05, size / 2, size / 2, size * .75);
          grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(.55, '#EEF0FF'); grad.addColorStop(1, '#DCD3FF');
          x.fillStyle = grad; x.fillRect(0, 0, size, size);
        }
        x.drawImage(canvas, 0, 0, size, size);
        const webp = out.toDataURL('image/webp', .85);
        urls.push(webp.startsWith('data:image/webp') ? webp : out.toDataURL('image/png'));
      }
    } finally {
      done?.();
      hide.forEach(o => { o.visible = true; });
      scene.background = saved.bg;
      root.rotation.y = saved.ry; root.position.y = saved.py;
      renderer.setPixelRatio(saved.pr); renderer.setSize(saved.size.x, saved.size.y, false);
      renderer.render(scene, camera);
    }
    return urls;
  }

  /* اللمس والسحب */
  const jump = () => { celebrate = performance.now(); happyUntil = performance.now() + 1100; };
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
    if (moved < 6) { if (!act) jump(); onTap?.(); }
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
    /* تحية الشخصية حين تُختار */
    wave() { play('wave'); },
    /* حركة من EMOTES (تحية، تصفيق، قفزة النجمة، الدبكة) */
    emote(id) { play(id); },
    /* الحركة الخاصة بالشخصية الحالية */
    special() { play(charOf(current).id); },
    setLevel,
    /* تقدّم البيضة (عدد الدروس المنجزة من 3) */
    /* تقدّم البيضة من 0 إلى 1 (نجوم التعلّم منذ وضعها ÷ الهدف) */
    eggProgress(frac) { setEggRing(frac); },
    /* الحروف التي أتقنها الطالب (فهارس 0..27) — تظهر في «هالة الحروف» */
    setLetters(list) { letters = Array.isArray(list) ? list : []; if (current.aura === 'letters') rebuild(); },
    /* فقس البيضة: اهتزاز ثم شرر ثم يُستدعى cb ليُلبس الطفل رفيقه الجديد */
    hatch(cb) { if (!extras?.egg) return; onHatched = cb; hatchAt = performance.now(); },
    /* صورة مصغّرة للوجه والكتفين (للأيقونة الصغيرة في اللوحة) — data URL أو null */
    snapshot(size = 160) {
      try { return portraitShots(size, true, [() => {}])[0]; } catch { return null; }
    },
    /* صور كل الشخصيات بملابس البطل الحالية (لبلاطات «شخصيتي») ← { id: dataURL } */
    portraits(base, size = 128) {
      let tmp = null;
      try {
        const shots = CHARACTERS.map(c => () => {
          if (tmp) { root.remove(tmp); disposeTree(tmp); }
          tmp = buildAvatar(normalizeLook({ ...base, char: c.id, skin: c.firstColor ?? 0 }), TEX).group;
          root.add(tmp);
        });
        avatar.visible = false;
        const urls = portraitShots(size, false, shots, () => { if (tmp) { root.remove(tmp); disposeTree(tmp); } avatar.visible = true; });
        return Object.fromEntries(CHARACTERS.map((c, i) => [c.id, urls[i]]));
      } catch { avatar.visible = true; return {}; }
    },
    /* «صورة البطل»: لقطة كاملة لعالمه بإطار واسم — لحفظها أو إرسالها للعائلة */
    poster({ title = 'بَطَلُ أَكَادِيمِيَّةِ عَارِمٍ', name = '' } = {}) {
      const W = 720, H = 960, saved = { pr: renderer.getPixelRatio(), size: renderer.getSize(new T.Vector2()), aspect: camera.aspect, fov: camera.fov };
      // البطل خارج الشاشة ← الرسم متوقف والمشهد قديم (مركبة على الأرض مثلاً): نحدّثه مرة قبل الالتقاط
      if (!running) { camLift = extras?.mount ? .5 : 0; last = performance.now(); frame(last); }
      try {
        renderer.setPixelRatio(1); renderer.setSize(W, H, false);
        camera.aspect = W / H; camera.fov = 34; camera.updateProjectionMatrix();
        // الصورة دائماً بوجه البطل (ربع التفاتة) حتى لو كان يُري ظهره أو أداره الطفل
        const ry = root.rotation.y; root.rotation.y = .3;
        fx.group.visible = false;
        renderer.render(scene, camera);
        fx.group.visible = true; root.rotation.y = ry;
        const out = document.createElement('canvas'); out.width = W; out.height = H + 150; const x = out.getContext('2d');
        x.fillStyle = '#FFF6E7'; x.fillRect(0, 0, W, H + 150);
        if (!scene.background) { const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#E7F1FF'); gr.addColorStop(1, '#DCD3FF'); x.fillStyle = gr; x.fillRect(24, 24, W - 48, H - 48); }
        x.save(); x.beginPath(); x.roundRect(24, 24, W - 48, H - 48, 36); x.clip(); x.drawImage(canvas, 0, 0, W, H); x.restore();
        x.lineWidth = 10; x.strokeStyle = '#E8B84B'; x.beginPath(); x.roundRect(24, 24, W - 48, H - 48, 36); x.stroke();
        const ui = cssFont('--font-cairo', 'Cairo, sans-serif'), story = cssFont('--font-naskh', '"Noto Naskh Arabic", serif');
        x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#1A2B4A';
        x.font = `900 46px ${ui}`; x.fillText(`⭐ ${title} ⭐`, W / 2, H + 52);
        x.fillStyle = '#7C5CD9'; x.font = `700 40px ${story}`; x.fillText(name, W / 2, H + 115);
        return out.toDataURL('image/png');
      } catch { return null; } finally {
        camera.aspect = saved.aspect; camera.fov = saved.fov; camera.updateProjectionMatrix();
        renderer.setPixelRatio(saved.pr); renderer.setSize(saved.size.x, saved.size.y, false);
        renderer.render(scene, camera);
      }
    },
    dispose() {
      renderer.setAnimationLoop(null);
      io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      fx.clear();
      disposeTree(scene);
      world?.sky?.dispose();
      Object.values(TEX).forEach(t => t.dispose());
      petTex?.dispose(); envRT.dispose(); pmrem.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch { /* المتصفح حرّر السياق مسبقاً */ }
    },
  };
}
