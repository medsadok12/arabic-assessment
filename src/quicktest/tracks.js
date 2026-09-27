// ثلاثة مسارات ثابتة حسب العمر — لا عشوائية، ولا خلط ترتيب داخل أي مسار
// (طلب تربوي صريح من الأستاذ محمد، راجع سجل هذا الملف). كل مسار يحدّد:
// - أسئلة ثابتة (id من بنك الأسئلة الحقيقي questions.js) مع "بُعد تقرير"
//   (dim) مخصَّص لهذا المسار — منفصل عمداً عن skill الفني العام (استماع/
//   مفردات/قراءة/نحو/كتابة) في data/questions.js، لأن تقرير ولي الأمر
//   يحتاج تسميات أبسط وأكثر دلالة تربوية (مثال: "الربط السمعي والاستجابة")
//   قد تجمع أكثر من skill فني واحد تحت بُعد تقرير واحد.
// - توصية ببرنامج تربوي محدد تُعرَض في شاشة النتيجة (راجع QuickTestApp.jsx).
//
// ⚠️ ملاحظة صادقة (نطاق هذه الدفعة): الأسئلة أدناه كلها من مكوّنات موجودة
// فعلياً في الكود (letter-listen-choose/image-matching/listening-
// comprehension/MCQ عادي...). نماذج الأسئلة الأصلية المقترحة من الأستاذ
// محمد (مثل "استمع لصوت الحرف واختر من 3 صور" أو "أين يوجد القط؟" باختيار
// صورة) تحتاج مكوّنات تفاعلية جديدة كلياً (صوت→صورة بدل صوت→حرف نصي) غير
// موجودة بعد — أُنجز هنا أقرب تطبيق ممكن بالمكوّنات الحالية لكل مسار،
// وبُنيت به التوصية التربوية/شاشة النتيجة الجديدة كاملة، على أن تُبنى
// مكوّنات الصوت→صورة الحقيقية في دفعة لاحقة منفصلة (تغيير أكبر في هيكل
// Assessment.jsx ونوع بيانات جديد).

