import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Disable dev overlay buttons (Turbopack/build activity/app dir indicator) */
  devIndicators: {
    buildActivity: false,
    appDir: false,
  },
};

export default nextConfig;
