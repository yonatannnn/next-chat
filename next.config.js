/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dqucrvcvulwzzcbjoyai.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-ac2a6.up.railway.app',
  },
};

// Only enable PWA in production
if (process.env.NODE_ENV === 'production') {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    buildExcludes: [/middleware-manifest\.json$/],
  });
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}
