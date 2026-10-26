import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createDiscoverAudio } from './discover-objects-audio';
import { DISCOVER_BACKGROUNDS, DISCOVER_SUCCESSES, DEFAULT_DISCOVER_SOUND, normalizeDiscoverSound } from './discover-objects-sounds';
import { freshDiscover, validateDiscover } from './discover-objects';

function rig() {
  const clips = [], oscillators = [], gains = [], pending = [];
  const context = {
    state: 'running', currentTime: 0, destination: {}, resume: vi.fn(async () => {}), close: vi.fn(async () => {}),
    createOscillator: () => { const o = { frequency: {}, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stopped: false, stop: time => { if (time === undefined) o.stopped = true; } }; oscillators.push(o); return o; },
    createGain: () => { const g = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(g); return g; },
  };
  const audio = createDiscoverAudio({
    makeAudio: () => { const a = { paused: true, src: '', volume: 1, loop: false, onended: null, onerror: null, pause: vi.fn(() => { a.paused = true; }), play: vi.fn(() => { a.paused = false; return new Promise((resolve, reject) => pending.push({ a, resolve, reject })); }) }; clips.push(a); return a; },
    makeContext: () => context,
  });
  return { audio, clips, oscillators, gains, pending, context };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('مكتبة أصوات أكتشف الأشياء والتحقق من الحفظ', () => {
  it('ثمانية ألحان أصلية لكل نوع، ومعرّفات مختلفة ونغمات ومدد صالحة', () => {
    for (const list of [DISCOVER_BACKGROUNDS, DISCOVER_SUCCESSES]) {
      expect(list).toHaveLength(8); expect(new Set(list.map(t => t.id)).size).toBe(8);
      for (const t of list) { expect(t.bpm).toBeGreaterThan(0); expect(t.notes.every(([note, beats]) => note >= 0 && note <= 127 && beats > 0)).toBe(true); }
    }
  });
  it('المحتوى المحفوظ القديم يبقى صالحًا ولا تُفقد كلماته أو إعداداته', () => {
    const old = freshDiscover(); delete old.sounds; old.scenes[0].rounds.forEach(r => delete r.wordAudio);
    const r = validateDiscover(old); expect(r.error).toBeUndefined(); expect(r.config.sounds).toEqual(DEFAULT_DISCOVER_SOUND);
    expect(r.config.scenes[0].rounds[0]).toMatchObject({ word: 'كُرَة', wordAudio: '', target: 'ball' });
  });
  it('يحفظ صوت الكلمة منفصلًا عن الدليل والموسيقى والمستويات', () => {
    const c = freshDiscover(); c.scenes[0].rounds[0].wordAudio = 'https://media.test/word.mp3'; c.scenes[0].rounds[0].audio = 'https://media.test/clue.mp3';
    c.sounds = { ...DEFAULT_DISCOVER_SOUND, background: 'clouds', success: 'bravo', backgroundVolume: .12, wordVolume: .8, autoWord: false };
    const r = validateDiscover(c); expect(r.config.scenes[0].rounds[0]).toMatchObject({ wordAudio: 'https://media.test/word.mp3', audio: 'https://media.test/clue.mp3' }); expect(r.config.sounds).toEqual(c.sounds);
  });
  it('يرفض ملفات غير آمنة أو أصواتًا مجهولة أو مستويات خارج المدى', () => {
    for (const patch of [{ background: 'unknown' }, { success: 'unknown' }, { wordVolume: 2 }, { clueVolume: -1 }, { background: 'custom', backgroundUrl: '' }, { success: 'custom', successUrl: 'javascript:alert(1)' }]) {
      const c = freshDiscover(); c.sounds = { ...c.sounds, ...patch }; expect(validateDiscover(c).error).toBeTruthy();
    }
    const c = freshDiscover(); c.scenes[0].rounds[0].wordAudio = 'data:audio/wav;base64,aaaa'; expect(validateDiscover(c).error).toBeTruthy();
    expect(normalizeDiscoverSound(null)).toBeNull();
  });
});

describe('مشغل التدريب — الكلمة أولًا، ثم النجاح، وخلفية بلا تداخل', () => {
  it('لا موسيقى قبل تفاعل الطالب؛ الخلفية المخصصة تتكرر وتتوقف أثناء الكلام والنجاح', () => {
    const r = rig(); r.audio.configure({ background: 'custom', backgroundUrl: '/music.mp3' }); expect(r.clips).toHaveLength(0);
    r.audio.unlock(); const bg = r.clips[0]; expect(bg.loop).toBe(true); expect(bg.paused).toBe(false);
    r.audio.discovered('/word.mp3'); const word = r.clips[1]; expect(bg.paused).toBe(true); expect(word.src).toBe('/word.mp3'); expect(r.oscillators).toHaveLength(0);
    word.onended(); expect(word.paused).toBe(true); expect(bg.paused).toBe(true); expect(r.oscillators.length).toBeGreaterThan(0);
    vi.advanceTimersByTime(3000); expect(bg.paused).toBe(false); r.audio.destroy();
  });
  it('الكلمة والدليل يستخدمان عنصر كلام واحدًا بمستويين مستقلين', () => {
    const r = rig(); r.audio.configure({ wordVolume: .8, clueVolume: .4 });
    r.audio.playWord('/word.mp3'); const oldEnd = r.clips[0].onended;
    r.audio.playClue('/clue.mp3'); expect(r.clips).toHaveLength(1); expect(r.clips[0].src).toBe('/clue.mp3'); expect(r.clips[0].volume).toBe(.4);
    oldEnd(); expect(r.clips[0].paused).toBe(false); expect(r.clips[0].src).toBe('/clue.mp3'); r.audio.destroy();
  });
  it('رفض play القديم لا يشغّل نجاحًا قديمًا فوق تسجيل جديد', async () => {
    const r = rig(); r.audio.discovered('/first.mp3'); r.audio.playWord('/second.mp3');
    r.pending[0].reject(new Error('AbortError')); await Promise.resolve();
    expect(r.oscillators).toHaveLength(0); expect(r.clips[0].src).toBe('/second.mp3'); expect(r.clips[0].paused).toBe(false); r.audio.destroy();
  });
  it('دون تسجيل لا يُنشأ أي صوت كلام بديل؛ تعطيل النطق والنجاح محترم', () => {
    const r = rig(); r.audio.configure({ success: 'off' }); r.audio.discovered(''); expect(r.clips).toHaveLength(0); expect(r.oscillators).toHaveLength(0);
    r.audio.configure({ autoWord: false, success: 'sparkle' }); r.audio.discovered('/word.mp3'); expect(r.clips).toHaveLength(0); expect(r.oscillators.length).toBeGreaterThan(0); r.audio.destroy();
  });
  it('النجاح المخصص يبدأ بعد نهاية الكلمة فقط ويستعمل عنصرها نفسه', () => {
    const r = rig(); r.audio.configure({ success: 'custom', successUrl: '/win.mp3', successVolume: .25 });
    r.audio.discovered('/word.mp3'); r.clips[0].onended(); expect(r.clips).toHaveLength(1); expect(r.clips[0].src).toBe('/win.mp3'); expect(r.clips[0].volume).toBe(.25); r.audio.destroy();
  });
  it('الكتم والمغادرة وإخفاء التبويب توقف كل القنوات والمؤقتات', () => {
    const r = rig(); r.audio.configure({ background: 'garden' }); r.audio.unlock(); expect(vi.getTimerCount()).toBeGreaterThan(0);
    r.audio.setMuted(true); expect(vi.getTimerCount()).toBe(0); expect(r.oscillators.every(o => o.stopped)).toBe(true);
    const count = r.oscillators.length; r.audio.discovered('/word.mp3'); expect(r.clips).toHaveLength(0); expect(r.oscillators).toHaveLength(count);
    r.audio.setMuted(false); r.audio.playWord('/word.mp3'); r.audio.setVisible(false); expect(r.clips[0].paused).toBe(true); expect(vi.getTimerCount()).toBe(0);
    r.audio.destroy(); expect(r.context.close).toHaveBeenCalledOnce(); r.audio.unlock(); expect(vi.getTimerCount()).toBe(0);
  });
  it('عدم تغير الرؤية لا يقطع الكلمة عند الانتقال إلى تركيب الحروف', () => {
    const r = rig(); r.audio.discovered('/word.mp3'); r.audio.setVisible(true); expect(r.clips[0].paused).toBe(false); r.audio.destroy();
  });
  it('تبديل اللغز يلغي الصوت القديم ويستأنف الخلفية، بلا تكرار مؤقتاتها', () => {
    const r = rig(); r.audio.configure({ background: 'clouds' }); r.audio.unlock();
    r.audio.playWord('/word.mp3'); r.audio.reset(); expect(r.clips[0].paused).toBe(true); expect(vi.getTimerCount()).toBe(1);
    r.audio.unlock(); r.audio.unlock(); expect(vi.getTimerCount()).toBe(1); r.audio.destroy();
  });
  it('أخطاء WebAudio أو عدم دعمه لا تعطل اللعب أو نطق التسجيل', () => {
    const a = { pause: vi.fn(), play: vi.fn(async () => {}) };
    const player = createDiscoverAudio({ makeAudio: () => a, makeContext: () => null });
    expect(() => { player.configure({ background: 'garden' }); player.unlock(); player.playWord('/word.mp3'); a.onended(); player.discovered(''); player.destroy(); }).not.toThrow();
  });
});
