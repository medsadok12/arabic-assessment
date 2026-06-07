/**
 * Story image generation engine
 * Flow: Arabic text → Gemini (EN prompt) → FAL.ai queue → Supabase Storage
 */

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const FAL_KEY    = process.env.FAL_API_KEY;
const FAL_MODEL  = 'fal-ai/flux/schnell';
const STYLE      = 'flat vector illustration, warm pastel colors, Arabic children\'s picture book style ages 4-8, simple friendly shapes, no text or letters in image, clean soft background';

/* ── 1. Build English image prompt from Arabic page text ───────────────── */
export async function buildPrompt(pageText, storyTitle) {
  if (!GEMINI_KEY) {
    return `Children's book scene: ${storyTitle}. ${pageText}. ${STYLE}`;
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text:
            `You are a children's book illustrator assistant for an Arabic learning app.
Story title: "${storyTitle}"
Page Arabic text: "${pageText}"

Write a short English image-generation prompt (max 50 words).
Describe: main subject, action, setting, mood — in a warm, cheerful, child-friendly way.
End with: "${STYLE}"
Output ONLY the prompt. No explanations.` }] }],
          generationConfig: { maxOutputTokens: 120, temperature: 0.65 },
        }),
      }
    );
    const json = await res.json();
    const base = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return base || `Cute scene for "${storyTitle}": ${pageText}. ${STYLE}`;
  } catch {
    return `Cute scene for "${storyTitle}": ${pageText}. ${STYLE}`;
  }
}

/* ── 2. Submit generation job to FAL.ai queue (returns request_id) ──────── */
export async function falSubmit(prompt) {
  if (!FAL_KEY) throw new Error('FAL_API_KEY غير مضاف في Vercel');
  const res = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: 'square_hd', num_inference_steps: 4, num_images: 1 }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.status);
    throw new Error(`FAL submit failed: ${err}`);
  }
  const data = await res.json();
  return data.request_id;
}

/* ── 3. Check FAL.ai queue status ──────────────────────────────────────── */
export async function falStatus(requestId) {
  const res = await fetch(
    `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}/status`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );
  const data = await res.json();
  return data.status; // IN_QUEUE | IN_PROGRESS | COMPLETED | FAILED
}

/* ── 4. Fetch result URL from FAL.ai ────────────────────────────────────── */
export async function falResult(requestId) {
  const res = await fetch(
    `https://queue.fal.run/${FAL_MODEL}/requests/${requestId}`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );
  const data = await res.json();
  return data?.images?.[0]?.url ?? null;
}

/* ── 5. Download image and upload to Supabase Storage ───────────────────── */
export async function saveToStorage(imageUrl, storySlug, pageNumber, admin) {
  // Ensure bucket exists (public)
  await admin.storage.createBucket('story-images', { public: true }).catch(() => null);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error('تعذّر تحميل الصورة المولّدة');
  const buffer = await imgRes.arrayBuffer();
  const path   = `${storySlug}/page-${pageNumber}.jpg`;

  const { error } = await admin.storage
    .from('story-images')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data: { publicUrl } } = admin.storage.from('story-images').getPublicUrl(path);
  return publicUrl;
}
