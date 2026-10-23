import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@playgrowth/config',
    '@playgrowth/contracts',
    '@playgrowth/domain',
    '@playgrowth/ui',
  ],
};

export default nextConfig;
