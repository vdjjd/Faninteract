/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🚫 Skip ESLint errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 🚫 Skip TypeScript type errors during production build
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Allow Supabase storage images for Next/Image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zicbtsxjrhbpqjqemjrg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
