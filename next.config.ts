import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tillåt mobilen (och andra enheter på samma nät) att nå dev-servern.
  // Next.js 16 blockerar annars cross-origin-anrop till dev-servern.
  allowedDevOrigins: ["192.168.1.76", "192.168.1.0/24"],

  // Buntar inte in Puppeteer (och dess Chromium) i serverbygget.
  serverExternalPackages: ["puppeteer"],
};

export default nextConfig;
