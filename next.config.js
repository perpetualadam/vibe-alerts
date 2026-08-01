/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Supabase auth cookie handling on Vercel
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },
};

module.exports = nextConfig;
