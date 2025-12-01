import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: [],
  // Ensure React is resolved correctly in workspace setup
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
      };
    }
    return config;
  },
  // Turbopack config to silence the warning about webpack config with Turbopack
  turbopack: {},
};

export default nextConfig;
