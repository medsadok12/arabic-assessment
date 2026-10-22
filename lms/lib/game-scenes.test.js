import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SCENES, sceneFor, normalizeArabic } from './game-scenes.js';
import GameScene, { SceneThumb, SCENE_VEIL } from '../components/GameScene.jsx';

/* عوالم الألعاب: كل مجموعة يكتبها المعلم تجد مشهدها، وكل مشهد يُرسم */

describe('ربط المجموعات بالعوالم', () => {
  it('مجموعات «صيّاد الحروف» الحالية في الإنتاج — كلٌّ بعالمه', () => {
    expect(Object.fromEntries([
      'الحيوانات', 'أدوات', 'الأماكن والمدن', 'الرّياضة والألعاب', 'الغلال', 'المهن', 'الملابس والزّينة',
      'الفلاحة', 'الخضروات', 'الطقس', 'الأشكال', 'الأسرة', 'الألوان', 'الأرقام',
    ].map(c => [c, sceneFor(c)]))).toEqual({
      'الحيوانات': 'savanna', 'أدوات': 'workshop', 'الأماكن والمدن': 'city', 'الرّياضة والألعاب': 'sports',
      'الغلال': 'orchard', 'المهن': 'jobs', 'الملابس والزّينة': 'clothes', 'الفلاحة': 'farm',
      'الخضروات': 'garden', 'الطقس': 'weather', 'الأشكال': 'shapes', 'الأسرة': 'family',
      'الألوان': 'colors', 'الأرقام': 'numbers',
    });
  });
  it('صيغ أخرى يكتبها المعلم: العائلة، الأدوات المدرسية، حيوانات البحر، الفواكه', () => {
    expect(sceneFor('العائلة')).toBe('family');
    expect(sceneFor('الأدوات المدرسية')).toBe('school');
    expect(sceneFor('حيوانات البحر')).toBe('sea');
    expect(sceneFor('الفواكه')).toBe('orchard');
    expect(sceneFor('المنزل')).toBe('family');
  });
  it('مجموعة جديدة لا نعرفها، أو بلا مجموعة ← المرج الافتراضي', () => {
    expect(sceneFor('الفضاء')).toBe('meadow');
    expect(sceneFor('')).toBe('meadow');
    expect(sceneFor(null)).toBe('meadow');
  });
  it('التطبيع: تشكيل وشدّة وهمزات وتاء مربوطة', () => {
    expect(normalizeArabic('الرِّيَاضَةُ')).toBe('الرياضه');
    expect(normalizeArabic('أَسْرَة')).toBe('اسره');
  });
});

describe('رسم العوالم', () => {
  it.each(SCENES)('%s يُرسم صورةً كاملة بلا أخطاء', (scene) => {
    const html = renderToStaticMarkup(createElement(GameScene, { scene }));
    expect(html).toContain(`data-scene="${scene}"`);
    expect(html).toContain('<svg');
    expect(html).toContain('aria-hidden="true"');
    expect(html.length).toBeGreaterThan(1500);
  });
  it('بالمجموعة مباشرة: «أدوات» ← الورشة', () => {
    expect(renderToStaticMarkup(createElement(GameScene, { category: 'أدوات' }))).toContain('data-scene="workshop"');
  });
  it('خلفية اللعب باهتة (غلالة كريمية 65٪) فلا تشتّت الطفل، والصورة المصغّرة للعالم زاهية', () => {
    expect(SCENE_VEIL).toBe('rgba(244,239,230,0.65)');
    expect(renderToStaticMarkup(createElement(GameScene, { scene: 'colors' }))).toContain('data-scene-veil');
    expect(renderToStaticMarkup(createElement(SceneThumb, { scene: 'colors' }))).not.toContain('data-scene-veil');
  });
});
