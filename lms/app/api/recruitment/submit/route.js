import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

const INIT_SQL = `
  CREATE TABLE IF NOT EXISTS recruitment_applications (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    email       TEXT        NOT NULL,
    phone       TEXT,
    experience  TEXT,
    specialty   TEXT,
    notes       TEXT,
    cv_path     TEXT,
    status      TEXT        NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

export async function POST(req) {
  try {
    const { name, email, phone, experience, specialty, notes, cvPath } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'الاسم والبريد الإلكتروني مطلوبان' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Ensure table exists (runs as service role)
    await supabase.rpc('exec_sql', { sql: INIT_SQL }).catch(() => {});

    const { error } = await supabase
      .from('recruitment_applications')
      .insert({ name, email, phone, experience, specialty, notes, cv_path: cvPath });

    if (error) {
      // Table likely missing — return the setup SQL so admin can run it
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'جدول الطلبات غير موجود بعد. يرجى تشغيل SQL التهيئة من لوحة /bogga.',
          setupSql: INIT_SQL,
        }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
