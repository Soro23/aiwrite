import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone build for Docker deployment
  output: "standalone",

  // Server external packages that should not be bundled
  serverExternalPackages: ["@prisma/client", "bcryptjs", "jsonwebtoken", "minio"],

  // Security headers applied to all routes
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};

export default nextConfig;
