/** @type {import('next').NextConfig} */
const ASSESSMENT_URL = 'https://arabic-assessment.vercel.app';

const nextConfig = {
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return [
      // Proxy the assessment SPA and all its static assets
      {
        source: '/assessment-app',
        destination: `${ASSESSMENT_URL}/`,
      },
      {
        source: '/assessment-app/:path*',
        destination: `${ASSESSMENT_URL}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/((?!dashboard|bogga|teacher|admin|supervisor|profile|api|auth).*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow, max-snippet:-1, max-image-preview:large',
          },
          {
            key: 'Link',
            value: '</llms.txt>; rel="ai-content-description"; type="text/markdown"',
          },
        ],
      },
      {
        // حماية الصفحات الداخلية من الفهرسة
        source: '/(dashboard|bogga|teacher|admin|supervisor|profile|api|auth)(.*)',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
