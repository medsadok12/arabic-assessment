'use client';
import Link from 'next/link';
import FriendlyMessage, { primaryBtn, outlineBtn } from '../components/FriendlyMessage';

export default function Error({ error, reset }) {
  return (
    <FriendlyMessage
      emoji="🐣"
      title="يبدو أنّ هناك عثرةً صغيرة!"
      text="لا تقلق يا بطل — هذا يحدث أحياناً. جرّب مرّةً أخرى وستسير الأمور 💪"
    >
      <button onClick={() => reset()} style={primaryBtn}>🔄 حاوِل مرّةً أخرى</button>
      <Link href="/" style={outlineBtn}>🏠 الصفحة الرئيسية</Link>
    </FriendlyMessage>
  );
}
