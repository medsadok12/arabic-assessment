/** @type {import('next').NextConfig} */
const ASSESSMENT_URL = 'https://assessment.aarem.net';

const SECURITY_HEADERS = [
  // Force HTTPS for 2 years
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block clickjacking — allow same-origin iframes only
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Limit referrer info sent to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Prevent opener attacks (e.g. tab-napping); allow-popups needed for Google Meet links
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  // Restrict browser features we don't need
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // Content Security Policy — permissive enough for Next.js inline styles/scripts
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js requires unsafe-inline + unsafe-eval for hydration scripts
      // (model-viewer صار مستضافاً ذاتياً في public/vendor — لا حاجة لأي CDN خارجي)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Inline styles are used extensively throughout the app
      "style-src 'self' 'unsafe-inline'",
      // Images from Supabase storage, data URIs, blobs (canvas games), and any HTTPS
      "img-src 'self' data: blob: https:",
      // Fonts self-hosted via next/font
      "font-src 'self' data:",
      // API connections: Supabase + Spline only — AI/TTS keys are server-side, never called from the browser
      // (مجسمات GLB صارت تُخدم من نفس الدومين 'self' — أُزيلت modelviewer.dev وthreejs.org وraw.githubusercontent.com)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co " +
        "https://*.spline.design https://prod.spline.design",
      // model-viewer uses Web Workers for GLB; Spline uses workers from its CDN
      "worker-src blob: 'self' https://*.spline.design",
      // Audio/video from Supabase storage and blobs (Web Audio API)
      "media-src 'self' blob: https:",
      // Allow iframes from same origin + the assessment app (embedded in /assessment)
      "frame-src 'self' https://assessment.aarem.net",
      // Prevent this page from being embedded elsewhere
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  images: {
    // Serve modern formats: AVIF first (40% smaller), WebP fallback
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 30 days
    minimumCacheTTL: 2592000,
    remotePatterns: [
      // Allow images from Supabase storage
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      // Google OAuth profile pictures
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
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
