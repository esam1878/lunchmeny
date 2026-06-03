import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Buntar inte in Puppeteer/Chromium i serverbygget (måste laddas externt
  // för att @sparticuz/chromium ska kunna packa upp sin binär i runtime).
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
