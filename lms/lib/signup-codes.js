/* ════════════════════════════════════════════════════════════════
   هل يُطلب الكود؟ — مفتاح واحد يتحكم فيه المدير من bogga (تبويب الأكواد)
   ويقرؤه كل من: تسجيل الطالب بالبريد، استكمال تسجيل Google، والتقييم
   التشخيصي (assessment.aarem.net). الإخفاء لا يلغي شيئاً: الأكواد ومنطق
   التحقق منها واستهلاكها باقية كما هي وتعود بمجرد إعادة التفعيل.
   كود المعلم مطلوب دائماً (دور المعلم صلاحيات طاقم) — خارج هذا المفتاح.
   التخزين: platform_settings صف key = 'signup_codes' (lms/supabase/platform_settings.sql).
════════════════════════════════════════════════════════════════ */

export const SIGNUP_CODES_KEY = 'signup_codes';

// غياب الإعداد أو تعذّر قراءته = السلوك الأصلي: الكود مطلوب
export const DEFAULT_SIGNUP_CODES = {
  student_code_required:    true,
  assessment_code_required: true,
};

export function normalizeSignupCodes(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const pick = (k) => (typeof r[k] === 'boolean' ? r[k] : DEFAULT_SIGNUP_CODES[k]);
  return {
    student_code_required:    pick('student_code_required'),
    assessment_code_required: pick('assessment_code_required'),
  };
}

/* الإعداد الحالي من القاعدة (عميل service_role) — أي خطأ يعيد الافتراضي */
export async function loadSignupCodes(admin) {
  try {
    const { data, error } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', SIGNUP_CODES_KEY)
      .maybeSingle();
    if (error) return { ...DEFAULT_SIGNUP_CODES };
    return normalizeSignupCodes(data?.value);
  } catch {
    return { ...DEFAULT_SIGNUP_CODES };
  }
}
