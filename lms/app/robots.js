/* robots.txt — الصفحات العامة فقط تُفهرَس؛ لوحات الطلاب والمعلمين والإدارة وروابط القصص الخاصة لا */
export default function robots() {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/', '/auth/', '/bogga', '/admin', '/dashboard', '/teacher', '/supervisor', '/library',
        '/profile', '/progress', '/story/', '/preview', '/student-dashboard-test', '/assessment-cms', '/interview',
      ],
    }],
    sitemap: 'https://www.aarem.net/sitemap.xml',
    host:    'https://www.aarem.net',
  };
}
