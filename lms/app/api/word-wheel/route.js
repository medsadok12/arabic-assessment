import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const STRIP_RE = /[ً-ْٰـ]/g;
const ARABIC_RE = /^[ء-ي]+$/;

function strip(word) {
  return word.replace(STRIP_RE, '');
}

function isArabic(word) {
  return ARABIC_RE.test(word);
}

function letterCounts(word) {
  const counts = {};
  for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

function canFormFrom(word, wheelCounts) {
  const wc = letterCounts(word);
  for (const [ch, n] of Object.entries(wc)) {
    if ((wheelCounts[ch] || 0) < n) return false;
  }
  return true;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const FALLBACK_LETTERS = ['ر', 'م', 'ن', 'ل', 'ب', 'ك', 'ت', 'س'];
const FALLBACK_CENTER = 'م';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('lexicon_words')
      .select('word');

    if (error) throw error;

    const allWords = (data ?? [])
      .map(r => strip(r.word || ''))
      .filter(w => w.length >= 3 && isArabic(w));

    const uniqueWords = [...new Set(allWords)];

    if (uniqueWords.length < 5) {
      const wc = letterCounts(FALLBACK_LETTERS.join('') + FALLBACK_CENTER);
      const validWords = uniqueWords.filter(w =>
        w.includes(FALLBACK_CENTER) && canFormFrom(w, wc) && w.length >= 3
      );
      return NextResponse.json({
        letters: FALLBACK_LETTERS,
        center: FALLBACK_CENTER,
        valid_words: validWords,
        valid_count: validWords.length,
      });
    }

    const seedCandidates = uniqueWords.filter(w => {
      const len = w.length;
      if (len < 4 || len > 8) return false;
      const unique = new Set(w).size;
      return unique >= 4 && unique === len;
    });

    const pool = seedCandidates.length > 0
      ? seedCandidates
      : uniqueWords.filter(w => w.length >= 4 && w.length <= 8);

    const shuffledSeeds = shuffle(pool);

    let wheelLetters = null;

    for (const seed of shuffledSeeds.slice(0, 40)) {
      let letters = [...new Set(seed)];
      if (letters.length < 4) continue;

      if (letters.length < 8) {
        const freq = {};
        for (const w of uniqueWords) {
          for (const ch of w) {
            if (!letters.includes(ch) && isArabic(ch)) {
              freq[ch] = (freq[ch] || 0) + 1;
            }
          }
        }
        const extra = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .map(e => e[0]);
        letters = [...letters, ...extra].slice(0, 8);
      }

      if (letters.length === 8) {
        wheelLetters = letters;
        break;
      }
    }

    if (!wheelLetters) {
      const freq = {};
      for (const w of uniqueWords) {
        for (const ch of w) {
          if (isArabic(ch)) freq[ch] = (freq[ch] || 0) + 1;
        }
      }
      const topLetters = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0])
        .slice(0, 8);
      wheelLetters = topLetters.length >= 8 ? topLetters : FALLBACK_LETTERS;
    }

    const shuffledWheel = shuffle(wheelLetters);
    const wheelCounts = letterCounts(shuffledWheel.join(''));

    const centerScores = {};
    for (const ch of shuffledWheel) {
      centerScores[ch] = 0;
      for (const w of uniqueWords) {
        if (w.includes(ch) && w.length >= 3 && canFormFrom(w, wheelCounts)) {
          centerScores[ch]++;
        }
      }
    }

    const center = shuffledWheel.reduce((best, ch) =>
      (centerScores[ch] || 0) > (centerScores[best] || 0) ? ch : best,
      shuffledWheel[0]
    );

    const outerLetters = shuffledWheel.filter(ch => ch !== center);

    const validWords = uniqueWords.filter(w =>
      w.length >= 3 && w.includes(center) && canFormFrom(w, wheelCounts)
    );

    return NextResponse.json({
      letters: outerLetters,
      center,
      valid_words: validWords,
      valid_count: validWords.length,
    });
  } catch (err) {
    return NextResponse.json({
      letters: FALLBACK_LETTERS,
      center: FALLBACK_CENTER,
      valid_words: [],
      valid_count: 0,
      error: err.message,
    });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { word, letters, center } = body;

    if (!word || !letters || !center) {
      return NextResponse.json({ valid: false, reason: 'بيانات ناقصة' }, { status: 400 });
    }

    const stripped = strip(word.trim());

    if (stripped.length < 3) {
      return NextResponse.json({ valid: false, reason: 'الكلمة قصيرة جداً' });
    }

    if (!isArabic(stripped)) {
      return NextResponse.json({ valid: false, reason: 'حروف غير عربية' });
    }

    if (!stripped.includes(center)) {
      return NextResponse.json({ valid: false, reason: 'الكلمة لا تحتوي على الحرف الأوسط' });
    }

    const allLetters = [...letters, center];
    const wheelCounts = letterCounts(allLetters.join(''));
    if (!canFormFrom(stripped, wheelCounts)) {
      return NextResponse.json({ valid: false, reason: 'الكلمة تستخدم حروفاً خارج العجلة' });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('lexicon_words')
      .select('word');

    if (error) throw error;

    const found = (data ?? []).some(r => strip(r.word || '') === stripped);

    if (!found) {
      return NextResponse.json({ valid: false, reason: 'الكلمة غير موجودة في القاموس' });
    }

    return NextResponse.json({ valid: true, word: stripped });
  } catch (err) {
    return NextResponse.json({ valid: false, reason: 'خطأ في الخادم' }, { status: 500 });
  }
}
