import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["@libsql/client", "libsql"],
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async headers() {
    return [{ source: "/adpanel/:path*", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ] }];
  },
  images: {
    // Only bundled public assets may enter the optimizer cache. Editorial media follows publication permissions on every request.
    localPatterns: ["/home/**", "/brand/**", "/articles/generated/**", "/media/**", "/fleet-*.png", "/_next/static/media/**"].map(pathname => ({ pathname, search: "" })),
    qualities: [75, 85, 92],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2560, 3840],
  },
};

export default nextConfig;
