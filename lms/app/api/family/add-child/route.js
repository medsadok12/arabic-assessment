import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notify }            from '../../../../lib/notify';

function randomToken(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/**
 * POST /api/family/add-child
 *
 * يضيف طفلاً ثانياً (أو أكثر) لعائلة الحساب المسجَّل دخوله حالياً، بلا أي
 * بريد إلكتروني أو كلمة مرور جديدة يكتبها الوالد:
 *   1. يتحقق من كود تسجيل الطالب العادي (نفس نظام الأكواد الحالي).
 *   2. ينشئ حساب alias داخلي (بريد مشتق من بريد الوالد + رمز عشوائي) —
 *      مؤكَّد تلقائياً فوراً (email_confirm:true) لأن جلسة الوالد الحيّة
 *      الحالية هي الإثبات نفسه، فلا حاجة لإرسال أي بريد تحقق ثانٍ (وهذا
 *      يتفادى مشكلة عدم دعم بعض مزوّدي البريد لخاصية "+alias").
 *   3. صف students الجديد: id = نفس auth.users.id للحساب الجديد (فلا
 *      حاجة لعمود ربط إضافي)، parent_user_id = الحساب الجذر الحالي.
 *
 * Body: { name, age, grade?, invitationCode }
 */
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'طلب غير صالح' }, { status: 400 }); }

  const { name, age, grade, invitationCode } = body;
  if (!name?.trim() || !age?.toString().trim() || !invitationCode?.trim()) {
    return Response.json({ error: 'اسم الطفل وعمره وكود الأكاديمية كلها مطلوبة' }, { status: 400 });
  }

  const admin = createAdminClient();
  const code  = invitationCode.trim().toUpperCase();

  // ── الخطوة 1: استهلاك كود التسجيل ذرّياً — نفس القفل المستخدم في كل مسارات التسجيل ──
  const { data: claimed, error: claimErr } = await admin
    .from('student_invitation_codes')
    .update({ is_used: true })
    .eq('code', code)
    .eq('is_used', false)
    .select('id')
    .maybeSingle();

  if (claimErr || !claimed) {
    return Response.json({
      error: 'كود التسجيل غير صحيح أو تم استخدامه من قبل، يرجى التواصل مع إدارة الأكاديمية',
    }, { status: 400 });
  }

  // ── الخطوة 2: إنشاء حساب الطفل الداخلي — مؤكَّد فوراً، بلا بريد تحقق ──
  const [local, domain] = (user.email ?? '').split('@');
  let created = null, signupErr = null;
  for (let attempt = 0; attempt < 3 && !created; attempt++) {
    const aliasEmail = `${local}+${randomToken(6)}@${domain}`;
    const result = await admin.auth.admin.createUser({
      email: aliasEmail,
      password: randomToken(24) + randomToken(24), // لا يُستخدم أبداً — الدخول فقط عبر مبدّل العائلة
      user_metadata: {
        full_name: name.trim(),
        age: age.toString().trim(),
        grade: grade ? grade.toString().trim() : null,
        onboarding_complete: true,
        is_family_member: true,
        family_root_email: (user.email ?? '').toLowerCase(),
      },
      app_metadata: { role: 'student' },
      email_confirm: true,
    });
    if (!result.error) { created = result.data; break; }
    signupErr = result.error;
    if (!signupErr.message?.toLowerCase().includes('already registered')) break;
    signupErr = null; // تصادم عشوائي نادر جداً في alias — أعد المحاولة برمز جديد
  }

  if (!created?.user) {
    await admin.from('student_invitation_codes').update({ is_used: false }).eq('id', claimed.id);
    return Response.json({ error: signupErr?.message || 'تعذّر إنشاء حساب الطفل — حاول مجدداً' }, { status: 500 });
  }

  // ── الخطوة 3: تسجيل من استهلك الكود ──
  await admin
    .from('student_invitation_codes')
    .update({
      used_by: created.user.id,
      used_by_name: name.trim(),
      used_by_email: created.user.email,
      used_at: new Date().toISOString(),
    })
    .eq('id', claimed.id);

  // ── الخطوة 4: صف students — id مطابق لـauth.users.id نفسه عمداً ──
  const { error: studentErr } = await admin.from('students').insert({
    id: created.user.id,
    parent_user_id: user.id,
    full_name: name.trim(),
    age: Number(age) || null,
    grade: grade ? Number(grade) : null,
  });

  if (studentErr) {
    // نادر جداً — نتراجع بالكامل لتفادي حساب يتيم بلا صف students
    await admin.auth.admin.deleteUser(created.user.id);
    await admin
      .from('student_invitation_codes')
      .update({ is_used: false, used_by: null, used_by_name: null, used_by_email: null, used_at: null })
      .eq('id', claimed.id);
    return Response.json({ error: 'تعذّر إنشاء ملف الطفل — حاول مجدداً' }, { status: 500 });
  }

  await notify(
    'family',
    '👨‍👩‍👧 طفل جديد أُضيف لعائلة',
    `${name.trim()} — عائلة ${user.email}`,
    { childId: created.user.id, rootEmail: user.email }
  );

  return Response.json({ success: true, childId: created.user.id, childName: name.trim() });
}
