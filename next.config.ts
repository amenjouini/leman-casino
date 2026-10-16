import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Inline scripts/styles are required by Next.js hydration without nonces.
// Map embeds are restricted to Google Maps; images may come from https sources
// configured by the owner (cover images, branding).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    // Player accounts were never functional: bookings require no account.
    return [
      { source: "/register", destination: "/tournois", permanent: false },
      { source: "/roulette", destination: "/#roulette", permanent: false },
      { source: "/login", destination: "/admin/login", permanent: false },
      { source: "/poker/schedule", destination: "/tournois", permanent: true },
      { source: "/privacy", destination: "/confidentialite", permanent: true },
      { source: "/terms", destination: "/mentions-legales", permanent: true },
    ];
  },
};

export default nextConfig;
