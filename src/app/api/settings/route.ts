import { createClient } from "@/lib/supabase/server";

const COLUMNS =
  "logo_path, email_printer, email_neighborhood, facebook_page, everyday_pasta, everyday_meat, everyday_salad";

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Hämtar den inloggade krögarens inställningar (eller tomma defaults).
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenant_settings")
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    settings: {
      logo_path: data?.logo_path ?? null,
      email_printer: data?.email_printer ?? null,
      email_neighborhood: data?.email_neighborhood ?? null,
      facebook_page: data?.facebook_page ?? null,
      everyday_pasta: data?.everyday_pasta ?? [],
      everyday_meat: data?.everyday_meat ?? [],
      everyday_salad: data?.everyday_salad ?? [],
    },
  });
}

// Sparar (upsert) krögarens inställningar. tenant_id hämtas från profilen så
// raden hamnar på rätt konto; RLS bevakar att den matchar inloggad användare.
export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Inte inloggad." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .single();
  if (profileError || !profile) {
    return Response.json({ error: "Hittade ingen tenant." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return Response.json({ error: "Ogiltig data." }, { status: 400 });
  }

  const { error } = await supabase.from("tenant_settings").upsert(
    {
      tenant_id: profile.tenant_id as string,
      logo_path: asText(body.logo_path),
      email_printer: asText(body.email_printer),
      email_neighborhood: asText(body.email_neighborhood),
      facebook_page: asText(body.facebook_page),
      everyday_pasta: asStringList(body.everyday_pasta),
      everyday_meat: asStringList(body.everyday_meat),
      everyday_salad: asStringList(body.everyday_salad),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
