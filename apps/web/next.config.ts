import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@contour/schema", "@contour/renderer"],
  serverExternalPackages: ["pino"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
