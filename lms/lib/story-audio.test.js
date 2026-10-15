import { describe, it, expect, beforeAll } from 'vitest';
import {
  normalizeStoryAudioType, storyAudioPathFromUrl, storyAudioPublicUrl,
  splitStoryPages, normalizePageAudio,
} from './story-audio.js';

const SUPA = 'https://proj.supabase.co';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPA;
});

describe('normalizeStoryAudioType', () => {
  it('يحذف معاملات الترميز من نوع التسجيل', () => {
    expect(normalizeStoryAudioType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(normalizeStoryAudioType('audio/mp4;codecs=mp4a.40.2')).toBe('audio/mp4');
  });

  it('يستنتج النوع من الامتداد حين يكون نوع الملف فارغاً', () => {
    expect(normalizeStoryAudioType('', 'قراءة.m4a')).toBe('audio/mp4');
    expect(normalizeStoryAudioType(undefined, 'story.MP3')).toBe('audio/mpeg');
  });

  it('يرفض الملفات غير الصوتية', () => {
    expect(normalizeStoryAudioType('image/png', 'x.png')).toBeNull();
    expect(normalizeStoryAudioType('text/html', 'x.html')).toBeNull();
  });
});

describe('storyAudioPathFromUrl', () => {
  it('يقبل رابطاً عاماً داخل مجلد صوت القصص ويُرجع مساره', () => {
    const url = storyAudioPublicUrl('stories/audio/abc-1.mp3');
    expect(url).toBe(`${SUPA}/storage/v1/object/public/media/stories/audio/abc-1.mp3`);
    expect(storyAudioPathFromUrl(url)).toBe('stories/audio/abc-1.mp3');
  });

  it('يرفض روابط خارج مجلد صوت القصص أو من نطاق آخر', () => {
    expect(storyAudioPathFromUrl(`${SUPA}/storage/v1/object/public/media/promo.mp4`)).toBeNull();
    expect(storyAudioPathFromUrl(`${SUPA}/storage/v1/object/public/media/stories/audio/../../promo.mp4`)).toBeNull();
    expect(storyAudioPathFromUrl('https://evil.example.com/stories/audio/x.mp3')).toBeNull();
    expect(storyAudioPathFromUrl(null)).toBeNull();
  });
});

describe('splitStoryPages', () => {
  it('يقسّم على فاصل الصفحات ويتجاهل الصفحات الفارغة — نفس فهرسة القارئ', () => {
    const content = '<p>أ</p>\n<!-- PAGE -->\n  \n<!-- PAGE -->\n<p>ب</p>';
    expect(splitStoryPages(content)).toEqual(['<p>أ</p>', '<p>ب</p>']);
    expect(splitStoryPages('')).toEqual([]);
    expect(splitStoryPages(null)).toEqual([]);
  });
});

describe('normalizePageAudio', () => {
  it('يضبط المصفوفة على عدد الصفحات بالضبط مع null للصفحات بلا صوت', () => {
    expect(normalizePageAudio(['a', '', null], 4)).toEqual(['a', null, null, null]);
    expect(normalizePageAudio(['a', 'b', 'c'], 2)).toEqual(['a', 'b']);
    expect(normalizePageAudio(null, 2)).toEqual([null, null]);
    expect(normalizePageAudio([{ x: 1 }, 5], 2)).toEqual([null, null]);
  });
});
