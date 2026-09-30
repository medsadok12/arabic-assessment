// بوابة دخول مستقلة لاستبانة "الاستشارة التعليمية" التسويقية
// (assessment.aarem.net/?survey=1) — بنفس نمط ?quick=1 في quickTestMode.js،
// رابط منفصل تماماً لتوجيه حملات إعلانية مباشرة إليه دون المرور بأي كود
// تقييم أو تدفق آخر.

export function isConsultationSurveyMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('survey') === '1';
}
