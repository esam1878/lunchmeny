import { renderMenuAssets } from "@/lib/render-menu";
import type { MenuDay } from "@/lib/menu";

// Puppeteer kräver Node-runtimen (inte edge).
export const runtime = "nodejs";
// Ge Chromium tid att starta + rendera (undviker timeout vid kallstart på Vercel).
export const maxDuration = 60;

/** Kopierar byten till en fristående ArrayBuffer (giltig BlobPart). */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return buffer;
}

/** Bygger en ren textversion av menyn (måndag–fredag, utan formatering). */
function buildTextVersion(vecka: number, dagar: MenuDay[]): string {
  const lines: string[] = [`Vecka ${vecka}`, ""];

  for (const day of dagar) {
    lines.push(day.dag);
    if (day.rödDag) {
      lines.push(`Röd dag – ${day.helgdag ?? "Helgdag"}`);
    } else {
      for (const rätt of day.rätter) {
        lines.push(rätt);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export async function POST(request: Request) {
  // 1. Webhook-URL från miljövariabel (aldrig hårdkodad / exponerad mot klient).
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json(
      { error: "MAKE_WEBHOOK_URL saknas. Lägg till den i .env.local." },
      { status: 500 },
    );
  }

  // 2. Läs in menydatan.
  let vecka: number;
  let dagar: MenuDay[];
  try {
    const body = (await request.json()) as { vecka?: unknown; dagar?: unknown };
    if (typeof body.vecka !== "number" || !Array.isArray(body.dagar)) {
      throw new Error("bad shape");
    }
    vecka = body.vecka;
    dagar = body.dagar as MenuDay[];
  } catch {
    return Response.json(
      { error: "Ogiltig menydata. Förväntade { vecka, dagar }." },
      { status: 400 },
    );
  }

  // 3. Generera PDF + bild och bygg textversion + bildtext.
  const menyText = buildTextVersion(vecka, dagar);
  const facebookText = `Lunch meny hos oss vecka ${vecka}. Välkommna!!!`;
  const pdfName = `lunchmeny-v${vecka}.pdf`;
  const bildName = `lunchmeny-v${vecka}.png`;

  let pdf: Uint8Array;
  let png: Uint8Array;
  try {
    const assets = await renderMenuAssets(
      { vecka, dagar },
      { pdf: true, png: true },
    );
    pdf = assets.pdf!;
    png = assets.png!;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "okänt fel";
    return Response.json(
      { error: `Kunde inte generera menyfilerna: ${detail}` },
      { status: 500 },
    );
  }

  // 4. Bygg multipart/form-data så Make får riktiga filer (ingen base64-avkodning).
  const form = new FormData();
  form.append("veckonummer", String(vecka));
  form.append("meny_text", menyText);
  form.append("facebook_text", facebookText);
  form.append(
    "pdf",
    new Blob([toArrayBuffer(pdf)], { type: "application/pdf" }),
    pdfName,
  );
  form.append(
    "bild",
    new Blob([toArrayBuffer(png)], { type: "image/png" }),
    bildName,
  );

  // 5. Loggning för felsökning.
  console.log("[publish] Skickar till Make-webhook (multipart/form-data):", {
    host: new URL(webhookUrl).host,
    veckonummer: vecka,
    facebook_text: facebookText,
    pdf: `${pdfName} (${pdf.byteLength} byte)`,
    bild: `${bildName} (${png.byteLength} byte)`,
    meny_text: menyText,
  });

  // 6. Skicka till Make.com (låt fetch sätta Content-Type med boundary själv).
  try {
    const res = await fetch(webhookUrl, { method: "POST", body: form });
    const responseText = await res.text();
    console.log(
      `[publish] Webhook-svar: ${res.status} ${res.statusText} – ${responseText.slice(0, 200)}`,
    );

    if (!res.ok) {
      return Response.json(
        { error: `Make-webhooken svarade med ${res.status}.` },
        { status: 502 },
      );
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "okänt fel";
    console.error("[publish] Anropet till webhooken misslyckades:", detail);
    return Response.json(
      { error: `Kunde inte nå Make-webhooken: ${detail}` },
      { status: 502 },
    );
  }

  return Response.json({ ok: true, vecka });
}
