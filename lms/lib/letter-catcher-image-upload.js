'use client';

// Keep the source useful on high-density phones and larger game previews.
// A contained image on white also gives transparent teacher uploads safe margins.
export const LC_WORD_IMAGE_SIZE = 1024;
export const LC_WORD_IMAGE_PADDING = 82;
const QUALITY = 0.88;
const PREPARE_ERROR = 'تعذّر تجهيز الصورة — جرّب صورة أخرى بصيغة JPG أو PNG';

export async function prepareLetterCatcherImageUpload(file) {
  const bitmap = await createImageBitmap(file);
  try {
    if (!(bitmap.width > 0 && bitmap.height > 0)) throw new Error(PREPARE_ERROR);

    const canvas = document.createElement('canvas');
    canvas.width = LC_WORD_IMAGE_SIZE;
    canvas.height = LC_WORD_IMAGE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(PREPARE_ERROR);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, LC_WORD_IMAGE_SIZE, LC_WORD_IMAGE_SIZE);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const available = LC_WORD_IMAGE_SIZE - LC_WORD_IMAGE_PADDING * 2;
    const scale = Math.min(available / bitmap.width, available / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    ctx.drawImage(bitmap, (LC_WORD_IMAGE_SIZE - width) / 2,
      (LC_WORD_IMAGE_SIZE - height) / 2, width, height);

    const encode = type => new Promise((resolve, reject) => {
      try { canvas.toBlob(resolve, type, QUALITY); }
      catch (error) { reject(error); }
    });
    let blob;
    try { blob = await encode('image/webp'); }
    catch { blob = null; }
    // Some browsers silently return PNG when WebP encoding is unsupported.
    if (blob?.type !== 'image/webp') blob = await encode('image/jpeg');
    if (!blob || !['image/webp', 'image/jpeg'].includes(blob.type)) {
      throw new Error(PREPARE_ERROR);
    }
    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return { blob, fileName: `word-${Date.now()}.${extension}` };
  } finally {
    bitmap.close?.();
  }
}
