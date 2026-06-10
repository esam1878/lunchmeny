import { renderMenuAssets } from "@/lib/render-menu";
import { getRenderSettings } from "@/lib/render-settings";
import type { MenuDay } from "@/lib/menu";

// Puppeteer kräver Node-runtimen (inte edge).
export const runtime = "nodejs";
// Ge Chromium tid att starta + rendera (undviker timeout vid kallstart på Vercel).
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1. Läs in menydatan från frontend.
  let vecka: number;
  let dagar: MenuDay[];
  let format: "pdf" | "png";
  try {
    const body = (await request.json()) as {
      vecka?: unknown;
      dagar?: unknown;
      format?: unknown;
    };
    if (typeof body.vecka !== "number" || !Array.isArray(body.dagar)) {
      throw new Error("bad shape");
    }
    vecka = body.vecka;
    dagar = body.dagar as MenuDay[];
    format = body.format === "png" ? "png" : "pdf";
  } catch {
    return Response.json(
      { error: "Ogiltig menydata. Förväntade { vecka, dagar }." },
      { status: 400 },
    );
  }

  // 2. Hämta krögarens egna inställningar (logga + "Varje dag") och rendera.
  try {
    const { logoSrc, everyday } = await getRenderSettings();

    if (format === "png") {
      const { png } = await renderMenuAssets(
        { vecka, dagar, logoSrc, everyday },
        { png: true },
      );
      return new Response(Buffer.from(png!), {
        headers: { "Content-Type": "image/png" },
      });
    }

    const { pdf } = await renderMenuAssets(
      { vecka, dagar, logoSrc, everyday },
      { pdf: true },
    );
    return new Response(Buffer.from(pdf!), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="lunchmeny-v${vecka}.pdf"`,
      },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "okänt fel";
    return Response.json(
      { error: `Kunde inte generera förhandsgranskning: ${detail}` },
      { status: 500 },
    );
  }
}
