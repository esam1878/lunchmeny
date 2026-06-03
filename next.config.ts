import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tillåt mobilen (och andra enheter på samma nät) att nå dev-servern.
  // Next.js 16 blockerar annars cross-origin-anrop till dev-servern.
  allowedDevOrigins: ["192.168.1.76", "192.168.1.0/24"],

  // Buntar inte in Puppeteer/Chromium i serverbygget (måste laddas externt
  // för att @sparticuz/chromium ska kunna packa upp sin binär i runtime).
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],

  // Tvinga med Chromium-binären (bin/) i de funktioner som använder den.
  // Annars saknas /var/task/node_modules/@sparticuz/chromium/bin på Vercel.
  outputFileTracingIncludes: {
    "/api/menu-pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/publish": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
