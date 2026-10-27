import * as T from 'three';

// Independent preview renderer: never reads or writes student ownership or points.
const PALETTE = { rashid: '#E9B98E', mona: '#EBC5A7', finn: '#EB9446', faheem: '#A697D5' };
export function createPreviewStage(canvas, initial = {}) {
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, .1, 50);
  camera.position.set(0, 1.8, 7.2); camera.lookAt(0, 1.5, 0);
  scene.add(new T.HemisphereLight('#fff9ed', '#7282a4', 2.5));
  const key = new T.DirectionalLight('#ffffff', 3); key.position.set(3, 5, 4); scene.add(key);
  const rim = new T.DirectionalLight('#d9ceff', 2); rim.position.set(-4, 3, -3); scene.add(rim);
  const pivot = new T.Group(); scene.add(pivot);
  let model, head, arms = [], legs = [], action = '', started = 0, yaw = 0;
  let opts = {}, frame = 0, disposed = false, last = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function clearModel() {
    if (!model) return;
    pivot.remove(model);
    const materials = new Set();
    model.traverse(n => { n.geometry?.dispose(); if (n.material) materials.add(n.material); });
    materials.forEach(m => m.dispose());
  }
  function build(next) {
    opts = { hero: 'rashid', outfit: 'daily', ...next };
    clearModel(); model = new T.Group(); pivot.add(model); arms = []; legs = [];
    const id = opts.hero, animal = id === 'finn' || id === 'faheem', girl = id === 'mona';
    const skin = new T.MeshStandardMaterial({ color: PALETTE[id] || PALETTE.rashid, roughness: .48 });
    const cream = new T.MeshStandardMaterial({ color: '#FFF4E2', roughness: .6 });
    const hair = new T.MeshStandardMaterial({ color: '#402B29', roughness: .75 });
    const dark = new T.MeshStandardMaterial({ color: '#1A2B4A', roughness: .45 });
    const shirt = new T.MeshStandardMaterial({ color: opts.outfit === 'explorer' ? '#4F9D9C' : girl ? '#E789AD' : id === 'faheem' ? '#7C5CD9' : '#E8B84B', roughness: .65 });
    const white = new T.MeshStandardMaterial({ color: '#FFFFFF', roughness: .2 });
    const eyeMat = new T.MeshStandardMaterial({ color: '#211F36', roughness: .15 });
    const pink = new T.MeshStandardMaterial({ color: '#EFA6AC', roughness: .7 });
    const sphere = (parent, mat, x, y, z, sx, sy = sx, sz = sx) => {
      const m = new T.Mesh(new T.SphereGeometry(1, 28, 20), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); parent.add(m); return m;
    };
    sphere(model, shirt, 0, 1.15, 0, .43, .56, .3);
    sphere(model, cream, 0, 1.29, .29, .13, .14, .03);
    for (const sign of [-1, 1]) {
      const leg = new T.Group(); leg.position.set(sign * .21, .78, 0); model.add(leg); legs.push(leg);
      sphere(leg, dark, 0, -.24, 0, .17, .32, .18);
      sphere(leg, cream, 0, -.55, .1, .2, .13, .3);
      const arm = new T.Group(); arm.position.set(sign * .43, 1.49, 0); model.add(arm); arms.push(arm);
      sphere(arm, shirt, sign * .06, -.14, 0, .17, .28, .18);
      sphere(arm, skin, sign * .1, -.43, .01, .14, .19, .14);
    }
    head = new T.Group(); head.position.y = 2.05; model.add(head);
    sphere(head, skin, 0, 0, 0, animal ? .65 : .57, .64, .5);
    if (!animal) {
      for (const sign of [-1, 1]) sphere(head, skin, sign * .56, -.02, 0, .13, .19, .12);
      sphere(head, hair, 0, .42, -.04, .59, .3, .48);
      for (let i = 0; i < 5; i++) sphere(head, hair, -.4 + i * .17, .39 + Math.sin(i) * .05, .34, .18, .19, .12);
      if (girl) for (const sign of [-1, 1]) {
        sphere(head, hair, sign * .5, -.29, -.12, .18, .49, .2);
        sphere(head, pink, sign * .53, -.03, .02, .15, .08, .18);
      }
      sphere(head, skin, 0, -.1, .48, .09, .11, .09);
    } else if (id === 'finn') {
      for (const sign of [-1, 1]) {
        const ear = new T.Mesh(new T.ConeGeometry(.25, .6, 3), skin); ear.position.set(sign * .43, .54, -.02); ear.rotation.z = -sign * .18; head.add(ear);
        sphere(head, cream, sign * .27, -.2, .38, .31, .25, .16);
      }
      sphere(head, dark, 0, -.12, .57, .12, .08, .07);
      const tail = sphere(model, skin, .42, .95, -.4, .25, .5, .23); tail.rotation.z = -.6;
      sphere(model, cream, .68, 1.31, -.42, .17, .21, .19);
    } else {
      for (const sign of [-1, 1]) {
        sphere(head, skin, sign * .69, .01, -.03, .35, .47, .13);
        sphere(head, pink, sign * .72, 0, .09, .23, .33, .04);
      }
      const trunk = new T.CatmullRomCurve3([new T.Vector3(0, -.08, .47), new T.Vector3(0, -.4, .66), new T.Vector3(0, -.65, .7), new T.Vector3(.16, -.66, .78)]);
      head.add(new T.Mesh(new T.TubeGeometry(trunk, 24, .115, 14, false), skin));
    }
    for (const sign of [-1, 1]) {
      sphere(head, white, sign * .23, .035, .45, .16, .19, .065);
      sphere(head, eyeMat, sign * .23, .03, .507, .1, .13, .04);
      sphere(head, white, sign * .23 + .03, .085, .54, .033);
      sphere(head, pink, sign * .36, -.18, .423, .1, .048, .02);
    }
    const smile = new T.Mesh(new T.TorusGeometry(.13, .018, 8, 24, Math.PI), dark);
    smile.rotation.z = Math.PI; smile.position.set(0, -.23, .49); if (id !== 'faheem') head.add(smile); else smile.geometry.dispose();
    if (opts.outfit === 'explorer') {
      const brim = new T.Mesh(new T.CylinderGeometry(.73, .73, .065, 40), cream); brim.position.y = .52; head.add(brim);
      sphere(head, cream, 0, .62, 0, .49, .25, .43);
      sphere(model, dark, 0, 1.3, -.34, .35, .42, .17);
      for (const sign of [-1, 1]) sphere(model, cream, sign * .29, 1.26, .28, .055, .35, .035);
    }
    action = ''; model.position.set(0, 0, 0);
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  let pointer = null;
  const down = e => { pointer = { id: e.pointerId, x: e.clientX, start: yaw }; canvas.setPointerCapture?.(e.pointerId); };
  const move = e => { if (pointer?.id === e.pointerId) yaw = pointer.start + (e.clientX - pointer.x) * .012; };
  const up = () => { pointer = null; };
  const lost = e => { e.preventDefault(); opts.onFailure?.(); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('webglcontextlost', lost);
  function render(now) {
    if (disposed) return;
    frame = requestAnimationFrame(render);
    if (document.hidden || now - last < 30) return;
    last = now;
    const t = now / 1000, elapsed = (now - started) / 1000;
    const active = !reduced.matches && elapsed < 2.5 ? action : '';
    pivot.rotation.y = yaw;
    model.position.y = !reduced.matches ? Math.sin(t * 2) * .018 : 0;
    model.position.x = 0; head.rotation.z = !reduced.matches ? Math.sin(t * 1.5) * .025 : 0;
    arms.forEach((a, i) => { a.rotation.set(0, 0, i ? -.1 : .1); }); legs.forEach(l => l.rotation.set(0, 0, 0));
    if (active === 'hello') arms[0].rotation.z = -2.35 + Math.sin(elapsed * 12) * .3;
    if (active === 'celebrate') {
      model.position.y += Math.abs(Math.sin(elapsed * 7)) * .22;
      arms[0].rotation.z = -2.4; arms[1].rotation.z = 2.4;
    }
    if (active === 'walk') {
      legs.forEach((l, i) => { l.rotation.x = Math.sin(elapsed * 9 + i * Math.PI) * .55; });
      arms.forEach((a, i) => { a.rotation.x = -Math.sin(elapsed * 9 + i * Math.PI) * .45; });
      model.position.y += Math.abs(Math.sin(elapsed * 9)) * .045;
    }
    renderer.render(scene, camera);
  }
  build(initial); resize(); frame = requestAnimationFrame(render);
  return {
    update: build,
    play(kind) { action = kind; started = performance.now(); },
    rotate(delta) { yaw += delta; },
    reset() { yaw = 0; action = ''; },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); ro.disconnect(); clearModel();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('webglcontextlost', lost);
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
