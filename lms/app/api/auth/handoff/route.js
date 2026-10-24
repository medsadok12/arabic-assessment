import { NextResponse }       from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies }            from 'next/headers';
import { createAdminClient }  from '../../../../lib/supabase-admin';
import { getClientIP, ipRateCheck } from '../../../../lib/ip-rate-check';
import { readHandoff, handoffDecision } from '../../../../lib/login-handoff';
import { dashboardPathFor } from '../../../../lib/email-confirm';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const reply = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/auth/handoff  { token }
 * صفحة «تحقق من بريدك» تسأل هنا كل بضع ثوانٍ وعند العودة إليها (lib/login-handoff.js):
 *   { pending: true }            البريد لم يُؤكَّد بعد
 *   { ok: true, redirect }       تأكّد — فُتحت الجلسة في هذا المتصفح (كوكيز الرد)
 *   { expired: true } (410)      تذكرة منتهية/غير صالحة — الدخول اليدوي كما كان
 * الجلسة تُفتح على الخادم برابط دخول لمرة واحدة (generateLink لا يرسل بريداً)
 * يُتحقَّق منه فوراً — لا يصل أي رمز للمتصفح.
 */
export async function POST(req) {
  const ip = getClientIP(req);
  if (!await ipRateCheck(ip, 'rl:handoff', 40, 400)) {
    return reply({ pending: true, slow: true }, 429);
  }

  const { token } = (await req.json().catch(() => null)) || {};
  const ticket = readHandoff(token);
  if (!ticket) return reply({ expired: true }, 410);

  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(ticket.userId);
    const account = data?.user ?? null;
    const decision = handoffDecision(account, ticket.issuedAt);
    if (decision === 'wait') return reply({ pending: true });
    if (decision !== 'open') return reply({ expired: true }, 410);

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: account.email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) throw new Error(linkErr?.message || 'no link');

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(toSet) {
            try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );
    const { data: verified, error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
    if (error || !verified?.user) throw new Error(error?.message || 'verify failed');

    return reply({ ok: true, redirect: dashboardPathFor(verified.user) });
  } catch (e) {
    console.error('[auth/handoff]', e.message);
    // خلل عابر — تبقى الصفحة تنتظر وتعيد المحاولة
    return reply({ pending: true, retry: true }, 503);
  }
}
