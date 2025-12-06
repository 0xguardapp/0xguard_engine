import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: [],
  
  // Use webpack to avoid Turbopack issues with test files in node_modules
  webpack: (config, { isServer }) => {
    // Use require for webpack to avoid type issues
    const webpack = require('webpack');
    
    // Ignore test files and problematic dependencies
    config.plugins = [
      ...(config.plugins || []),
      // Ignore test files in thread-stream
      new webpack.IgnorePlugin({
        resourceRegExp: /thread-stream[\\/]test[\\/]/,
      }),
      // Ignore bench.js and LICENSE files
      new webpack.IgnorePlugin({
        resourceRegExp: /[\\/](bench\.js|LICENSE)$/,
        contextRegExp: /thread-stream/,
      }),
      // Ignore test dependencies that shouldn't be bundled
      new webpack.IgnorePlugin({
        resourceRegExp: /^(tap|desm|fastbench|pino-elasticsearch|why-is-node-running|tape)$/,
      }),
    ];
    
    return config;
  },
  
  // Exclude problematic packages from server-side rendering
  serverExternalPackages: ['@walletconnect/logger'],
  
  // Add empty turbopack config to silence warnings when webpack is used
  turbopack: {},
};

export default nextConfig;
