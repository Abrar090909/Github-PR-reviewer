import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@contour/shared", "@contour/renderer"],
  serverExternalPackages: ["@contour/worker", "ts-morph", "pino"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
