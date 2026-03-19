import type { NextConfig } from "next";

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pdf-parse"],
  ...(isDemo && {
    output: "export",
    basePath: "/prepped",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
