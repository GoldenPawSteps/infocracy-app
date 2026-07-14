/** @type {import('next').NextConfig} */
const backendInternalUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:4000';

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendInternalUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
