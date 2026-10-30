/* sitemap.xml — الصفحات العامة التي يبحث عنها أولياء الأمور */
const BASE = 'https://www.aarem.net';

export default function sitemap() {
  const now = new Date();
  return [
    { url: `${BASE}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1 },
    { url: `${BASE}/auth/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/auth/login`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE}/apply`,         lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
