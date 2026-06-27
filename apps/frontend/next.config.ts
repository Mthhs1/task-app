import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["http://localhost:3001"],
    }
  }
};

export default nextConfig;
