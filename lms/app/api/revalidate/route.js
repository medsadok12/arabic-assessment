import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

// POST /api/revalidate
// Header: x-revalidate-secret: <REVALIDATE_SECRET>
// يستخدم من لوحة الإدارة بعد تعديل أي بيانات تظهر في الداشبورد
export async function POST(request) {
  const secret = request.headers.get('x-revalidate-secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path = '/dashboard' } = await request.json().catch(() => ({}));
  revalidatePath(path);

  return NextResponse.json({ revalidated: true, path, timestamp: Date.now() });
}
