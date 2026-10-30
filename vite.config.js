import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // lms/ تطبيق Next.js منفصل بحزمة واختبارات خاصة به (lms/package.json) —
    // يُستبعد هنا كي لا يُشغَّل مرتين أو يتداخل مع بيئة اختبار هذا التطبيق.
    exclude: ['**/node_modules/**', 'lms/**'],
  },
})
