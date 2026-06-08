import './globals.css';
import { LanguageProvider } from '../contexts/LanguageContext';
import PWAInstall           from '../components/PWAInstall';

export const metadata = {
  title:       'أكاديمية عارم',
  description: 'منصة تعليمية عربية متكاملة لتقييم وتطوير مهارات اللغة العربية',
  manifest:    '/manifest.json',
  themeColor:  '#185FA5',
  appleWebApp: {
    capable:         true,
    title:           'أكاديمية عارم',
    statusBarStyle:  'black-translucent',
  },
  icons: {
    icon:     '/logo.svg',
    shortcut: '/logo.svg',
    apple:    '/logo.svg',
  },
  other: {
    'mobile-web-app-capable':          'yes',
    'apple-mobile-web-app-capable':    'yes',
    'application-name':                'عارم',
    'apple-mobile-web-app-title':      'عارم',
    'msapplication-TileColor':         '#185FA5',
    'msapplication-tap-highlight':     'no',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <PWAInstall />
      </body>
    </html>
  );
}
