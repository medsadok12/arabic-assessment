export const dynamic = 'force-dynamic';

import { createAdminClient } from '../../../../lib/supabase-admin';
import { notify }            from '../../../../lib/notify';

const ACTIONS = {
  confirm: { value: 'confirmed',  label: 'تمّ تأكيد حضورك بنجاح' },
  reject:  { value: 'rejected',   label: 'تمّ تسجيل اعتذارك' },
};

function page(icon, title, body, color = '#185FA5') {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>أكاديمية عارم</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#f4f7fc;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
    .card{background:#fff;border-radius:18px;padding:44px 36px;max-width:460px;width:100%;
          text-align:center;box-shadow:0 6px 32px rgba(24,95,165,.13)}
    .icon{font-size:3.2rem;margin-bottom:18px;line-height:1}
    h1{font-size:1.3rem;font-weight:800;color:${color};margin-bottom:12px}
    p{color:#475569;font-size:.96rem;line-height:1.8}
    .footer{margin-top:28px;font-size:.78rem;color:#9ca3af}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${body}</p>
    <div class="footer">أكاديمية عارم للتعليم — جميع الحقوق محفوظة</div>
  </div>
</body>
</html>`;
}

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token  = (searchParams.get('token') ?? '').trim();
  const action = (searchParams.get('action') ?? '').trim();

  if (!token || !ACTIONS[action]) {
    return html(page('⚠️', 'رابط غير صالح',
      'تأكد من صحة الرابط أو تواصل مع أكاديمية عارم مباشرةً.', '#b91c1c'), 400);
  }

  const admin = createAdminClient();
  const { data: iv, error } = await admin
    .from('interviews')
    .select('id, candidate_response')
    .eq('response_token', token)
    .single();

  if (error || !iv) {
    return html(page('⚠️', 'الرابط منتهي الصلاحية',
      'لم نتمكن من العثور على هذه المقابلة. قد يكون الرابط منتهي الصلاحية، يُرجى التواصل مع الأكاديمية.', '#b91c1c'), 404);
  }

  if (iv.candidate_response !== 'pending') {
    return html(page('ℹ️', 'تمّ التسجيل مسبقاً',
      'لقد سبق أن أرسلت ردّك على هذه الدعوة. إذا كنت ترغب في تعديل ردّك يُرجى التواصل معنا مباشرةً.', '#6b7280'));
  }

  const { error: updErr } = await admin
    .from('interviews')
    .update({ candidate_response: ACTIONS[action].value, updated_at: new Date().toISOString() })
    .eq('id', iv.id);

  if (updErr) {
    return html(page('⚠️', 'حدث خطأ',
      'تعذّر تسجيل ردّك في الوقت الحالي. يُرجى المحاولة مجدداً أو التواصل معنا مباشرةً.', '#b91c1c'), 500);
  }

  const icon = action === 'confirm' ? '✅' : '😔';
  const body = action === 'confirm'
    ? 'شكراً لتأكيدك الحضور، نتطلع إلى لقائك في الموعد المحدد. سيتواصل معك فريقنا لتزويدك بأي تفاصيل إضافية.'
    : 'نقدّر إخبارك لنا مسبقاً، ونتمنى لك التوفيق في مسيرتك المهنية.';
  const color = action === 'confirm' ? '#1a7c40' : '#475569';

  const notifTitle = action === 'confirm' ? '✅ مترشح أكّد حضوره' : '❌ مترشح اعتذر عن الحضور';
  await notify('interview', notifTitle, null, { interview_id: iv.id, action });

  return html(page(icon, ACTIONS[action].label, body, color));
}
