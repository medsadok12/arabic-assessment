/* ============================================================
   بطل الضرب — مغامرة جدول الضرب
   تطبيق مستقل بلا تبعيات. كل المنطق client-side ويعمل أوفلاين.
   الجداول 1..10 بأرقام لاتينية.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- ثوابت ---------- */
  var MIN = 1, MAX = 10;
  // ترتيب العوالم من الأسهل للأصعب (يُفتح تدريجياً)
  var WORLD_ORDER = [1, 10, 2, 5, 3, 4, 6, 7, 8, 9];
  var ADVENTURE_LEN = 10;   // كل عالم: 10 حقائق
  var SMART_LEN = 15;       // جلسة التدريب الذكي
  var TIME_SECONDS = 60;    // تحدّي الزمن
  var STORE_KEY = 'batal_aldarb_v1';

  /* ---------- التخزين ---------- */
  function freshProgress() {
    return { facts: {}, worlds: {}, stats: { bestTime: 0, sessions: 0 }, settings: { sound: true } };
  }

  var progress = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return freshProgress();
      var p = JSON.parse(raw);
      // دمج آمن مع البنية الافتراضية
      var base = freshProgress();
      p.facts = p.facts || {};
      p.worlds = p.worlds || {};
      p.stats = Object.assign(base.stats, p.stats || {});
      p.settings = Object.assign(base.settings, p.settings || {});
      return p;
    } catch (e) { return freshProgress(); }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  /* ---------- نموذج الحقائق + التكرار المتباعد (Leitner) ---------- */
  function factKey(a, b) { return a + 'x' + b; }

  function getFact(key) {
    return progress.facts[key] || { box: 0, seen: 0, correct: 0, wrong: 0, lastSeen: 0, bestMs: 0 };
  }

  // box: 0 (جديد/ضعيف) .. 5 (مُتقَن). صحيح => +1، خطأ => -2.
  function updateFact(a, b, correct, ms) {
    var key = factKey(a, b);
    var f = getFact(key);
    f.seen++;
    if (correct) { f.correct++; f.box = Math.min(5, f.box + 1); if (ms) f.bestMs = f.bestMs ? Math.min(f.bestMs, ms) : ms; }
    else { f.wrong++; f.box = Math.max(0, f.box - 2); }
    f.lastSeen = Date.now();
    progress.facts[key] = f;
    save();
  }

  function worldFacts(n) {
    var arr = [];
    for (var b = MIN; b <= MAX; b++) arr.push({ a: n, b: b });
    return arr;
  }

  function completedCount() {
    var c = 0;
    for (var k in progress.worlds) if (progress.worlds[k] && progress.worlds[k].stars >= 1) c++;
    return c;
  }

  function unlockedWorlds() {
    // أول عالم مفتوح دائماً، وكل عالم مكتمل يفتح الذي يليه في الترتيب
    var count = completedCount();
    return WORLD_ORDER.slice(0, Math.min(WORLD_ORDER.length, count + 1));
  }

  function isWorldUnlocked(n) { return unlockedWorlds().indexOf(n) !== -1; }

  function unlockedFactPool() {
    var pool = [];
    unlockedWorlds().forEach(function (n) { pool = pool.concat(worldFacts(n)); });
    return pool;
  }

  // اختيار حقيقة ذكي: ترجيح أعلى للصناديق المنخفضة (الأضعف/الأحدث)
  function pickSmartFact(pool, avoidKey) {
    var weights = [], total = 0;
    pool.forEach(function (f) {
      var key = factKey(f.a, f.b);
      var box = getFact(key).box;
      var w = (6 - box) * (6 - box) + 1;        // box 0 => 37 ، box 5 => 2
      if (pool.length > 1 && key === avoidKey) w = 0; // تجنّب التكرار الفوري
      weights.push(w); total += w;
    });
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  function masteredFactsCount() {
    var c = 0;
    for (var k in progress.facts) if (progress.facts[k].box >= 4) c++;
    return c;
  }

  function totalStars() {
    var s = 0;
    for (var k in progress.worlds) s += (progress.worlds[k].stars || 0);
    return s;
  }

  /* ---------- الأصوات (Web Audio، بلا ملفات) ---------- */
  var actx = null;
  function ac() {
    if (!progress.settings.sound) return null;
    try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, start, dur, type, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    var t = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var sfx = {
    tap: function () { tone(420, 0, 0.06, 'square', 0.05); },
    correct: function () { tone(660, 0, 0.12, 'sine', 0.16); tone(990, 0.1, 0.16, 'sine', 0.16); },
    wrong: function () { tone(200, 0, 0.22, 'sine', 0.14); },
    streak: function () { tone(880, 0, 0.08, 'triangle', 0.14); tone(1320, 0.08, 0.12, 'triangle', 0.14); },
    win: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.12, 0.18, 'triangle', 0.16); }); }
  };

  /* ---------- أدوات عامة ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function shuffle(arr) {
    arr = arr.slice();
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }
  function setMascot(emoji, anim) {
    var m = $('mascot'); m.textContent = emoji;
    m.classList.remove('bounce', 'shake'); void m.offsetWidth;
    if (anim) m.classList.add(anim);
  }

  /* ---------- التنقّل بين الشاشات ---------- */
  var SCREENS = ['home', 'worlds', 'game', 'summary', 'mastery', 'settings'];
  function show(name) {
    clearTimers();
    SCREENS.forEach(function (s) { $('screen-' + s).hidden = (s !== name); });
    $('btn-home').style.visibility = (name === 'home') ? 'hidden' : 'visible';
  }

  /* ---------- حالة الجلسة ---------- */
  var session = null;
  var timerId = null, advanceId = null;

  function clearTimers() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (advanceId) { clearTimeout(advanceId); advanceId = null; }
  }

  /* ---------- بدء الأوضاع ---------- */
  function startAdventure(n) {
    session = {
      mode: 'adventure', world: n,
      queue: shuffle(worldFacts(n)), idx: 0, total: ADVENTURE_LEN,
      correct: 0, wrong: 0, streak: 0, best: 0, typed: '', current: null, qStart: 0, lastKey: null
    };
    enterGame();
  }
  function startSmart() {
    session = {
      mode: 'smart', total: SMART_LEN, idx: 0,
      correct: 0, wrong: 0, streak: 0, best: 0, typed: '', current: null, qStart: 0, lastKey: null
    };
    enterGame();
  }
  function startTime() {
    session = {
      mode: 'time', endAt: Date.now() + TIME_SECONDS * 1000,
      correct: 0, wrong: 0, streak: 0, best: 0, typed: '', current: null, qStart: 0, lastKey: null
    };
    enterGame();
  }

  function enterGame() {
    show('game');
    buildPad();
    $('hint-area').hidden = true;
    $('streak').hidden = true;
    $('timer').hidden = (session.mode !== 'time');
    if (session.mode === 'time') startTimeTimer();
    setMascot('🦉');
    nextQuestion();
  }

  function startTimeTimer() {
    var tEl = $('timer-n'), wrap = $('timer');
    function tick() {
      var left = Math.max(0, Math.ceil((session.endAt - Date.now()) / 1000));
      tEl.textContent = left;
      wrap.classList.toggle('low', left <= 10);
      if (left <= 0) { clearTimers(); finishSession(); }
    }
    tick();
    timerId = setInterval(tick, 200);
  }

  /* ---------- طرح سؤال ---------- */
  function nextQuestion() {
    session.typed = '';
    $('hint-area').hidden = true; $('hint-area').innerHTML = '';

    if (session.mode === 'adventure') {
      if (session.idx >= session.queue.length) return finishSession();
      session.current = session.queue[session.idx];
    } else if (session.mode === 'smart') {
      if (session.idx >= session.total) return finishSession();
      session.current = pickSmartFact(unlockedFactPool(), session.lastKey);
    } else { // time
      if (Date.now() >= session.endAt) return finishSession();
      session.current = pickSmartFact(unlockedFactPool(), session.lastKey);
    }

    session.current.answer = session.current.a * session.current.b;
    session.qStart = Date.now();
    renderProblem();
    updateProgressBar();
  }

  function renderProblem(state) {
    var c = session.current;
    var shown = session.typed === '' ? '?' : session.typed;
    var p = $('problem');
    p.className = 'problem' + (state ? ' ' + state : '');
    p.innerHTML = c.a + ' × ' + c.b + ' = <b class="ans">' + shown + '</b>';
  }

  function updateProgressBar() {
    var bar = $('game-progress');
    var pct;
    if (session.mode === 'adventure') pct = (session.idx / session.total) * 100;
    else if (session.mode === 'smart') pct = (session.idx / session.total) * 100;
    else pct = ((Date.now() - (session.endAt - TIME_SECONDS * 1000)) / (TIME_SECONDS * 1000)) * 100;
    bar.innerHTML = '<i style="width:' + Math.min(100, pct) + '%"></i>';
  }

  /* ---------- لوحة الأرقام ---------- */
  function buildPad() {
    var pad = $('pad');
    pad.innerHTML = '';
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
    keys.forEach(function (k) {
      var btn = document.createElement('button');
      btn.className = 'key' + (k === 'ok' ? ' key-ok' : k === 'del' ? ' key-del' : '');
      btn.textContent = k === 'del' ? '⌫' : k === 'ok' ? '✓' : k;
      btn.addEventListener('click', function () {
        if (k === 'del') backspace();
        else if (k === 'ok') submit();
        else typeDigit(k);
      });
      pad.appendChild(btn);
    });
  }

  function typeDigit(d) {
    if (session.locked) return;
    if (session.typed.length >= 3) return;
    session.typed = (session.typed + d).replace(/^0+(?=\d)/, '');
    sfx.tap();
    renderProblem();
  }
  function backspace() {
    if (session.locked) return;
    session.typed = session.typed.slice(0, -1);
    renderProblem();
  }

  function submit() {
    if (session.locked) return;
    if (session.typed === '') return;
    var c = session.current;
    var val = parseInt(session.typed, 10);
    var ms = Date.now() - session.qStart;
    var ok = val === c.answer;
    session.lastKey = factKey(c.a, c.b);
    session.locked = true;

    updateFact(c.a, c.b, ok, ms);

    var fb = $('feedback');
    if (ok) {
      session.correct++;
      session.streak++;
      session.best = Math.max(session.best, session.streak);
      renderProblem('right');
      fb.className = 'feedback good';
      fb.textContent = praise(session.streak);
      sfx.correct();
      if (session.streak >= 3) { sfx.streak(); confetti(14); }
      setMascot(session.streak >= 3 ? '🤩' : '🥳', 'bounce');
      showStreak();
    } else {
      session.wrong++;
      session.streak = 0;
      renderProblem('wrong');
      fb.className = 'feedback bad';
      fb.textContent = 'الإجابة: ' + c.answer;
      sfx.wrong();
      setMascot('🤔', 'shake');
      hideStreak();
    }

    if (session.mode === 'adventure') session.idx++;
    else if (session.mode === 'smart') session.idx++;

    var delay = ok ? 750 : 1500;
    advanceId = setTimeout(function () {
      session.locked = false;
      $('feedback').textContent = ' ';
      $('feedback').className = 'feedback';
      nextQuestion();
    }, delay);
  }

  function showStreak() {
    if (session.streak >= 2) {
      var s = $('streak'); s.hidden = false;
      $('streak-n').textContent = session.streak;
      s.classList.remove('pump'); void s.offsetWidth; s.classList.add('pump');
    }
  }
  function hideStreak() { $('streak').hidden = true; }

  var PRAISE = ['أحسنت! ✅', 'رائع! 🌟', 'ممتاز! 👏', 'بطل! 💪', 'مذهل! 🚀', 'عبقري! 🧠'];
  function praise(streak) {
    if (streak >= 5) return 'لا يُوقَف! ' + streak + ' متتالية! 🔥';
    return PRAISE[Math.min(PRAISE.length - 1, streak - 1)] || 'أحسنت! ✅';
  }

  /* ---------- التلميح البصري (نموذج الصفوف) ---------- */
  function toggleHint() {
    var h = $('hint-area');
    if (!h.hidden) { h.hidden = true; h.innerHTML = ''; return; }
    var c = session.current;
    var rows = '';
    for (var r = 0; r < c.a; r++) {
      var dots = '';
      for (var d = 0; d < c.b; d++) dots += '<span class="dot"></span>';
      rows += '<div class="hint-row">' + dots + '</div>';
    }
    h.innerHTML = '<div class="hint-rows">' + rows + '</div>' +
      '<div class="hint-caption">' + c.a + ' صفوف × ' + c.b + ' = عُدّ النقاط!</div>';
    h.hidden = false;
  }

  /* ---------- إنهاء الجلسة + الملخّص ---------- */
  function finishSession() {
    clearTimers();
    progress.stats.sessions = (progress.stats.sessions || 0) + 1;

    var total = session.correct + session.wrong;
    var acc = total ? session.correct / total : 0;

    if (session.mode === 'adventure') {
      var stars = total === 0 ? 0 : acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
      var w = progress.worlds[session.world] || { stars: 0, bestAcc: 0, plays: 0 };
      var newlyUnlocked = (w.stars < 1 && stars >= 1);
      w.stars = Math.max(w.stars, stars);
      w.bestAcc = Math.max(w.bestAcc || 0, acc);
      w.plays = (w.plays || 0) + 1;
      progress.worlds[session.world] = w;
      save();
      renderSummaryAdventure(stars, acc, newlyUnlocked);
      if (stars >= 1) { sfx.win(); confetti(60); }
    } else if (session.mode === 'smart') {
      save();
      renderSummarySimple('🧠', 'انتهى التدريب الذكي', acc, session.correct, total, session.best);
      if (acc >= 0.7) { sfx.win(); confetti(40); }
    } else {
      var best = progress.stats.bestTime || 0;
      var isRecord = session.correct > best;
      if (isRecord) { progress.stats.bestTime = session.correct; }
      save();
      renderSummaryTime(session.correct, progress.stats.bestTime, isRecord);
      if (session.correct > 0) { sfx.win(); confetti(50); }
    }
  }

  function summaryShell(html) {
    show('summary');
    $('summary-content').innerHTML = '<div class="summary-box">' + html + '</div>';
    $('summary-content').querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () { route(b.getAttribute('data-act')); });
    });
  }

  function starsHtml(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<span class="star-pop" style="animation-delay:' + (i * 0.18) + 's">' + (i < n ? '⭐' : '☆') + '</span>';
    return s;
  }

  function renderSummaryAdventure(stars, acc, newlyUnlocked) {
    var msg = stars === 3 ? 'إتقان كامل! أنت بطل هذا العالم 🏆'
      : stars === 2 ? 'أداء رائع! تدرّب قليلاً لنجمة ثالثة.'
        : 'بداية جيدة! أعِد المحاولة لتجمع نجوماً أكثر.';
    if (newlyUnlocked) msg += '<br>🔓 فتحتَ عالماً جديداً!';
    var nextN = nextWorldOf(session.world);
    var nextBtn = (nextN && isWorldUnlocked(nextN))
      ? '<button class="btn btn-primary" data-act="world:' + nextN + '">العالم التالي ←</button>' : '';
    summaryShell(
      '<div class="big-emoji">' + (stars === 3 ? '🏆' : stars === 2 ? '🎉' : '👍') + '</div>' +
      '<h2>عالم ×' + session.world + '</h2>' +
      '<div class="stars">' + starsHtml(stars) + '</div>' +
      summaryStats(session.correct, session.correct + session.wrong, Math.round(acc * 100)) +
      '<p class="summary-msg">' + msg + '</p>' +
      '<div class="summary-actions">' + nextBtn +
      '<button class="btn btn-soft" data-act="world:' + session.world + '">إعادة هذا العالم</button>' +
      '<button class="btn btn-soft" data-act="worlds">🗺️ كل العوالم</button></div>'
    );
  }

  function renderSummarySimple(emoji, title, acc, correct, total, bestStreak) {
    summaryShell(
      '<div class="big-emoji">' + emoji + '</div>' +
      '<h2>' + title + '</h2>' +
      summaryStats(correct, total, Math.round(acc * 100)) +
      '<p class="summary-msg">أطول سلسلة: 🔥 ' + bestStreak + '<br>' +
      (acc >= 0.9 ? 'إتقان مبهر!' : acc >= 0.7 ? 'تتحسّن بسرعة!' : 'استمر، التدريب يصنع البطل!') + '</p>' +
      '<div class="summary-actions">' +
      '<button class="btn btn-primary" data-act="smart">مرة أخرى</button>' +
      '<button class="btn btn-soft" data-act="home">🏠 الرئيسية</button></div>'
    );
  }

  function renderSummaryTime(score, best, isRecord) {
    summaryShell(
      '<div class="big-emoji">' + (isRecord ? '🥇' : '⚡') + '</div>' +
      '<h2>' + (isRecord ? 'رقم قياسي جديد!' : 'انتهى الوقت!') + '</h2>' +
      '<div class="summary-stats"><div class="s"><b>' + score + '</b><small>إجابة صحيحة</small></div>' +
      '<div class="s"><b>' + best + '</b><small>أفضل رقم</small></div></div>' +
      '<p class="summary-msg">' + (isRecord ? 'تجاوزتَ رقمك السابق! 🎊' : 'هل تتحدّى نفسك مرة أخرى؟') + '</p>' +
      '<div class="summary-actions">' +
      '<button class="btn btn-primary" data-act="time">تحدٍّ جديد ⚡</button>' +
      '<button class="btn btn-soft" data-act="home">🏠 الرئيسية</button></div>'
    );
  }

  function summaryStats(correct, total, pct) {
    return '<div class="summary-stats">' +
      '<div class="s"><b>' + correct + '/' + total + '</b><small>صحيحة</small></div>' +
      '<div class="s"><b>' + pct + '%</b><small>الدقّة</small></div></div>';
  }

  function nextWorldOf(n) {
    var i = WORLD_ORDER.indexOf(n);
    return (i >= 0 && i < WORLD_ORDER.length - 1) ? WORLD_ORDER[i + 1] : null;
  }

  /* ---------- الرئيسية ---------- */
  function renderHome() {
    var chips = $('home-chips');
    chips.innerHTML =
      '<span class="chip">⭐ ' + totalStars() + ' / 30</span>' +
      '<span class="chip">🧠 ' + masteredFactsCount() + ' / 100 مُتقَنة</span>' +
      (progress.stats.bestTime ? '<span class="chip">⚡ أفضل: ' + progress.stats.bestTime + '</span>' : '');
  }

  /* ---------- شاشة العوالم ---------- */
  function renderWorlds() {
    var grid = $('worlds-grid');
    grid.innerHTML = '';
    WORLD_ORDER.forEach(function (n) {
      var unlocked = isWorldUnlocked(n);
      var w = progress.worlds[n] || { stars: 0 };
      var card = document.createElement('button');
      card.className = 'world-card' + (unlocked ? '' : ' locked') + (w.stars >= 1 ? ' done' : '');
      if (unlocked) {
        var stars = '';
        for (var i = 0; i < 3; i++) stars += (i < w.stars ? '⭐' : '·');
        card.innerHTML = '<span class="wnum">×' + n + '</span><span class="wlabel">جدول ' + n + '</span><span class="wstars">' + stars + '</span>';
        card.addEventListener('click', function () { startAdventure(n); });
      } else {
        card.innerHTML = '<span class="wlock">🔒</span><span class="wnum">×' + n + '</span>';
        card.disabled = true;
      }
      grid.appendChild(card);
    });
  }

  /* ---------- خريطة الإتقان ---------- */
  function renderMastery() {
    var grid = $('mastery-grid');
    grid.innerHTML = '';
    grid.appendChild(cell('mc mc-corner', '×'));
    for (var b = MIN; b <= MAX; b++) grid.appendChild(cell('mc mc-head', b));
    for (var a = MIN; a <= MAX; a++) {
      grid.appendChild(cell('mc mc-head', a));
      for (var bb = MIN; bb <= MAX; bb++) {
        var f = getFact(factKey(a, bb));
        var cls = f.seen === 0 ? 'mc-new' : f.box >= 4 ? 'mc-master' : f.box >= 2 ? 'mc-learn' : 'mc-weak';
        var c = cell('mc ' + cls, a * bb);
        c.title = a + ' × ' + bb + ' = ' + (a * bb) + '  (صحيح ' + f.correct + ' / ' + f.seen + ')';
        grid.appendChild(c);
      }
    }
    var totalSeen = 0, totalCorrect = 0;
    for (var k in progress.facts) { totalSeen += progress.facts[k].seen; totalCorrect += progress.facts[k].correct; }
    var accPct = totalSeen ? Math.round(totalCorrect / totalSeen * 100) : 0;
    $('mastery-stats').innerHTML =
      mstat(masteredFactsCount() + '/100', 'حقائق مُتقَنة') +
      mstat(accPct + '%', 'الدقّة العامة') +
      mstat(totalStars() + '/30', 'النجوم') +
      mstat((progress.stats.bestTime || 0), 'أفضل تحدٍّ');
  }
  function cell(cls, txt) { var d = document.createElement('div'); d.className = cls; d.textContent = txt; return d; }
  function mstat(big, small) { return '<div class="mstat"><b>' + big + '</b><small>' + small + '</small></div>'; }

  /* ---------- الإعدادات ---------- */
  function renderSettings() {
    var sw = $('set-sound');
    sw.setAttribute('aria-pressed', progress.settings.sound ? 'true' : 'false');
    updateSoundIcon();
  }
  function updateSoundIcon() { $('btn-sound').textContent = progress.settings.sound ? '🔊' : '🔇'; }

  /* ---------- التوجيه ---------- */
  function route(act) {
    if (act.indexOf('world:') === 0) { startAdventure(parseInt(act.split(':')[1], 10)); return; }
    switch (act) {
      case 'home': show('home'); renderHome(); break;
      case 'worlds': renderWorlds(); show('worlds'); break;
      case 'smart': startSmart(); break;
      case 'time': startTime(); break;
      case 'mastery': renderMastery(); show('mastery'); break;
      case 'settings': renderSettings(); show('settings'); break;
    }
  }

  /* ---------- الاحتفال ---------- */
  var COLORS = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#facc15'];
  function confetti(n) {
    var layer = $('confetti');
    for (var i = 0; i < n; i++) {
      var p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
      p.style.animationDuration = (1 + Math.random() * 1.2) + 's';
      p.style.animationDelay = (Math.random() * 0.2) + 's';
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      layer.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 2600); })(p);
    }
  }

  /* ---------- ربط الأحداث ---------- */
  function bind() {
    document.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', function () { route(el.getAttribute('data-action')); });
    });
    $('btn-home').addEventListener('click', function () { route('home'); });
    $('hint-toggle').addEventListener('click', toggleHint);

    $('btn-sound').addEventListener('click', function () {
      progress.settings.sound = !progress.settings.sound; save();
      updateSoundIcon();
      if (progress.settings.sound) sfx.tap();
      var sw = $('set-sound'); if (sw) sw.setAttribute('aria-pressed', progress.settings.sound ? 'true' : 'false');
    });
    $('set-sound').addEventListener('click', function () {
      progress.settings.sound = !progress.settings.sound; save();
      this.setAttribute('aria-pressed', progress.settings.sound ? 'true' : 'false');
      updateSoundIcon();
      if (progress.settings.sound) sfx.tap();
    });
    $('set-reset').addEventListener('click', function () {
      if (confirm('هل تريد مسح كل التقدّم والبدء من جديد؟')) {
        progress = freshProgress(); save();
        renderHome(); updateSoundIcon(); route('home');
      }
    });

    // دعم لوحة المفاتيح الفعلية (للأجهزة اللوحية بلوحة مفاتيح)
    document.addEventListener('keydown', function (e) {
      if ($('screen-game').hidden) return;
      if (e.key >= '0' && e.key <= '9') typeDigit(e.key);
      else if (e.key === 'Backspace') { e.preventDefault(); backspace(); }
      else if (e.key === 'Enter') submit();
    });
  }

  /* ---------- الإقلاع ---------- */
  function boot() {
    bind();
    renderHome();
    updateSoundIcon();
    show('home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
