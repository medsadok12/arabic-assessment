// بوابة دخول مستقلة لمعاينة "اختبار المهارات — المستوى المبتدئ"
// (assessment.aarem.net/?skills=beginner) — بنفس نمط ?quick=1/?survey=1،
// معزولة تماماً عن تدفق التقييم المدفوع الحقيقي (App.jsx) لغرض المعاينة
// والتثبت من الأداء قبل أي قرار بدمجها في نظام التقييم الرئيسي.

export function isBeginnerSkillsMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('skills') === 'beginner';
}
