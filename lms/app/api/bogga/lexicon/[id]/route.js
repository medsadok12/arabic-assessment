import { NextResponse } from 'next/server';
import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole } from '../../../../../lib/auth-role';

async function getUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — full word including media base64 (used by edit form)
export async function GET(req, { params }) {
  const user = await getUser();
  const role = getRole(user);
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'غير مخول' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('lexicon_words')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'الكلمة غير موجودة' }, { status: 404 });
  return NextResponse.json({ word: data });
}

// PATCH — update word (super_admin only)
export async function PATCH(req, { params }) {
  const user = await getUser();
  if (getRole(user) !== 'super_admin') {
    return NextResponse.json({ error: 'لا تملك صلاحية التعديل' }, { status: 403 });
  }

  const body = await req.json();
  const { word, word_type, sentence, topic, grade_from, grade_to, syllables, root,
          image_data, audio_data, clear_image, clear_audio } = body;

  const payload = {
    word: word?.trim(), word_type,
    sentence: sentence?.trim() || null, topic,
    grade_from: +grade_from, grade_to: +grade_to,
    syllables: syllables?.trim() || null, root: root?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // Media: only update if explicitly changed or cleared.
  // image_data/audio_data روابط Storage الآن (عبر api/bogga/lexicon/upload)،
  // لا base64 — راجع الملاحظة المطابقة في route.js (POST).
  let mediaPayload = {};
  if (image_data)    { mediaPayload.image_base64 = image_data;  mediaPayload.has_image = true;  }
  else if (clear_image) { mediaPayload.image_base64 = null;      mediaPayload.has_image = false; }
  if (audio_data)    { mediaPayload.audio_base64 = audio_data;  mediaPayload.has_audio = true;  }
  else if (clear_audio) { mediaPayload.audio_base64 = null;      mediaPayload.has_audio = false; }

  const admin = createAdminClient();
  let { error } = await admin.from('lexicon_words').update({ ...payload, ...mediaPayload }).eq('id', params.id);

  // Fallback: media columns don't exist → update text fields only
  let mediaSkipped = false;
  if (error?.message?.includes('image_base64') || error?.message?.includes('audio_base64') ||
      error?.message?.includes('has_image')    || error?.message?.includes('has_audio') ||
      error?.message?.includes('Could not find')) {
    mediaSkipped = true;
    ({ error } = await admin.from('lexicon_words').update(payload).eq('id', params.id));
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, media_skipped: mediaSkipped });
}

// DELETE — delete word (super_admin only)
export async function DELETE(req, { params }) {
  const user = await getUser();
  if (getRole(user) !== 'super_admin') {
    return NextResponse.json({ error: 'لا تملك صلاحية الحذف' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('lexicon_words').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
