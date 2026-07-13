import Link from 'next/link';
import FriendlyMessage, { primaryBtn } from '../components/FriendlyMessage';

export default function NotFound() {
  return (
    <FriendlyMessage
      emoji="🧭"
      title="أُوه! يبدو أنّنا أضَعْنا الطريق..."
      text="الصفحةُ التي تبحث عنها غير موجودة، لكن لا بأس — لنَعُدْ إلى بيتِنا معاً!"
    >
      <Link href="/" style={primaryBtn}>🏠 العودة إلى الرئيسية</Link>
    </FriendlyMessage>
  );
}
