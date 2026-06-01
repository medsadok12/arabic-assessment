import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export async function POST(req) {
  try {
    const { filename, contentType } = await req.json();
    if (!filename || contentType !== 'application/pdf') {
      return NextResponse.json({ error: 'ملف PDF فقط مقبول' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path     = `applications/${Date.now()}-${safeName}`;

    const { data, error } = await supabase.storage
      .from('recruitment-cvs')
      .createSignedUploadUrl(path);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ signedUrl: data.signedUrl, path, token: data.token });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
