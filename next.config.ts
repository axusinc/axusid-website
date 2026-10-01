import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Identity pages must never be framed: the consent screen especially.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Deliberately narrow: security keys and platform authenticators use
  // USB/HID/WebAuthn, which are left at their defaults here.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // sharp is a native module used for server-side avatar imports; keep it external.
  serverExternalPackages: ["sharp"],
  // sharp 0.35 uses dist/index.*; the tracer's older lib/index.js special case
  // misses the shared libvips library required by the native addon.
  outputFileTracingIncludes: {
    "/gravatar/*": ["./node_modules/@img/sharp-*/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
