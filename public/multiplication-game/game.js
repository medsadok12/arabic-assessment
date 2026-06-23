/* ============================================================
   آيات — تطبيق الحساب
   عمليات (ضرب، قسمة، جمع، طرح) + أكمل النمط + الأحاجي
   نظام نقاط ومستوى موحّد يغذّيه كل النشاطات.
   تطبيق مستقل بلا تبعيات، يعمل أوفلاين. أرقام لاتينية، المدى 1..10.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- ثوابت ---------- */
  var MIN = 1, MAX = 10;
  var ADVENTURE_LEN = 10, SMART_LEN = 15, TIME_SECONDS = 60, PATTERN_LEN = 12, PUZZLE_LEN = 10;
  var XP_PER_LEVEL = 100;
  var STORE_KEY = 'batal_alhisab_v1';

  var OPS = {
    mul: { name: 'الضرب',  icon: '✖️', sym: '×', color: '#6d28d9',
           order: [1, 10, 2, 5, 3, 4, 6, 7, 8, 9],
           fact: function (n, k) { return { a: n, b: k, answer: n * k, text: n + ' × ' + k }; } },
    div: { name: 'القسمة', icon: '➗', sym: '÷', color: '#0d9488',
           order: [1, 2, 5, 10, 3, 4, 6, 7, 8, 9],
           fact: function (n, k) { return { a: n * k, b: n, answer: k, text: (n * k) + ' ÷ ' + n }; } },
    add: { name: 'الجمع',  icon: '➕', sym: '+', color: '#2563eb',
           order: [1, 2, 10, 5, 3, 4, 6, 7, 8, 9],
           fact: function (n, k) { return { a: n, b: k, answer: n + k, text: n + ' + ' + k }; } },
    sub: { name: 'الطرح',  icon: '➖', sym: '−', color: '#ea580c',
           order: [1, 2, 10, 5, 3, 4, 6, 7, 8, 9],
           fact: function (n, k) { return { a: n + k, b: n, answer: k, text: (n + k) + ' − ' + n }; } }
  };
  var OP_LIST = ['mul', 'div', 'add', 'sub'];
  var THEME = { pattern: '#db2777', puzzle: '#4f46e5', magic: '#d97706' };

  /* الأحجية السحرية: صورة مخفية تُكشَف بالنقاط (كل 20 نقطة = قطعة، 30 قطعة = صورة) */
  var POINTS_PER_PIECE = 20, PIECES_PER_PIC = 30;
  var PICTURES = [
    { emoji: '🦁', name: 'الأسد الشجاع',  bg: 'linear-gradient(135deg,#fbbf24,#d97706)' },
    { emoji: '🐘', name: 'الفيل اللطيف',  bg: 'linear-gradient(135deg,#93c5fd,#2563eb)' },
    { emoji: '🦒', name: 'الزرافة المرحة', bg: 'linear-gradient(135deg,#fde047,#f59e0b)' },
    { emoji: '🚀', name: 'الصاروخ المنطلق', bg: 'linear-gradient(135deg,#a5b4fc,#4338ca)' },
    { emoji: '🐳', name: 'الحوت الأزرق',  bg: 'linear-gradient(135deg,#67e8f9,#0891b2)' },
    { emoji: '🦄', name: 'وحيد القرن',    bg: 'linear-gradient(135deg,#f9a8d4,#db2777)' },
    { emoji: '🌈', name: 'قوس قزح',       bg: 'linear-gradient(135deg,#6ee7b7,#10b981)' },
    { emoji: '🏰', name: 'القلعة العجيبة', bg: 'linear-gradient(135deg,#c4b5fd,#7c3aed)' },
    { emoji: '🐢', name: 'السلحفاة',      bg: 'linear-gradient(135deg,#86efac,#16a34a)' },
    { emoji: '🦋', name: 'الفراشة',       bg: 'linear-gradient(135deg,#d8b4fe,#9333ea)' }
  ];
  var COVER_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4'];
  // ترتيب كشف القطع (خلط ثابت ليبدو متناثراً وجميلاً)
  var RANK = (function () {
    var seed = 1337; function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; }
    var order = []; for (var i = 0; i < PIECES_PER_PIC; i++) order.push(i);
    for (var a = order.length - 1; a > 0; a--) { var j = Math.floor(rnd() * (a + 1)), t = order[a]; order[a] = order[j]; order[j] = t; }
    var rank = []; for (var k = 0; k < order.length; k++) rank[order[k]] = k; return rank;
  })();

  /* ---------- التخزين ---------- */
  function freshActivity() { return { stars: 0, best: 0, plays: 0, bestLevel: 1, seen: 0, correct: 0 }; }
  function freshProgress() {
    var p = { ops: {}, patterns: freshActivity(), puzzles: freshActivity(), xp: 0, streak: { count: 0, last: '' }, stats: { bestTime: {}, sessions: 0 }, settings: { sound: true } };
    OP_LIST.forEach(function (o) { p.ops[o] = { facts: {}, worlds: {} }; p.stats.bestTime[o] = 0; });
    return p;
  }

  var progress = load();

  function load() {
    var base = freshProgress();
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p.ops) OP_LIST.forEach(function (o) { base.ops[o] = { facts: (p.ops[o] && p.ops[o].facts) || {}, worlds: (p.ops[o] && p.ops[o].worlds) || {} }; });
        if (p.patterns) base.patterns = Object.assign(base.patterns, p.patterns);
        if (p.puzzles) base.puzzles = Object.assign(base.puzzles, p.puzzles);
        base.xp = p.xp || 0;
        if (p.streak) base.streak = Object.assign(base.streak, p.streak);
        if (p.stats) { base.stats.sessions = p.stats.sessions || 0; OP_LIST.forEach(function (o) { base.stats.bestTime[o] = (p.stats.bestTime && p.stats.bestTime[o]) || 0; }); }
        if (p.settings) base.settings = Object.assign(base.settings, p.settings);
      } else {
        var oldRaw = localStorage.getItem('batal_aldarb_v1');
        if (oldRaw) {
          var old = JSON.parse(oldRaw);
          if (old.facts) base.ops.mul.facts = old.facts;
          if (old.worlds) base.ops.mul.worlds = old.worlds;
          if (old.stats && old.stats.bestTime) base.stats.bestTime.mul = old.stats.bestTime;
          if (old.settings) base.settings = Object.assign(base.settings, old.settings);
        }
      }
    } catch (e) {}
    return base;
  }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) {} }

  /* ---------- النقاط والمستوى (موحّد لكل النشاطات) ---------- */
  function awardPoints(pts) { var b = playerLevel(); progress.xp = (progress.xp || 0) + pts; save(); return playerLevel() > b; }
  function playerLevel() { return 1 + Math.floor((progress.xp || 0) / XP_PER_LEVEL); }
  function levelProgress() { return (progress.xp || 0) % XP_PER_LEVEL; }
  function levelTitle(l) { return l >= 12 ? 'أسطورة 🌟' : l >= 9 ? 'عبقري 🧠' : l >= 7 ? 'خبير 🎓' : l >= 5 ? 'بطل 🦸' : l >= 3 ? 'ماهر ✨' : 'مبتدئ 🌱'; }

  /* ---------- السلسلة اليومية ---------- */
  function todayStr() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function updateStreak() {
    var s = progress.streak || { count: 0, last: '' }, today = todayStr();
    if (s.last === today) { progress.streak = s; return { newDay: false, count: s.count }; }
    var y = new Date(); y.setDate(y.getDate() - 1);
    var yStr = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    s.count = (s.last === yStr) ? (s.count || 0) + 1 : 1;
    s.last = today; progress.streak = s; save();
    return { newDay: true, count: s.count };
  }

  /* ---------- الأحجية السحرية ---------- */
  function magicState() {
    var xp = progress.xp || 0, totalPieces = Math.floor(xp / POINTS_PER_PIECE);
    var picIndex = Math.floor(totalPieces / PIECES_PER_PIC), revealed = totalPieces - picIndex * PIECES_PER_PIC;
    return { xp: xp, revealed: revealed, completed: picIndex, pic: PICTURES[picIndex % PICTURES.length] };
  }
  function renderMagic() {
    var st = magicState(), pct = Math.round(st.revealed / PIECES_PER_PIC * 100);
    var nextPts = POINTS_PER_PIECE - ((progress.xp || 0) % POINTS_PER_PIECE);
    var cells = '';
    for (var i = 0; i < PIECES_PER_PIC; i++) {
      var rev = RANK[i] < st.revealed;
      cells += '<span class="cover' + (rev ? ' revealed' : '') + '"' + (rev ? '' : ' style="background:' + COVER_COLORS[i % COVER_COLORS.length] + '"') + '>' + (rev ? '' : '⭐') + '</span>';
    }
    $('magic-card').innerHTML =
      '<div class="magic-head"><div class="mh-name">' + st.pic.emoji + ' ' + st.pic.name + '</div><div class="mh-pts">' + (progress.xp || 0) + ' نقطة ⭐</div></div>' +
      '<div class="magic-prog"><span>اكتمال الصورة</span><span>' + st.revealed + '/' + PIECES_PER_PIC + ' قطعة — ' + pct + '%</span></div>' +
      '<div class="mp-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="magic-pic" style="background:' + st.pic.bg + '"><div class="magic-emoji">' + st.pic.emoji + '</div><div class="magic-grid">' + cells + '</div></div>' +
      '<div class="magic-foot">' + (st.completed > 0 ? ('🏆 صور مكتملة: ' + st.completed + ' · ') : '') + 'اربح ' + nextPts + ' نقطة لكشف القطعة التالية — العب أي لعبة!</div>';
  }

  /* ---------- تنبيه منزلق (toast) ---------- */
  function toast(html) {
    var t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 3600);
  }

  /* ---------- الحقائق + التكرار المتباعد (Leitner) ---------- */
  function key(n, k) { return n + '_' + k; }
  function getFact(op, n, k) { return progress.ops[op].facts[key(n, k)] || { box: 0, seen: 0, correct: 0, wrong: 0, lastSeen: 0, bestMs: 0 }; }
  function updateFact(op, n, k, correct, ms) {
    var f = getFact(op, n, k);
    f.seen++;
    if (correct) { f.correct++; f.box = Math.min(5, f.box + 1); if (ms) f.bestMs = f.bestMs ? Math.min(f.bestMs, ms) : ms; }
    else { f.wrong++; f.box = Math.max(0, f.box - 2); }
    f.lastSeen = Date.now();
    progress.ops[op].facts[key(n, k)] = f; save();
  }

  function worldFacts(n) { var a = []; for (var k = MIN; k <= MAX; k++) a.push({ n: n, k: k }); return a; }
  function completedCount(op) { var c = 0, w = progress.ops[op].worlds; for (var x in w) if (w[x] && w[x].stars >= 1) c++; return c; }
  function unlockedWorlds(op) { return OPS[op].order.slice(0, Math.min(MAX, completedCount(op) + 1)); }
  function isWorldUnlocked(op, n) { return unlockedWorlds(op).indexOf(n) !== -1; }
  function unlockedPool(op) { var pool = []; unlockedWorlds(op).forEach(function (n) { pool = pool.concat(worldFacts(n)); }); return pool; }

  function pickSmartFact(op, pool, avoid) {
    var weights = [], total = 0;
    pool.forEach(function (f) { var w = (6 - getFact(op, f.n, f.k).box); w = w * w + 1; if (pool.length > 1 && key(f.n, f.k) === avoid) w = 0; weights.push(w); total += w; });
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function masteredCount(op) { var c = 0, f = progress.ops[op].facts; for (var x in f) if (f[x].box >= 4) c++; return c; }
  function totalStars(op) { var s = 0, w = progress.ops[op].worlds; for (var x in w) s += (w[x].stars || 0); return s; }

  /* ---------- توليد الأنماط ---------- */
  function rand(m) { return Math.floor(Math.random() * m); }
  function genPattern(level) {
    var rules;
    if (level <= 1)      rules = [{ t: '+', s: 1 }, { t: '+', s: 2 }, { t: '+', s: 5 }, { t: '+', s: 10 }];
    else if (level === 2) rules = [{ t: '+', s: 2 }, { t: '+', s: 3 }, { t: '+', s: 5 }, { t: '+', s: 10 }, { t: '-', s: 1 }];
    else if (level === 3) rules = [{ t: '+', s: 3 }, { t: '+', s: 4 }, { t: '+', s: 6 }, { t: '-', s: 2 }, { t: '-', s: 3 }];
    else if (level === 4) rules = [{ t: '+', s: 7 }, { t: '+', s: 9 }, { t: '-', s: 4 }, { t: '-', s: 5 }, { t: 'x', s: 2 }];
    else                  rules = [{ t: 'x', s: 2 }, { t: 'x', s: 3 }, { t: '+', s: 11 }, { t: '-', s: 6 }, { t: '+', s: 12 }];
    var rule = rules[rand(rules.length)], n = 5, seq = [], i, start;
    if (rule.t === 'x') { start = rule.s === 2 ? (2 + rand(4)) : (1 + rand(3)); seq[0] = start; for (i = 1; i < n; i++) seq[i] = seq[i - 1] * rule.s; }
    else if (rule.t === '+') { start = 1 + rand(9); seq[0] = start; for (i = 1; i < n; i++) seq[i] = seq[i - 1] + rule.s; }
    else { start = rule.s * n + rand(6); seq[0] = start; for (i = 1; i < n; i++) seq[i] = seq[i - 1] - rule.s; }
    var blankIdx = n - 1;
    if (level >= 3 && Math.random() < 0.3) blankIdx = 1 + rand(n - 2);
    var rt = rule.t === '+' ? ('القاعدة: نزيد ' + rule.s + ' في كل مرة') : rule.t === '-' ? ('القاعدة: ننقص ' + rule.s + ' في كل مرة') : ('القاعدة: نضرب في ' + rule.s + ' في كل مرة');
    return { seq: seq, blankIdx: blankIdx, answer: seq[blankIdx], ruleText: rt };
  }

  /* ---------- توليد الأحاجي ---------- */
  function genPuzzle(level) {
    var types;
    if (level <= 1)      types = ['miss+', 'miss-'];
    else if (level === 2) types = ['miss+', 'miss-', 'missx'];
    else if (level === 3) types = ['missx', 'missd', 'miss-'];
    else if (level === 4) types = ['riddle+', 'riddle-', 'ridmul'];
    else                  types = ['ridmul', 'riddiv', 'missd', 'missx'];
    var ty = types[rand(types.length)], a, b, x, M, display, hint, ltr = true, answer;
    if (ty === 'miss+') {
      x = 1 + rand(9); a = 1 + rand(9); b = x + a; answer = x;
      display = rand(2) ? ('{ANS} + ' + a + ' = ' + b) : (a + ' + {ANS} = ' + b); hint = 'اطرح: ' + b + ' − ' + a;
    } else if (ty === 'miss-') {
      if (rand(2)) { a = 1 + rand(9); b = 1 + rand(9); answer = a + b; display = '{ANS} − ' + a + ' = ' + b; hint = 'اجمع: ' + a + ' + ' + b; }
      else { M = 3 + rand(7); b = rand(M); answer = M - b; display = M + ' − {ANS} = ' + b; hint = 'اطرح: ' + M + ' − ' + b; }
    } else if (ty === 'missx') {
      x = 2 + rand(8); a = 2 + rand(8); b = x * a; answer = x;
      display = rand(2) ? ('{ANS} × ' + a + ' = ' + b) : (a + ' × {ANS} = ' + b); hint = 'اقسم: ' + b + ' ÷ ' + a;
    } else if (ty === 'missd') {
      if (rand(2)) { a = 2 + rand(8); b = 2 + rand(5); answer = a * b; display = '{ANS} ÷ ' + a + ' = ' + b; hint = 'اضرب: ' + a + ' × ' + b; }
      else { b = 2 + rand(5); x = 2 + rand(8); a = b * x; answer = x; display = a + ' ÷ {ANS} = ' + b; hint = 'اقسم: ' + a + ' ÷ ' + b; }
    } else if (ty === 'riddle+') {
      a = 2 + rand(8); x = 2 + rand(9); b = x + a; answer = x; ltr = false;
      display = 'أنا عددٌ، إذا أضفتَ إليّ ' + a + ' أصير ' + b + '. مَن أنا؟<br>إجابتي: {ANS}'; hint = 'اطرح: ' + b + ' − ' + a;
    } else if (ty === 'riddle-') {
      x = 3 + rand(8); a = 1 + rand(x - 1); b = x - a; answer = x; ltr = false;
      display = 'أنا عددٌ، إذا طرحتَ منّي ' + a + ' أبقى ' + b + '. مَن أنا؟<br>إجابتي: {ANS}'; hint = 'اجمع: ' + a + ' + ' + b;
    } else if (ty === 'ridmul') {
      a = 2 + rand(5); x = 2 + rand(8); b = x * a; answer = x; ltr = false;
      display = 'أنا عددٌ، إذا ضربتَني في ' + a + ' أصير ' + b + '. مَن أنا؟<br>إجابتي: {ANS}'; hint = 'اقسم: ' + b + ' ÷ ' + a;
    } else {
      a = 2 + rand(5); x = 2 + rand(8); b = x * a; answer = x; ltr = false;
      display = 'أنا عددٌ، إذا قسمتَ ' + b + ' عليّ أصير ' + a + '. مَن أنا؟<br>إجابتي: {ANS}'; hint = 'اقسم: ' + b + ' ÷ ' + a;
    }
    return { display: display, answer: answer, hint: '💡 ' + hint, ltr: ltr };
  }

  /* ---------- الأصوات (Web Audio، بلا ملفات) ---------- */
  var actx = null;
  function ac() { if (!progress.settings.sound) return null; try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } if (actx.state === 'suspended') actx.resume(); return actx; }
  function tone(freq, start, dur, type, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var sfx = {
    tap: function () { tone(420, 0, 0.06, 'square', 0.05); },
    correct: function () { tone(660, 0, 0.12, 'sine', 0.16); tone(990, 0.1, 0.16, 'sine', 0.16); },
    wrong: function () { tone(200, 0, 0.22, 'sine', 0.14); },
    streak: function () { tone(880, 0, 0.08, 'triangle', 0.14); tone(1320, 0.08, 0.12, 'triangle', 0.14); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.12, 0.18, 'triangle', 0.16); }); }
  };

  /* ---------- أدوات ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function shuffle(arr) { arr = arr.slice(); for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function setMascot(emoji, anim) { var m = $('mascot'); m.textContent = emoji; m.classList.remove('bounce', 'shake'); void m.offsetWidth; if (anim) m.classList.add(anim); }

  /* ---------- التنقّل ---------- */
  var SCREENS = ['home', 'ops', 'worlds', 'game', 'summary', 'mastery', 'magic', 'settings'];
  var state = { op: null, screen: 'home' };
  function show(name) {
    clearTimers(); state.screen = name;
    SCREENS.forEach(function (s) { $('screen-' + s).hidden = (s !== name); });
    $('btn-home').style.visibility = (name === 'home') ? 'hidden' : 'visible';
  }
  function showHome() { state.op = null; setTheme(null); renderHome(); show('home'); }
  function showOps(op) { state.op = op; setTheme(op); renderOps(); show('ops'); }
  function goBack() { var s = state.screen; if (s === 'ops' || s === 'settings') return showHome(); if (state.op) return showOps(state.op); return showHome(); }
  function setTheme(op) {
    var app = $('app'), color = !op ? null : (THEME[op] || OPS[op].color);
    if (color) { app.style.setProperty('--bg1', color); app.setAttribute('data-op', op); }
    else { app.style.removeProperty('--bg1'); app.removeAttribute('data-op'); }
  }

  /* ---------- المؤقّتات ---------- */
  var timerId = null, advanceId = null;
  function clearTimers() { if (timerId) { clearInterval(timerId); timerId = null; } if (advanceId) { clearTimeout(advanceId); advanceId = null; } }

  /* ---------- بدء الأوضاع ---------- */
  function baseSession(mode) { return { op: state.op, mode: mode, idx: 0, correct: 0, wrong: 0, streak: 0, best: 0, typed: '', current: null, qStart: 0, lastKey: null, locked: false }; }
  var session = null;
  function startAdventure(n) { session = baseSession('adventure'); session.world = n; session.queue = shuffle(worldFacts(n)); session.total = ADVENTURE_LEN; enterGame(); }
  function startSmart() { session = baseSession('smart'); session.total = SMART_LEN; enterGame(); }
  function startTime() { session = baseSession('time'); session.endAt = Date.now() + TIME_SECONDS * 1000; enterGame(); }
  function startActivity(mode, color, total) { state.op = null; setTheme(color); session = { op: null, mode: mode, total: total, idx: 0, correct: 0, wrong: 0, streak: 0, best: 0, typed: '', current: null, qStart: 0, level: 1, up: 0, locked: false }; enterGame(); }
  function startPatterns() { startActivity('pattern', 'pattern', PATTERN_LEN); }
  function startPuzzles() { startActivity('puzzle', 'puzzle', PUZZLE_LEN); }

  function enterGame() {
    show('game'); buildPad();
    $('hint-area').hidden = true; $('streak').hidden = true;
    $('timer').hidden = (session.mode !== 'time');
    if (session.mode === 'time') startTimeTimer();
    setMascot('🦉'); nextQuestion();
  }
  function startTimeTimer() {
    var tEl = $('timer-n'), wrap = $('timer');
    function tick() { var left = Math.max(0, Math.ceil((session.endAt - Date.now()) / 1000)); tEl.textContent = left; wrap.classList.toggle('low', left <= 10); if (left <= 0) { clearTimers(); finishSession(); } }
    tick(); timerId = setInterval(tick, 200);
  }

  /* ---------- طرح سؤال ---------- */
  function nextQuestion() {
    session.typed = ''; session.erred = false; session.tries = 0; $('hint-area').hidden = true; $('hint-area').innerHTML = '';
    if (session.mode === 'pattern') { if (session.idx >= session.total) return finishSession(); session.current = genPattern(session.level); session.qStart = Date.now(); renderProblem(); updateProgressBar(); return; }
    if (session.mode === 'puzzle') { if (session.idx >= session.total) return finishSession(); session.current = genPuzzle(session.level); session.qStart = Date.now(); renderProblem(); updateProgressBar(); return; }
    var op = session.op, pick;
    if (session.mode === 'adventure') { if (session.idx >= session.queue.length) return finishSession(); pick = session.queue[session.idx]; }
    else if (session.mode === 'smart') { if (session.idx >= session.total) return finishSession(); pick = pickSmartFact(op, unlockedPool(op), session.lastKey); }
    else { if (Date.now() >= session.endAt) return finishSession(); pick = pickSmartFact(op, unlockedPool(op), session.lastKey); }
    var f = OPS[op].fact(pick.n, pick.k);
    session.current = { n: pick.n, k: pick.k, a: f.a, b: f.b, answer: f.answer, text: f.text };
    session.qStart = Date.now(); renderProblem(); updateProgressBar();
  }
  function renderProblem(stateCls) {
    if (session.mode === 'pattern') return renderPattern(stateCls);
    if (session.mode === 'puzzle') return renderPuzzle(stateCls);
    var c = session.current, shown = session.typed === '' ? '?' : session.typed;
    var p = $('problem'); p.className = 'problem' + (stateCls ? ' ' + stateCls : '');
    p.innerHTML = c.text + ' = <b class="ans">' + shown + '</b>';
  }
  function renderPattern(stateCls) {
    var c = session.current, p = $('problem');
    var parts = c.seq.map(function (v, i) { if (i === c.blankIdx) { var shown = session.typed === '' ? '؟' : session.typed; return '<b class="ans blank">' + shown + '</b>'; } return '<span class="seq-n">' + v + '</span>'; });
    p.className = 'problem pattern' + (stateCls ? ' ' + stateCls : '');
    p.innerHTML = '<span class="seq" dir="ltr">' + parts.join('<i class="seq-arrow">→</i>') + '</span>';
  }
  function renderPuzzle(stateCls) {
    var c = session.current, shown = session.typed === '' ? '؟' : session.typed;
    var box = '<b class="ans blank">' + shown + '</b>';
    var p = $('problem'); p.className = 'problem puzzle' + (stateCls ? ' ' + stateCls : '');
    p.innerHTML = '<span class="prompt"' + (c.ltr ? ' dir="ltr"' : '') + '>' + c.display.replace('{ANS}', box) + '</span>';
  }
  function updateProgressBar() {
    var pct;
    if (session.mode === 'time') pct = ((Date.now() - (session.endAt - TIME_SECONDS * 1000)) / (TIME_SECONDS * 1000)) * 100;
    else pct = (session.idx / session.total) * 100;
    $('game-progress').innerHTML = '<i style="width:' + Math.min(100, pct) + '%"></i>';
  }

  /* ---------- لوحة الأرقام ---------- */
  function buildPad() {
    var pad = $('pad'); pad.innerHTML = '';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].forEach(function (k) {
      var b = document.createElement('button');
      b.className = 'key' + (k === 'ok' ? ' key-ok' : k === 'del' ? ' key-del' : '');
      b.textContent = k === 'del' ? '⌫' : k === 'ok' ? '✓' : k;
      b.addEventListener('click', function () { if (k === 'del') backspace(); else if (k === 'ok') submit(); else typeDigit(k); });
      pad.appendChild(b);
    });
  }
  function typeDigit(d) { if (session.locked || session.typed.length >= 3) return; session.typed = (session.typed + d).replace(/^0+(?=\d)/, ''); sfx.tap(); renderProblem(); }
  function backspace() { if (session.locked) return; session.typed = session.typed.slice(0, -1); renderProblem(); }

  function pointsBase() { return session.mode === 'puzzle' ? 15 : session.mode === 'pattern' ? 12 : 10; }

  function submit() {
    if (session.locked || session.typed === '') return;
    var c = session.current, ok = parseInt(session.typed, 10) === c.answer;
    session.locked = true;
    var fb = $('feedback');

    if (ok) {
      var pts, leveled;
      if (!session.erred) { session.correct++; session.streak++; session.best = Math.max(session.best, session.streak); recordOutcome(c, true); pts = pointsBase() + (session.streak >= 3 ? 5 : 0); }
      else { pts = 3; }
      leveled = awardPoints(pts);
      renderProblem('right'); fb.className = 'feedback good';
      fb.textContent = (session.erred ? 'أحسنت! حللتها ✅' : praise(session.streak)) + '  +' + pts;
      sfx.correct(); if (!session.erred && session.streak >= 3) { sfx.streak(); confetti(14); }
      setMascot('🥳', 'bounce'); if (!session.erred) showStreak();
      if (leveled) { fb.textContent = '🎉 المستوى ' + playerLevel() + '! (' + levelTitle(playerLevel()) + ')'; sfx.win(); confetti(70); setMascot('🤩', 'bounce'); }
      if (session.mode !== 'time') session.idx++;
      advanceId = setTimeout(function () { session.locked = false; $('feedback').textContent = ' '; $('feedback').className = 'feedback'; nextQuestion(); }, leveled ? 1200 : 750);
    } else {
      session.tries = (session.tries || 0) + 1;
      if (!session.erred) { session.erred = true; session.wrong++; session.streak = 0; recordOutcome(c, false); }
      renderProblem('wrong'); fb.className = 'feedback bad';
      fb.textContent = session.tries >= 2 ? 'حاول مجدداً — اضغط «ساعدني أفهم» 💡' : 'غير صحيح، حاول مرة أخرى 🤔';
      sfx.wrong(); setMascot('🤔', 'shake'); $('streak').hidden = true;
      advanceId = setTimeout(function () { session.locked = false; session.typed = ''; renderProblem(); }, 900);
    }
  }
  function recordOutcome(c, correct) {
    if (session.mode === 'pattern' || session.mode === 'puzzle') {
      var act = session.mode === 'pattern' ? progress.patterns : progress.puzzles;
      act.seen++; if (correct) act.correct++; save();
      if (correct) { session.up = (session.up || 0) + 1; if (session.up >= 2) { session.level = Math.min(5, session.level + 1); session.up = 0; } }
      else { session.level = Math.max(1, session.level - 1); session.up = 0; }
    } else { session.lastKey = key(c.n, c.k); updateFact(session.op, c.n, c.k, correct, Date.now() - session.qStart); }
  }
  function showStreak() { if (session.streak >= 2) { var s = $('streak'); s.hidden = false; $('streak-n').textContent = session.streak; s.classList.remove('pump'); void s.offsetWidth; s.classList.add('pump'); } }
  var PRAISE = ['أحسنت! ✅', 'رائع! 🌟', 'ممتاز! 👏', 'بطل! 💪', 'مذهل! 🚀', 'عبقري! 🧠'];
  function praise(st) { if (st >= 5) return 'لا يُوقَف! ' + st + ' متتالية! 🔥'; return PRAISE[Math.min(PRAISE.length - 1, st - 1)] || 'أحسنت! ✅'; }

  /* ---------- التلميح البصري ---------- */
  function dots(count, cls) { var s = ''; for (var i = 0; i < count; i++) s += '<span class="dot ' + (cls || '') + '"></span>'; return s; }
  function rowsOf(rows, cols, cls) { var h = ''; for (var r = 0; r < rows; r++) h += '<div class="hint-row">' + dots(cols, cls) + '</div>'; return h; }
  function toggleHint() {
    var h = $('hint-area');
    if (!h.hidden) { h.hidden = true; h.innerHTML = ''; return; }
    if (session.mode === 'pattern') { h.innerHTML = '<div class="hint-caption">💡 ' + session.current.ruleText + '</div>'; h.hidden = false; return; }
    if (session.mode === 'puzzle') { h.innerHTML = '<div class="hint-caption">' + session.current.hint + '</div>'; h.hidden = false; return; }
    var c = session.current, op = session.op, body = '', cap = '';
    if (op === 'mul') { body = rowsOf(c.a, c.b); cap = c.a + ' صفوف × ' + c.b + ' — عُدّ كل النقاط'; }
    else if (op === 'div') { body = rowsOf(c.b, c.answer); cap = 'وزّع ' + c.a + ' على ' + c.b + ' صفوف — كم في كل صف؟'; }
    else if (op === 'add') { body = '<div class="hint-row hint-wrap">' + dots(c.a, 'd-a') + dots(c.b, 'd-b') + '</div>'; cap = 'عُدّ الكل: ' + c.a + ' + ' + c.b; }
    else { body = '<div class="hint-row hint-wrap">' + dots(c.answer, 'd-a') + dots(c.b, 'd-x') + '</div>'; cap = 'اشطب ' + c.b + ' واعُدّ الباقي'; }
    h.innerHTML = '<div class="hint-rows">' + body + '</div><div class="hint-caption">' + cap + '</div>'; h.hidden = false;
  }

  /* ---------- إنهاء الجلسة + الملخّص ---------- */
  function finishSession() {
    clearTimers();
    progress.stats.sessions = (progress.stats.sessions || 0) + 1;
    var op = session.op, total = session.correct + session.wrong, acc = total ? session.correct / total : 0;
    if (session.mode === 'pattern' || session.mode === 'puzzle') {
      var act = session.mode === 'pattern' ? progress.patterns : progress.puzzles;
      var qstars = total === 0 ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
      act.plays = (act.plays || 0) + 1; act.stars = Math.max(act.stars || 0, qstars); act.best = Math.max(act.best || 0, session.best); act.bestLevel = Math.max(act.bestLevel || 1, session.level); save();
      renderSummaryActivity(session.mode === 'pattern' ? '🔢 أكمل النمط' : '🧩 الأحاجي', session.mode, qstars, acc);
      if (qstars >= 1) { sfx.win(); confetti(60); }
      return;
    }
    if (session.mode === 'adventure') {
      var stars = total === 0 ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
      var w = progress.ops[op].worlds[session.world] || { stars: 0, bestAcc: 0, plays: 0 };
      var newUnlock = (w.stars < 1 && stars >= 1);
      w.stars = Math.max(w.stars, stars); w.bestAcc = Math.max(w.bestAcc || 0, acc); w.plays = (w.plays || 0) + 1;
      progress.ops[op].worlds[session.world] = w; save();
      renderSummaryAdventure(stars, acc, newUnlock);
      if (stars >= 1) { sfx.win(); confetti(60); }
    } else if (session.mode === 'smart') {
      save(); renderSummarySimple('🧠', 'انتهى التدريب الذكي', acc, session.correct, total, session.best, 'smart');
      if (acc >= 0.7) { sfx.win(); confetti(40); }
    } else {
      var best = progress.stats.bestTime[op] || 0, rec = session.correct > best;
      if (rec) progress.stats.bestTime[op] = session.correct; save();
      renderSummaryTime(session.correct, progress.stats.bestTime[op], rec);
      if (session.correct > 0) { sfx.win(); confetti(50); }
    }
  }
  function summaryShell(html) {
    show('summary');
    $('summary-content').innerHTML = '<div class="summary-box">' + html + '</div>';
    $('summary-content').querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { route(b.getAttribute('data-act')); }); });
  }
  function starsHtml(n) { var s = ''; for (var i = 0; i < 3; i++) s += '<span class="star-pop" style="animation-delay:' + (i * 0.18) + 's">' + (i < n ? '⭐' : '☆') + '</span>'; return s; }
  function summaryStats(correct, total, pct) { return '<div class="summary-stats"><div class="s"><b>' + correct + '/' + total + '</b><small>صحيحة</small></div><div class="s"><b>' + pct + '%</b><small>الدقّة</small></div></div>'; }
  function levelLine() { return '<p class="summary-msg" style="margin-top:6px">🏅 المستوى ' + playerLevel() + ' · ' + (progress.xp || 0) + ' نقطة</p>'; }
  function nextWorldOf(op, n) { var i = OPS[op].order.indexOf(n); return (i >= 0 && i < OPS[op].order.length - 1) ? OPS[op].order[i + 1] : null; }

  function renderSummaryAdventure(stars, acc, newUnlock) {
    var op = session.op;
    var msg = stars === 3 ? 'إتقان كامل! أنت بطل هذه الخانة 🏆' : stars === 2 ? 'أداء رائع! تدرّب قليلاً لنجمة ثالثة.' : 'بداية جيدة! أعِد المحاولة لتجمع نجوماً أكثر.';
    if (newUnlock) msg += '<br>🔓 فتحتَ خانة جديدة!';
    var nn = nextWorldOf(op, session.world);
    var nextBtn = (nn && isWorldUnlocked(op, nn)) ? '<button class="btn btn-primary" data-act="world:' + nn + '">التالي ←</button>' : '';
    summaryShell('<div class="big-emoji">' + (stars === 3 ? '🏆' : stars === 2 ? '🎉' : '👍') + '</div><h2>' + OPS[op].sym + ' ' + session.world + '</h2><div class="stars">' + starsHtml(stars) + '</div>' + summaryStats(session.correct, session.correct + session.wrong, Math.round(acc * 100)) + '<p class="summary-msg">' + msg + '</p>' + levelLine() + '<div class="summary-actions">' + nextBtn + '<button class="btn btn-soft" data-act="world:' + session.world + '">إعادة</button><button class="btn btn-soft" data-act="worlds">🗺️ كل الخانات</button></div>');
  }
  function renderSummarySimple(emoji, title, acc, correct, total, bestStreak, again) {
    summaryShell('<div class="big-emoji">' + emoji + '</div><h2>' + title + '</h2>' + summaryStats(correct, total, Math.round(acc * 100)) + '<p class="summary-msg">أطول سلسلة: 🔥 ' + bestStreak + '</p>' + levelLine() + '<div class="summary-actions"><button class="btn btn-primary" data-act="' + again + '">مرة أخرى</button><button class="btn btn-soft" data-act="ops">رجوع</button></div>');
  }
  function renderSummaryTime(score, best, rec) {
    summaryShell('<div class="big-emoji">' + (rec ? '🥇' : '⚡') + '</div><h2>' + (rec ? 'رقم قياسي جديد!' : 'انتهى الوقت!') + '</h2><div class="summary-stats"><div class="s"><b>' + score + '</b><small>صحيحة</small></div><div class="s"><b>' + best + '</b><small>أفضل رقم</small></div></div>' + levelLine() + '<div class="summary-actions"><button class="btn btn-primary" data-act="time">تحدٍّ جديد ⚡</button><button class="btn btn-soft" data-act="ops">رجوع</button></div>');
  }
  function renderSummaryActivity(title, mode, stars, acc) {
    summaryShell('<div class="big-emoji">' + (stars === 3 ? '🏆' : stars === 2 ? '🎉' : '👍') + '</div><h2>' + title + '</h2><div class="stars">' + starsHtml(stars) + '</div>' + summaryStats(session.correct, session.correct + session.wrong, Math.round(acc * 100)) + '<p class="summary-msg">أطول سلسلة: 🔥 ' + session.best + ' · المستوى ' + session.level + '</p>' + levelLine() + '<div class="summary-actions"><button class="btn btn-primary" data-act="' + mode + '">مرة أخرى</button><button class="btn btn-soft" data-act="home">🏠 الرئيسية</button></div>');
  }

  /* ---------- الرئيسية ---------- */
  function renderHome() {
    var lvl = playerLevel(), prog = levelProgress();
    $('level-card').innerHTML =
      '<div class="lc-top"><span class="lc-lvl">⭐ المستوى ' + lvl + '</span><span class="lc-title">' + levelTitle(lvl) + '</span></div>' +
      '<div class="lc-bar"><i style="width:' + prog + '%"></i></div>' +
      '<div class="lc-xp">' + (progress.xp || 0) + ' نقطة · ' + (XP_PER_LEVEL - prog) + ' للمستوى التالي</div>';
    var grid = $('op-grid'); grid.innerHTML = '';
    OP_LIST.forEach(function (op) {
      var d = OPS[op];
      var card = document.createElement('button');
      card.className = 'op-card op-' + op;
      card.innerHTML = '<span class="op-sym">' + d.sym + '</span><span class="op-name">' + d.name + '</span><span class="op-stars">⭐ ' + totalStars(op) + '/30</span>';
      card.addEventListener('click', function () { showOps(op); });
      grid.appendChild(card);
    });
    var ps = $('patterns-stars'); if (ps) ps.textContent = '⭐ ' + (progress.patterns.stars || 0) + '/3';
    var pz = $('puzzles-stars'); if (pz) pz.textContent = '⭐ ' + (progress.puzzles.stars || 0) + '/3';
    var st = magicState();
    var mb = $('magic-banner'); if (mb) mb.innerHTML = '<span class="mb-ic">🧩</span><span class="mb-tx"><b>الأحجية السحرية</b><small>' + st.revealed + '/' + PIECES_PER_PIC + ' قطعة · ' + st.pic.name + '</small></span><span class="mb-go">←</span>';
    var sc = $('streak-chip'); if (sc) sc.textContent = (progress.streak && progress.streak.count > 0) ? ('🔥 سلسلة ' + progress.streak.count + ' ' + (progress.streak.count === 1 ? 'يوم' : 'أيام')) : '';
  }

  /* ---------- قائمة العملية ---------- */
  function renderOps() {
    var op = state.op, d = OPS[op];
    $('op-hero').className = 'op-hero op-' + op; $('op-hero-ic').textContent = d.sym; $('op-hero-name').textContent = d.name;
    $('ops-chips').innerHTML = '<span class="chip">⭐ ' + totalStars(op) + '/30</span><span class="chip">🧠 ' + masteredCount(op) + '/100</span>' + (progress.stats.bestTime[op] ? '<span class="chip">⚡ ' + progress.stats.bestTime[op] + '</span>' : '');
  }

  /* ---------- خانات المغامرة ---------- */
  function renderWorlds() {
    var op = state.op, grid = $('worlds-grid'); grid.innerHTML = '';
    OPS[op].order.forEach(function (n) {
      var unlocked = isWorldUnlocked(op, n), w = progress.ops[op].worlds[n] || { stars: 0 };
      var card = document.createElement('button');
      card.className = 'world-card op-' + op + (unlocked ? '' : ' locked') + (w.stars >= 1 ? ' done' : '');
      if (unlocked) { var st = ''; for (var i = 0; i < 3; i++) st += (i < w.stars ? '⭐' : '·'); card.innerHTML = '<span class="wnum">' + OPS[op].sym + n + '</span><span class="wlabel">خانة ' + n + '</span><span class="wstars">' + st + '</span>'; card.addEventListener('click', function () { startAdventure(n); }); }
      else { card.innerHTML = '<span class="wlock">🔒</span><span class="wnum">' + OPS[op].sym + n + '</span>'; card.disabled = true; }
      grid.appendChild(card);
    });
  }

  /* ---------- خريطة الإتقان ---------- */
  function renderMastery() {
    var op = state.op, grid = $('mastery-grid'); grid.innerHTML = '';
    grid.appendChild(cell('mc mc-corner', OPS[op].sym));
    for (var k = MIN; k <= MAX; k++) grid.appendChild(cell('mc mc-head', k));
    for (var n = MIN; n <= MAX; n++) {
      grid.appendChild(cell('mc mc-head', n));
      for (var kk = MIN; kk <= MAX; kk++) {
        var f = getFact(op, n, kk), fc = OPS[op].fact(n, kk);
        var cls = f.seen === 0 ? 'mc-new' : f.box >= 4 ? 'mc-master' : f.box >= 2 ? 'mc-learn' : 'mc-weak';
        var c = cell('mc ' + cls, fc.answer); c.title = fc.text + ' = ' + fc.answer + '  (صحيح ' + f.correct + ' / ' + f.seen + ')'; grid.appendChild(c);
      }
    }
    var seen = 0, corr = 0, ff = progress.ops[op].facts; for (var x in ff) { seen += ff[x].seen; corr += ff[x].correct; }
    $('mastery-stats').innerHTML = mstat(masteredCount(op) + '/100', 'مُتقَنة') + mstat((seen ? Math.round(corr / seen * 100) : 0) + '%', 'الدقّة') + mstat(totalStars(op) + '/30', 'النجوم') + mstat((progress.stats.bestTime[op] || 0), 'أفضل تحدٍّ');
    $('mastery-title').textContent = '📊 إتقان ' + OPS[op].name;
  }
  function cell(cls, txt) { var d = document.createElement('div'); d.className = cls; d.textContent = txt; return d; }
  function mstat(big, small) { return '<div class="mstat"><b>' + big + '</b><small>' + small + '</small></div>'; }

  /* ---------- الإعدادات ---------- */
  function renderSettings() { $('set-sound').setAttribute('aria-pressed', progress.settings.sound ? 'true' : 'false'); updateSoundIcon(); }
  function updateSoundIcon() { $('btn-sound').textContent = progress.settings.sound ? '🔊' : '🔇'; }

  /* ---------- التوجيه ---------- */
  function route(act) {
    if (act.indexOf('world:') === 0) { startAdventure(parseInt(act.split(':')[1], 10)); return; }
    switch (act) {
      case 'ops': showOps(state.op); break;
      case 'worlds': renderWorlds(); show('worlds'); break;
      case 'smart': startSmart(); break;
      case 'time': startTime(); break;
      case 'pattern': case 'patterns': startPatterns(); break;
      case 'puzzle': case 'puzzles': startPuzzles(); break;
      case 'mastery': renderMastery(); show('mastery'); break;
      case 'magic': state.op = null; setTheme('magic'); renderMagic(); show('magic'); break;
      case 'home': showHome(); break;
      case 'settings': renderSettings(); show('settings'); break;
    }
  }

  /* ---------- الاحتفال ---------- */
  var COLORS = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#facc15'];
  function confetti(n) {
    var layer = $('confetti');
    for (var i = 0; i < n; i++) {
      var p = document.createElement('div'); p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw'; p.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      p.style.animationDuration = (1 + Math.random() * 1.2) + 's'; p.style.animationDelay = (Math.random() * 0.2) + 's'; p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      layer.appendChild(p); (function (el) { setTimeout(function () { el.remove(); }, 2600); })(p);
    }
  }

  /* ---------- ربط الأحداث ---------- */
  function bind() {
    document.querySelectorAll('[data-action]').forEach(function (el) { el.addEventListener('click', function () { route(el.getAttribute('data-action')); }); });
    $('btn-home').addEventListener('click', goBack);
    $('hint-toggle').addEventListener('click', toggleHint);
    function toggleSound() { progress.settings.sound = !progress.settings.sound; save(); updateSoundIcon(); var sw = $('set-sound'); if (sw) sw.setAttribute('aria-pressed', progress.settings.sound ? 'true' : 'false'); if (progress.settings.sound) sfx.tap(); }
    $('btn-sound').addEventListener('click', toggleSound);
    $('set-sound').addEventListener('click', toggleSound);
    $('set-reset').addEventListener('click', function () { if (confirm('هل تريد مسح كل التقدّم والبدء من جديد؟')) { progress = freshProgress(); save(); updateSoundIcon(); showHome(); } });
    document.addEventListener('keydown', function (e) { if ($('screen-game').hidden) return; if (e.key >= '0' && e.key <= '9') typeDigit(e.key); else if (e.key === 'Backspace') { e.preventDefault(); backspace(); } else if (e.key === 'Enter') submit(); });
  }

  function boot() {
    bind(); updateSoundIcon();
    var ds = updateStreak(); showHome();
    if (ds.newDay) toast(ds.count === 1 ? '🔥 <b>أهلاً! بدأتَ سلسلتك اليوم</b><br>العب كل يوم لتطول سلسلتك ⭐' : '🔥 <b>يومك ' + ds.count + ' متتالياً!</b><br>أحسنت على المواظبة ⭐');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
