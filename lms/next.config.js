/** @type {import('next').NextConfig} */
const ASSESSMENT_URL = 'https://arabic-assessment.vercel.app';

const nextConfig = {
  images: {
    remotePatterns: [],
    // Next.js يضغط الصور تلقائياً عند تقديمها عبر <Image />
    formats: ['image/webp'],
    minimumCacheTTL: 86400,
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
};

module.exports = nextConfig;
