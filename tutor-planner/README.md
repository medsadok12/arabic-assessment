# مُنظِّم الحصص — جدول المدرس الخاص ومستحقاته

تطبيق React من ملف واحد (`App.jsx`) لإدارة الجدول الأسبوعي والمتابعة المالية. كل البيانات تُحفظ في `localStorage`.

## التشغيل السريع (Vite)

```bash
npm create vite@latest tutor-planner -- --template react
cd tutor-planner
npm i lucide-react
npm i -D tailwindcss @tailwindcss/vite
```

- في `vite.config.js` أضف `tailwindcss()` من `@tailwindcss/vite` إلى `plugins`.
- اجعل محتوى `src/index.css` هو: `@import "tailwindcss";`
- انسخ `App.jsx` مكان `src/App.jsx` ثم شغّل `npm run dev`.

> في CodeSandbox: أضف الحزمة `lucide-react` وفعّل Tailwind (أو ضع `<script src="https://cdn.tailwindcss.com"></script>` في `index.html`).
