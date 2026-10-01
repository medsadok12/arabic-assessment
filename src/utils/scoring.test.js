import { describe, it, expect } from 'vitest';
import { calculateLevelScore, applyJumpLogic, evaluateCheckpoint } from './scoring.js';
import { SKILLS } from '../data/questions.js';

describe('calculateLevelScore', () => {
  it('يحتسب 100% عندما تُجاب كل الأسئلة الحاضرة بشكل صحيح، بصرف النظر عن المهارات الغائبة', () => {
    // مستوى يحتوي فقط أسئلة استماع وقراءة (مثل المستوى الأول قبل إصلاح الفجوة) —
    // هذا بالضبط السيناريو الذي كان يحدّ النتيجة عند ~40% قبل التوزيع الديناميكي.
    const answers = [
      { skill: 'listening', isCorrect: true },
      { skill: 'reading',   isCorrect: true },
      { skill: 'reading',   isCorrect: true },
    ];
    const { overall } = calculateLevelScore(answers);
    expect(overall).toBeCloseTo(100, 5);
  });

  it('يستبعد المهارات ذات total=0 من التوزيع ولا يحتسبها صفراً ضمن المتوسط', () => {
    const answers = [
      { skill: 'listening', isCorrect: true },
      { skill: 'reading',   isCorrect: true },
    ];
    const { overall, bySkill } = calculateLevelScore(answers);

    // كل مهارة غائبة (grammar, vocabulary, writing, speaking) يجب أن تُسجَّل
    // total=0 في bySkill، ويجب ألا تُخفّض overall بصفتها "صفراً" ضمن المجموع.
    for (const skill of SKILLS) {
      if (skill.id !== 'listening' && skill.id !== 'reading') {
        expect(bySkill[skill.id].total).toBe(0);
      }
    }
    expect(overall).toBeCloseTo(100, 5);
  });

  it('يحسب النسبة المئوية الصحيحة والمتوسط المرجّح عند وجود إجابات خاطئة', () => {
    const answers = [
      { skill: 'listening', isCorrect: true  },
      { skill: 'listening', isCorrect: false },
      { skill: 'reading',   isCorrect: true  },
    ];
    const { overall, bySkill } = calculateLevelScore(answers);

    expect(bySkill.listening).toMatchObject({ score: 50,  correct: 1, total: 2 });
    expect(bySkill.reading).toMatchObject({ score: 100, correct: 1, total: 1 });
    // بوزنين متساويين (listening وreading فقط حاضرتان): (50 + 100) / 2 = 75
    expect(overall).toBeCloseTo(75, 5);
  });

  it('لا ينهار عند عدم وجود أي إجابات إطلاقاً (حارس القسمة على صفر)', () => {
    const { overall, bySkill } = calculateLevelScore([]);
    expect(overall).toBe(0);
    for (const skill of SKILLS) {
      expect(bySkill[skill.id].total).toBe(0);
    }
  });

  it('يتجاهل إجابات بمهارة غير معروفة بدل أن يكسر الحساب', () => {
    const answers = [
      { skill: 'listening',   isCorrect: true },
      { skill: 'not_a_skill', isCorrect: true },
    ];
    const { overall } = calculateLevelScore(answers);
    expect(overall).toBeCloseTo(100, 5);
  });
});

describe('applyJumpLogic', () => {
  it('يرفع الطالب مستوى واحداً عند بلوغ عتبة الترقية (85%)', () => {
    expect(applyJumpLogic(85, 1)).toBe(2);
    expect(applyJumpLogic(90, 2)).toBe(3);
  });

  it('اختبار الحدود: لا يرفع الطالب فوق المستوى الأقصى (3) إلى مفتاح غير موجود', () => {
    // هذا بالضبط سيناريو الانحدار الذي طلب الأستاذ محمد تغطيته: لو تحوّل
    // الشرط مستقبلاً من `currentLevel < 3` إلى `currentLevel <= 3` سهواً،
    // هذا الاختبار سيفشل فوراً ويكشف أن الطالب يمكن أن يُرفَّع إلى مستوى 4
    // غير موجود في LEVELS (ما يُنتج `undefined` بصمت في واجهة النتائج).
    expect(applyJumpLogic(100, 3)).toBe(3);
    expect(applyJumpLogic(85, 3)).toBe(3);
  });

  it('ينزل الطالب مستوى واحداً عند الهبوط دون عتبة التراجع (70%)', () => {
    expect(applyJumpLogic(69, 3)).toBe(2);
    expect(applyJumpLogic(50, 2)).toBe(1);
  });

  it('اختبار الحدود: لا ينزل الطالب تحت المستوى الأدنى (1)', () => {
    expect(applyJumpLogic(0, 1)).toBe(1);
    expect(applyJumpLogic(69, 1)).toBe(1);
  });

  it('يبقي الطالب في نفس المستوى ضمن المنطقة الوسطى (70% إلى أقل من 85%)', () => {
    expect(applyJumpLogic(70, 2)).toBe(2);
    expect(applyJumpLogic(84, 2)).toBe(2);
  });

  it('حدّا العتبتين أنفسهما: 85% ترقية، 70% ليست تراجعاً (المقارنة صارمة <70)', () => {
    expect(applyJumpLogic(85, 1)).toBe(2); // >= 85 → ترقية
    expect(applyJumpLogic(70, 2)).toBe(2); // == 70 → ليست تراجعاً، تبقى كما هي
  });
});

describe('evaluateCheckpoint', () => {
  it('يعرض "jump" عند نسبة أعلى من 90% في مستوى أقل من 3', () => {
    expect(evaluateCheckpoint(0.95, 1)).toBe('jump');
    expect(evaluateCheckpoint(0.91, 2)).toBe('jump');
  });

  it('اختبار الحدود: لا يعرض "jump" أبداً في المستوى 3 (لا مستوى أعلى منه)', () => {
    // نفس فلسفة اختبار applyJumpLogic أعلاه — لو أصبح الشرط currentLevel <= 3
    // سهواً، سيُعرض على الطالب خيار "انتقال" إلى مستوى 4 غير موجود.
    expect(evaluateCheckpoint(1, 3)).toBeNull();
    expect(evaluateCheckpoint(0.99, 3)).toBeNull();
  });

  it('حدّ عتبة الترقية نفسه: 90% بالضبط ليست "jump" (المقارنة صارمة >90)', () => {
    expect(evaluateCheckpoint(0.9, 1)).toBeNull();
  });

  it('يعرض "drop" عند نسبة أقل من 20% في المستويين 2 أو 3 تحديداً', () => {
    expect(evaluateCheckpoint(0.1, 2)).toBe('drop');
    expect(evaluateCheckpoint(0.05, 3)).toBe('drop');
  });

  it('لا يعرض "drop" أبداً في المستوى 1 (لا مستوى أدنى منه) مهما ضعفت النسبة', () => {
    expect(evaluateCheckpoint(0, 1)).toBeNull();
    expect(evaluateCheckpoint(0.05, 1)).toBeNull();
  });

  it('حدّ عتبة الإنزال نفسه: 20% بالضبط ليست "drop" (المقارنة صارمة <20)', () => {
    expect(evaluateCheckpoint(0.2, 2)).toBeNull();
  });

  it('لا إجراء في المنطقة الوسطى (20% إلى 90%)', () => {
    expect(evaluateCheckpoint(0.5, 1)).toBeNull();
    expect(evaluateCheckpoint(0.5, 2)).toBeNull();
    expect(evaluateCheckpoint(0.5, 3)).toBeNull();
  });
});
