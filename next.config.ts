import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Only apply static export in production (for GitHub Pages)
  // In development, we need dynamic routes for Keystatic CMS
  ...(isProduction && { output: "export" }),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Transpile @jsquash modules specifically
  transpilePackages: ['@jsquash/avif', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/png'],

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
