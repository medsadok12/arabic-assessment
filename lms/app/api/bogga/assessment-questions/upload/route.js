import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { createClient }      from '../../../../../lib/supabase-server';
import { canManageAssessments } from '../../../../../lib/teacher-permissions';

export const dynamic = 'force-dynamic';

// نفس نمط lib/bogga/lexicon/upload بالضبط — Supabase Storage (bucket
// 'media') لا Vercel Blob، لاتساقه مع كل مسارات رفع وسائط لوحة bogga.

const KIND_CONFIG = {
  image: { prefix: 'image/', maxMB: 2, folder: 'assessment-questions' },
  audio: { prefix: 'audio/', maxMB: 3, folder: 'assessment-questions-audio' },
};

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await canManageAssessments(user))) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind');
    const cfg  = KIND_CONFIG[kind];
    if (!cfg) return NextResponse.json({ error: 'نوع الوسائط غير صالح' }, { status: 400 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 });
    }

    if (file.size > cfg.maxMB * 1024 * 1024) {
      return NextResponse.json({ error: `حجم الملف يتجاوز ${cfg.maxMB}MB — يرجى استخدام ملف أصغر` }, { status: 413 });
    }
    if (!file.type?.startsWith(cfg.prefix)) {
      return NextResponse.json({ error: kind === 'image' ? 'يجب أن يكون الملف صورة' : 'يجب أن يكون الملف صوتياً' }, { status: 400 });
    }

    const ext = kind === 'image'
      ? (file.type === 'image/png'  ? 'png'
       : file.type === 'image/gif'  ? 'gif'
       : file.type === 'image/webp' ? 'webp'
       : 'jpg')
      : (file.type === 'audio/wav' ? 'wav'
       : file.type === 'audio/ogg' ? 'ogg'
       : file.type === 'audio/webm' ? 'webm'
       : 'mp3');
    const path = `${cfg.folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const admin = createAdminClient();
    await admin.storage.createBucket('media', { public: true }).catch(() => {});

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error: uploadErr } = await admin.storage
      .from('media')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = admin.storage.from('media').getPublicUrl(path);
    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'فشل رفع الملف' }, { status: 500 });
  }
}
