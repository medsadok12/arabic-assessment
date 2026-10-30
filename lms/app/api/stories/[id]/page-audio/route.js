import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { requireStoryEditor } from '../../../../../lib/story-auth';
import { splitStoryPages, setPageAudioAt, storyAudioPathFromUrl } from '../../../../../lib/story-audio';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT { page, url } — يحفظ صوت صفحة واحدة في القصة فور اكتمال رفعه من المحرر الكامل،
// فلا يتوقف وصوله للطلاب على زر «حفظ التغييرات». page = فهرس الصفحة في المحتوى
// المحفوظ على الخادم. لا يمسّ المحتوى ولا أصوات بقية الصفحات.
// درس 2026-10-16: «حفظ التغييرات» أثناء رفع صوت الصفحة 1 من قصة «فَهيم» حفظ القصة
// بلا صوت، فبقي الملف في التخزين ولم يُربط بالقصة.
export async function PUT(req, { params }) {
  try {
    const { error: authError } = await requireStoryEditor();
    if (authError) return authError;

    const { id } = params;
    if (!UUID_RE.test(String(id))) return NextResponse.json({ error: 'معرّف القصة غير صالح' }, { status: 400 });

    let body;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }
    const { page, url } = body || {};
    if (!storyAudioPathFromUrl(url)) return NextResponse.json({ error: 'رابط صوت غير صالح' }, { status: 400 });

    const admin = createAdminClient();
    const { data: current, error: curErr } = await admin
      .from('stories').select('content, page_audio').eq('id', id).maybeSingle();
    if (curErr) throw curErr;
    if (!current) return NextResponse.json({ error: 'القصة غير موجودة' }, { status: 404 });

    const next = setPageAudioAt(current.page_audio, splitStoryPages(current.content).length, page, url);
    if (!next) return NextResponse.json({ error: 'هذه الصفحة غير محفوظة في القصة بعد' }, { status: 409 });

    const { data, error } = await admin
      .from('stories')
      .update({ page_audio: next, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ story: data });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل حفظ الصوت' }, { status: 500 });
  }
}
