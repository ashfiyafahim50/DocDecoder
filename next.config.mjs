/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Support base64 image payload handling
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
