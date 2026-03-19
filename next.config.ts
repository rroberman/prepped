import type { NextConfig } from "next";

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pdf-parse"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  ...(isDemo && {
    output: "export",
    basePath: "/prepped",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
