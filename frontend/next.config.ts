import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable instrumentation.ts — runs before any route module loads.
  // Used to set PRISMA_DATABASE_URL before the Prisma generated client is evaluated.
  experimental: {
    instrumentationHook: true
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" }
    ]
  }
};

export default nextConfig;
