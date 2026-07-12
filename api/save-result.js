import { createSign } from 'crypto';

async function saveToSupabase(d) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        student_name:  d.studentName || 'غير معروف',
        student_email: d.email ? String(d.email).trim().toLowerCase() : null,
        level:         d.finalLevel  || 1,
        score:         Math.round((d.overallScore ?? 0) * 10) / 10,
      }),
    });
  } catch (_) {}
}

async function getToken() {
  let creds;
  try { creds = JSON.parse(process.env.GOOGLE_SA_KEY); }
  catch { throw new Error('GOOGLE_SA_KEY invalid'); }
  if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');

  const now   = Math.floor(Date.now() / 1000);
  const claim = {
    iss:   creds.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  };
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const input   = `${header}.${payload}`;
  const signer  = createSign('RSA-SHA256');
  signer.update(input);
  const jwt = `${input}.${signer.sign(creds.private_key, 'base64url')}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || JSON.stringify(data));
  return { token: data.access_token, email: creds.client_email };
}

async function appendRow(token, sheetId, row) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ values: [row] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const d = req.body;

  // تقييمات المستخدمين المسجَّلين في الـLMS (تحمل user_id) تُحفظ عبر مسار
  // save-assessment هناك، فتُستثنى هنا لتفادي تكرار الصف. أي تقييم آخر (زائر
  // مجهول على assessment.aarem.net، وهو الغالبية) يُدرَج مباشرة من هنا —
  // هذا هو مسار الحفظ الوحيد الفعلي له، فلا يُحذف أو يُشرَط بأكثر من ذلك.
  if (!d.user_id) await saveToSupabase(d);

  // إذا لم يُضبط SHEETS_ID بعد نتجاهل بصمت
  if (!process.env.SHEETS_ID || !process.env.GOOGLE_SA_KEY)
    return res.status(200).json({ success: true, note: 'Sheets not configured' });

  try {
    const { token } = await getToken();
    const skillRows  = Object.values(d.bySkill || {}).map(s => Math.round(s.score) + '%');

    // رأس الجدول في الصف الأول تلقائياً إذا كان فارغاً
    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${process.env.SHEETS_ID}/values/A1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const sheetData = await sheetRes.json();
    const isEmpty   = !sheetData.values || sheetData.values.length === 0;

    if (isEmpty) {
      const skillNames = Object.values(d.bySkill || {}).map(s => s.name);
      await appendRow(token, process.env.SHEETS_ID, [
        'التاريخ', 'الاسم', 'العمر', 'نوع المتعلم', 'البريد',
        'النتيجة الكلية', 'المستوى', 'مسار التقييم', ...skillNames,
      ]);
    }

    await appendRow(token, process.env.SHEETS_ID, [
      new Date().toLocaleDateString('ar-SA-u-nu-latn'),
      d.studentName || '',
      d.age         || '',
      d.learnerType || '',
      d.email       || '',
      Math.round(d.overallScore) + '%',
      'المستوى ' + d.finalLevel,
      d.levelPath   || '',
      ...skillRows,
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Sheets error:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
}
