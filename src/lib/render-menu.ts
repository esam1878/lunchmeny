import type { Browser } from "puppeteer-core";

import { renderMenyMall } from "@/app/components/MenyMall";
import type { Everyday, MenuDay } from "@/lib/menu";

// A4 i pixlar vid 96 dpi (för skarpa skärmdumpar).
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

/**
 * Startar en webbläsare beroende på miljö:
 * - Vercel (serverless): puppeteer-core + @sparticuz/chromium (Lambda-Chromium).
 * - Lokalt: full puppeteer med medföljande Chromium.
 */
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const { launch } = await import("puppeteer-core");
    return launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const { launch } = await import("puppeteer");
  return launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as unknown as Browser;
}

function buildHtml(markup: string): string {
  const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">`;
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8">${fontLinks}<style>html,body{margin:0;padding:0;}</style></head><body>${markup}</body></html>`;
}

export type MenuAssets = {
  pdf?: Uint8Array;
  png?: Uint8Array;
};

/**
 * Renderar menyn med Puppeteer och returnerar de efterfrågade utdataformaten
 * (PDF och/eller PNG) från en och samma rendering.
 */
export async function renderMenuAssets(
  {
    vecka,
    dagar,
    logoSrc,
    everyday,
  }: {
    vecka: number;
    dagar: MenuDay[];
    logoSrc?: string | null;
    everyday?: Everyday;
  },
  outputs: { pdf?: boolean; png?: boolean },
): Promise<MenuAssets> {
  const html = buildHtml(renderMenyMall({ vecka, dagar, logoSrc, everyday }));

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: "load" });
    // Vänta in att webbfonten (Poppins) hunnit laddas innan utskrift.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    const assets: MenuAssets = {};

    if (outputs.pdf) {
      assets.pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
    }

    if (outputs.png) {
      const element = await page.$(".mm-root");
      assets.png = element
        ? await element.screenshot({ type: "png" })
        : await page.screenshot({ type: "png", fullPage: true });
    }

    return assets;
  } finally {
    await browser?.close();
  }
}
