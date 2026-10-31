import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Plain static files for Cloudflare Pages: no server runtime.
  output: 'export',
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
