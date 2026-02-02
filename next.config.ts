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
  // For user/org pages (username.github.io), no basePath needed
  // basePath: "", // Uncomment and set if deploying to a project page
};

export default nextConfig;
