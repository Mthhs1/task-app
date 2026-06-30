import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [backendUrl],
    }
  }
};

export default nextConfig;
