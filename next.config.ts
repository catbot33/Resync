import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Codex in-app preview available while OAuth returns through localhost.
  allowedDevOrigins: ["192.168.100.31"],
  reactStrictMode: true,
};

export default nextConfig;
