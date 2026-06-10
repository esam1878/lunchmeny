import { createClient } from "@/lib/supabase/server";
import type { MenuDay } from "@/lib/menu";

// Listar den inloggade krögarens menyer (RLS filtrerar automatiskt till
// rätt tenant – vi behöver ingen where-sats här).
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("menus")
    .select("id, vecka, dagar, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ menus: data ?? [] });
}

// Sparar en meny kopplad till den inloggade krögaren. tenant_id sätts
// automatiskt av databasens default (current_tenant_id) och bevakas av RLS.
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Inte inloggad." }, { status: 401 });
  }

  let vecka: number | null;
  let dagar: MenuDay[];
  try {
    const body = (await request.json()) as { vecka?: unknown; dagar?: unknown };
    if (!Array.isArray(body.dagar)) throw new Error("bad shape");
    vecka = typeof body.vecka === "number" ? body.vecka : null;
    dagar = body.dagar as MenuDay[];
  } catch {
    return Response.json(
      { error: "Ogiltig menydata. Förväntade { vecka, dagar }." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("menus")
    .insert({ vecka, dagar })
    .select("id, vecka, dagar, created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ menu: data });
}
