import './globals.css';
import { LanguageProvider } from '../contexts/LanguageContext';

export const metadata = {
  title: 'Aarem Academy',
  description: 'Comprehensive online Arabic learning platform',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
