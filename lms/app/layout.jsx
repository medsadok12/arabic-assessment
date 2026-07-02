import './globals.css';

export const metadata = {
  title: 'أكاديمية عارم — نظام التعلم الذكي',
  description: 'منصة تعليمية متكاملة لتعليم اللغة العربية',
  openGraph: {
    title: 'أكاديمية عارم — نظام التعلم الذكي',
    description: 'منصة تعليمية متكاملة لتعليم اللغة العربية',
    url: 'https://www.aarem.net',
    siteName: 'أكاديمية عارم',
    locale: 'ar_QA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'أكاديمية عارم — نظام التعلم الذكي',
    description: 'منصة تعليمية متكاملة لتعليم اللغة العربية',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },
  alternates: {
    canonical: 'https://www.aarem.net',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
