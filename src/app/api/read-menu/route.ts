import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Senaste och mest kapabla Opus-modellen. Stödjer structured outputs, så vi
// kan låta API:et garantera att svaret följer vårt JSON-schema.
const MODEL = "claude-opus-4-8";

// JSON-schema som svaret tvingas följa (structured outputs).
const MENU_SCHEMA = {
  type: "object",
  properties: {
    vecka: { anyOf: [{ type: "integer" }, { type: "null" }] },
    dagar: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dag: { type: "string" },
          rödDag: { type: "boolean" },
          helgdag: { anyOf: [{ type: "string" }, { type: "null" }] },
          rätter: { type: "array", items: { type: "string" } },
        },
        required: ["dag", "rödDag", "helgdag", "rätter"],
        additionalProperties: false,
      },
    },
  },
  required: ["vecka", "dagar"],
  additionalProperties: false,
} as const;

// Bildtyper som Anthropic Messages API accepterar.
const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

const PROMPT = `Du får en bild av en svensk, handskriven lunchmeny (måndag till fredag).

Läs av menyn och returnera ENDAST giltig JSON i exakt detta format:
{
  "vecka": <veckonummer som heltal, eller null om det inte framgår>,
  "dagar": [
    { "dag": "Måndag", "rödDag": false, "helgdag": null, "rätter": ["...", "..."] }
  ]
}

Regler:
- Ta med alla fem vardagar (Måndag, Tisdag, Onsdag, Torsdag, Fredag) i ordning.
- Varje rätt börjar oftast med ett kryss (x) i originalet – ta inte med krysset i texten.
- Skriv ut rätterna på fullständig, korrekt svenska. Rätta uppenbara stavfel och
  skriv ut förkortningar (t.ex. "pot" → "potatis", "mos" → "potatismos").
- Om en dag är markerad som röd dag eller helgdag: sätt "rödDag" till true, fyll i
  helgdagens namn i "helgdag" och lämna "rätter" som en tom lista.
- För vanliga dagar: "rödDag" är false och "helgdag" är null.
- Svara med enbart JSON – ingen förklarande text, inga markdown-staket.`;

/** Plockar ut ett JSON-objekt ur Claudes svar, även om det råkar omges av text. */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Inget JSON-objekt hittades i svaret.");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY saknas. Lägg till den i .env.local." },
      { status: 500 },
    );
  }

  // 1. Läs in bilden från frontend (multipart/form-data).
  let file: File | null = null;
  try {
    const formData = await request.formData();
    const value = formData.get("image");
    if (value instanceof File) {
      file = value;
    }
  } catch {
    return NextResponse.json(
      { error: "Kunde inte läsa förfrågan. Förväntade multipart/form-data." },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "Ingen bild bifogades i fältet 'image'." },
      { status: 400 },
    );
  }

  const mediaType: SupportedMediaType = SUPPORTED_MEDIA_TYPES.includes(
    file.type as SupportedMediaType,
  )
    ? (file.type as SupportedMediaType)
    : "image/jpeg";

  // 2. Koda om bilden till base64 för image-blocket.
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  // 3. Skicka bilden till Claude och be om en avläsning.
  const client = new Anthropic({ apiKey });

  let responseText: string;
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: {
        format: { type: "json_schema", schema: MENU_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Okänt fel";
    return NextResponse.json(
      { error: `Anropet till Anthropic misslyckades: ${detail}` },
      { status: 502 },
    );
  }

  // 4. Tolka svaret som JSON.
  try {
    const meny = extractJson(responseText);
    return NextResponse.json(meny);
  } catch {
    return NextResponse.json(
      {
        error: "Kunde inte tolka menyn som JSON.",
        raw: responseText,
      },
      { status: 422 },
    );
  }
}
