// خادم Supabase وهمي لاختبارات المتصفح المحلية (بلا قاعدة حقيقية ولا أسرار).
// - /auth/v1/user يُرجع المستخدم حسب الرمز: student-token | teacher-token | admin-token
// - صور التخزين العامة/الموقّعة تُخدم بصورة SVG صغيرة، والرفع يُقبل ويُسجَّل (GET /__uploads)
// - أي استعلام /rest/ آخر يُرجع [] — وتُحاكى مسارات /api/* من Playwright بـ page.route
// التشغيل: node mock-supabase.mjs   (المنفذ 54321، أو MOCK_SB_PORT)
import http from 'node:http';

const PORT = Number(process.env.MOCK_SB_PORT || 54321);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="12" fill="#7C5CD9"/></svg>');
const uploads = [];
const base = { aud: 'authenticated', role: 'authenticated', email_confirmed_at: '2026-10-01T00:00:00Z' };
export const USERS = {
  'student-token': { ...base, id: 'f4db077e-8016-4abc-94b7-1f53e8b040b6', email: 'kid@test.local', app_metadata: { role: 'student' }, user_metadata: { full_name: 'سارة', grade: 4 } },
  'teacher-token': { ...base, id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 't@test.local', app_metadata: { role: 'teacher' }, user_metadata: { full_name: 'أ. محمد' } },
  'admin-token':   { ...base, id: 'aaaaaaaa-0000-4000-8000-0000000000ad', email: 'a@test.local', app_metadata: { role: 'admin' }, user_metadata: {} },
};

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  const json = (code, body) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const u = req.url;
  if (u.startsWith('/storage/v1/object/public/') || u.startsWith('/storage/v1/object/sign/')) {
    res.writeHead(200, { ...cors, 'Content-Type': 'image/svg+xml' }); return res.end(SVG);
  }
  if (u.startsWith('/storage/v1/object/')) { uploads.push(`${req.method} ${u}`); req.resume(); return json(200, { Key: u }); }
  if (u === '/__uploads') return json(200, uploads);
  const tok = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (u.startsWith('/auth/v1/user') && USERS[tok]) return json(200, USERS[tok]);
  if (u.startsWith('/auth/')) return json(401, {});
  return json(u.startsWith('/rest/') ? 200 : 404, u.startsWith('/rest/') ? [] : {});
}).listen(PORT, '127.0.0.1', () => console.log(`mock supabase on ${PORT}`));
