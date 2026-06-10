import { createClient } from "@/lib/supabase/server";
import type { Everyday } from "@/lib/menu";

/**
 * Hämtar den inloggade krögarens renderingsinställningar för menyn:
 * loggan (laddas ner från Storage och bäddas in som data-URI) och
 * "Varje dag"-sektionen. RLS säkerställer att vi bara får tenantens egen rad.
 */
export async function getRenderSettings(): Promise<{
  logoSrc: string | null;
  everyday: Everyday;
}> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tenant_settings")
    .select("logo_path, everyday_pasta, everyday_meat, everyday_salad")
    .maybeSingle();

  let logoSrc: string | null = null;
  if (data?.logo_path) {
    const { data: blob } = await supabase.storage
      .from("logos")
      .download(data.logo_path);
    if (blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      const mime = blob.type || "image/png";
      logoSrc = `data:${mime};base64,${buffer.toString("base64")}`;
    }
  }

  const toList = (value: unknown): string[] =>
    Array.isArray(value) ? (value as string[]) : [];

  return {
    logoSrc,
    everyday: {
      pasta: toList(data?.everyday_pasta),
      meat: toList(data?.everyday_meat),
      salad: toList(data?.everyday_salad),
    },
  };
}
