import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Only apply static export in production (for GitHub Pages)
  // In development, we need dynamic routes for Keystatic CMS
  ...(isProduction && { output: "export" }),
  trailingSlash: true,
  allowedDevOrigins: ["http://127.0.0.1:3000"],
  images: {
    unoptimized: true,
  },
  // Transpile @jsquash modules specifically
  transpilePackages: ['@jsquash/avif', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/png'],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
  turbopack: {},
};

export default nextConfig;
