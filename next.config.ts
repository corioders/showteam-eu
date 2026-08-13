import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/api/media/file/**" }],
  },
  serverExternalPackages: ["pg-cloudflare"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
