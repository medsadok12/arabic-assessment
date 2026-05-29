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
};

module.exports = nextConfig;
