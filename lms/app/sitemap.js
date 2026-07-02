export default function sitemap() {
  const baseUrl = 'https://www.aarem.net';

  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
  ];

  return staticPages;
}
