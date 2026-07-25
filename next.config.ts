import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async rewrites() {
    if (!backendUrl) {
      console.warn("未配置 BACKEND_URL，后端代理不会生效。");
      return [];
    }

    return [
      {
        source: "/backend/:path*",
        destination: `${backendUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
