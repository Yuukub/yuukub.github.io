import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // For user/org pages (username.github.io), no basePath needed
  // basePath: "", // Uncomment and set if deploying to a project page
};

export default nextConfig;
