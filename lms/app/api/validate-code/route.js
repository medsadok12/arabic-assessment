// الأكواد المفعّلة — أضف أو احذف من هذه القائمة حسب الحاجة
const ACTIVE_CODES = [
  'AAREM2026',
];

export async function POST(request) {
  try {
    const { code } = await request.json();
    const valid = ACTIVE_CODES.includes(code?.trim().toUpperCase());
    return Response.json({ valid });
  } catch {
    return Response.json({ valid: false }, { status: 400 });
  }
}
