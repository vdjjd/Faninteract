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
};

export default nextConfig;