export const TRACKS = {
  buds: {
    id: 'buds',
    label: 'مسار البراعم',
    ageRange: '4-6 سنوات',
    minutesLabel: '~3 دقائق',
    program: 'برنامج البراعم للتأسيس القرائي',
    programPitch: 'ليتمكن من قراءة كلماته الأولى بطلاقة خلال أسابيع قليلة',
    questions: [
      { id: 'L1_EX1', dim: 'sound'  }, // استماع + اختيار حرف
      { id: 'L1_LC',   dim: 'sound'  }, // استماع + اختيار كلمة
      { id: 'L1_EX3',  dim: 'visual' }, // مطابقة صور (أدوات)
      { id: 'L1_VOC1', dim: 'visual' }, // مطابقة صور (حيوانات)
      { id: 'L1_LR',   dim: 'visual' }, // تمييز بصري للحروف
      { id: 'L1_VC',   dim: 'visual' }, // بطاقات الحركات
      { id: 'L1_SK',   dim: 'visual' }, // بطاقات السكون
      { id: 'L1_TW',   dim: 'visual' }, // بطاقات التنوين
    ],
    dimensions: {
      sound:  { label: 'الربط السمعي والاستجابة',        lowInsight: 'تقوية الاستماع الجيد للأصوات والحروف قبل الانتقال لنطقها بنفسه' },
      visual: { label: 'الرصيد اللغوي والتمييز البصري',   lowInsight: 'الانتقال من معرفة الحروف إلى التهجئة وتركيب الكلمات الأولى' },
    },
  },

  explorers: {
    id: 'explorers',
    label: 'مسار المستكشفين',
    ageRange: '7-9 سنوات',
    minutesLabel: '~4 دقائق',
    program: 'برنامج المستكشفين لبناء الطلاقة القرائية',
    programPitch: 'ليقرأ كلمات وجملاً كاملة بثقة ووضوح',
    questions: [
      { id: 'L1_LC', dim: 'sound'     },
      { id: 'L2_1',  dim: 'sound'     },
      { id: 'L2_2',  dim: 'sound'     },
      { id: 'L1_VC', dim: 'words'     },
      { id: 'L1_SK', dim: 'words'     },
      { id: 'V2_1',  dim: 'words'     },
      { id: 'V2_2',  dim: 'words'     },
      { id: 'V2_3',  dim: 'words'     },
      { id: 'G2_2',  dim: 'sentences' },
      { id: 'R2_2',  dim: 'sentences' },
    ],
    dimensions: {
      sound:     { label: 'الفهم السمعي والاستجابة',        lowInsight: 'تقوية الفهم عند الاستماع لجمل وقصص قصيرة' },
      words:     { label: 'بناء الكلمات والتهجئة',          lowInsight: 'تركيب الكلمات من مقاطعها وتهجئتها بثقة' },
      sentences: { label: 'الفهم القريب والجمل القصيرة',    lowInsight: 'الانتقال من فهم الكلمة المفردة إلى فهم الجملة كاملة' },
    },
  },

  creators: {
    id: 'creators',
    label: 'مسار المبدعين',
    ageRange: '10 سنوات فما فوق',
    minutesLabel: '~5 دقائق',
    program: 'برنامج المبدعين لتعزيز الاستيعاب والتعبير',
    programPitch: 'ليقرأ نصوصاً أطول بفهم عميق ويعبّر عن أفكاره بلغة عربية سليمة',
    questions: [
      { id: 'R2_1', dim: 'reading'    },
      { id: 'R2_2', dim: 'reading'    },
      { id: 'R2_3', dim: 'reading'    },
      { id: 'R2_4', dim: 'reading'    },
      { id: 'V2_1', dim: 'vocabulary' },
      { id: 'V2_2', dim: 'vocabulary' },
      { id: 'V2_3', dim: 'vocabulary' },
      { id: 'V2_4', dim: 'vocabulary' },
      { id: 'G2_1', dim: 'structure'  },
      { id: 'G2_3', dim: 'structure'  },
    ],
    dimensions: {
      reading:    { label: 'الاستيعاب القرائي',        lowInsight: 'تعزيز فهم النصوص القصيرة واستخراج الفكرة الرئيسية' },
      vocabulary: { label: 'الرصيد اللغوي والمعاني',    lowInsight: 'توسيع المفردات ومرادفاتها لإثراء التعبير' },
      structure:  { label: 'التراكيب اللغوية والتعبير', lowInsight: 'ترتيب الجمل وبناء التراكيب النحوية السليمة' },
    },
  },
};

/** يختار المسار المناسب لعمر الطفل — لا تداخل بين الحدود. */
export function pickTrack(age) {
  const a = Number(age);
  if (a <= 6) return TRACKS.buds;
  if (a <= 9) return TRACKS.explorers;
  return TRACKS.creators;
}

/**
 * يجمّع الإجابات (بنفس ترتيب track.questions تماماً) حسب "بُعد التقرير"
 * الخاص بالمسار، لا الـskill الفني العام — راجع التعليق أعلى الملف.
 */
export function scoreTrack(track, answers) {
  const dimAgg = {};
  Object.keys(track.dimensions).forEach(d => { dimAgg[d] = { correct: 0, total: 0 }; });

  track.questions.forEach((qMeta, i) => {
    const a = answers[i];
    if (!a) return;
    const agg = dimAgg[qMeta.dim];
    if (!agg) return;
    agg.total++;
    if (a.isCorrect) agg.correct++;
  });

  const dims = Object.entries(dimAgg)
    .map(([key, v]) => ({
      key,
      label: track.dimensions[key].label,
      pct:   v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
      total: v.total,
    }))
    .filter(d => d.total > 0);

  const overall  = dims.length > 0 ? Math.round(dims.reduce((s, d) => s + d.pct, 0) / dims.length) : 0;
  const weakest  = dims.length > 0 ? dims.reduce((min, d) => (d.pct < min.pct ? d : min), dims[0]) : null;
  const insight  = weakest ? track.dimensions[weakest.key].lowInsight : '';

  return { overall, dims, weakest, insight };
}

/** تصنيف نوعي للنسبة — يُستخدم في بطاقة كل بُعد في شاشة النتيجة. */
export function qualitativeLabel(pct) {
  if (pct >= 80) return { text: 'ممتاز جداً', emoji: '🟢' };
  if (pct >= 55) return { text: 'جيد جداً',   emoji: '🟡' };
  return { text: 'بحاجة لتدريب إضافي', emoji: '🔴' };
}
