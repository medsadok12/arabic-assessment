import './globals.css';

export const metadata = {
  title: 'أكاديمية عارم — نظام التعلم الذكي',
  description: 'منصة تعليمية متكاملة لتعليم اللغة العربية',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
