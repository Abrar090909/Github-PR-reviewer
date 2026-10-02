import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@contour/schema", "@contour/renderer"],
  serverExternalPackages: ["pino"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
