'use client';

/* تصغير الصورة في المتصفح قبل الرفع (أطول ضلع ≤ maxSize، بصيغة WEBP أو JPG)
   — قاعدة القسم 9.1: الصور تُصغَّر لحجم عرضها الفعلي قبل الرفع، ولا تُخزَّن base64.
   مستخدَمة في محرر الحروف الهجائية وبطاقات المكتبة. */
export async function resizeImageToWebp(file, maxSize = 360, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale  = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const encode = (type, background) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(bitmap, 0, 0, w, h);
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  };
  // سفاري (آيباد/آيفون) لا يُنتج WEBP ويُرجع PNG بدلاً منها — فنعود لـJPG الخفيفة،
  // بخلفية بيضاء لأن JPG لا يدعم الشفافية (وإلا صارت المناطق الشفافة سوداء)
  let blob = await encode('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', '#fff');
  bitmap.close?.();
  if (!blob) throw new Error('تعذّر تجهيز الصورة — جرّب صورة أخرى بصيغة JPG أو PNG');
  return blob;
}
