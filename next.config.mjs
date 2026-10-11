/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async rewrites() {
    return [
      { source: "/about", destination: "/legal/about" },
      { source: "/shipping", destination: "/legal/shipping" },
      { source: "/returns", destination: "/legal/returns" },
      { source: "/privacy", destination: "/legal/privacy" },
      { source: "/terms", destination: "/legal/terms" },
      { source: "/cookies", destination: "/legal/cookies" },
      { source: "/digital-products-policy", destination: "/legal/digital-products-policy" },
      { source: "/service-terms", destination: "/legal/service-terms" },
    ];
  },
};

export default nextConfig;
