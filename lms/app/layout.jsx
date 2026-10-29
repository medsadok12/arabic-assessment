import './globals.css';
import { Cairo, Tajawal, Noto_Naskh_Arabic } from 'next/font/google';
import { LanguageProvider } from '../contexts/LanguageContext';
import PWAInstall           from '../components/PWAInstall';
import FlashcardReminder    from '../components/FlashcardReminder';
import HeartbeatPing        from '../components/HeartbeatPing';

const cairo = Cairo({
  subsets:  ['arabic', 'latin'],
  weight:   ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display:  'swap',
  preload:  true,
});

/* خط الألعاب: نسخ الكتب المدرسية (اختيار الأستاذ محمد 2026-10-22) — الدال لا تشبه الحاء،
   والحركات واضحة. يُحمَّل فقط في صفحات الألعاب (الصنف .game-font) */
const naskh = Noto_Naskh_Arabic({
  subsets:  ['arabic'],
  weight:   ['400', '500', '600', '700'],
  variable: '--font-naskh',
  display:  'swap',
  preload:  false,
});

const tajawal = Tajawal({
  subsets:  ['arabic', 'latin'],
  weight:   ['300', '400', '500', '700', '800'],
  variable: '--font-tajawal',
  display:  'swap',
  preload:  false,
});

const SITE_TITLE = 'أكاديمية عارم';
const SITE_DESC  = 'منصة تعليمية عربية متكاملة لتقييم وتطوير مهارات اللغة العربية';

/* themeColor وأبعاد الشاشة في viewport (Next 14) — كانت في metadata فيُطبع تحذير لكل صفحة في البناء */
export const viewport = {
  width:        'device-width',
  initialScale: 1,
  viewportFit:  'cover',
  themeColor:   '#1A2B4A',
};

export const metadata = {
  metadataBase: new URL('https://www.aarem.net'),
  title:       SITE_TITLE,
  description: SITE_DESC,
  manifest:    '/manifest.json',
  /* معاينة الرابط عند مشاركته في واتساب وفيسبوك وتويتر (مراجعة 2026-10-29: لم تكن هناك صورة) */
  openGraph: {
    type:        'website',
    locale:      'ar_AR',
    siteName:    SITE_TITLE,
    title:       SITE_TITLE,
    description: SITE_DESC,
    url:         '/',
    images:      [{ url: '/og.jpg', width: 1200, height: 630, alt: 'معلم وطالب يتعلمان مع الفيل فهيم — أكاديمية عارم' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       SITE_TITLE,
    description: SITE_DESC,
    images:      ['/og.jpg'],
  },
  appleWebApp: {
    capable:         true,
    title:           'أكاديمية عارم',
    statusBarStyle:  'black-translucent',
  },
  icons: {
    icon:     '/logo.svg',
    shortcut: '/logo.svg',
    apple:    '/apple-touch-icon.png', // iOS لا يقبل SVG أيقونةً للشاشة الرئيسية
  },
  other: {
    'mobile-web-app-capable':          'yes',
    'apple-mobile-web-app-capable':    'yes',
    'application-name':                'عارم',
    'apple-mobile-web-app-title':      'عارم',
    'msapplication-TileColor':         '#1A2B4A',
    'msapplication-tap-highlight':     'no',
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.className} ${cairo.variable} ${tajawal.variable} ${naskh.variable}`}
    >
      <body style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
        <LanguageProvider>
          <main id="main-content" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>{children}</main>
        </LanguageProvider>
        <HeartbeatPing />
        <PWAInstall />
        <FlashcardReminder />
      </body>
    </html>
  );
}
