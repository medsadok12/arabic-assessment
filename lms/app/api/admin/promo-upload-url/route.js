import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST() {
  const supabase = getClient();

  // Create bucket if it doesn't exist yet
  await supabase.storage.createBucket('media', { public: true }).catch(() => {});

  const { data, error } = await supabase.storage
    .from('media')
    .createSignedUploadUrl('promo.mp4', { upsert: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ signedUrl: data.signedUrl });
}
