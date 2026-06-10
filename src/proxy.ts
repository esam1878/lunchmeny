import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 "Proxy" (tidigare middleware). Uppdaterar Supabase-sessionen och
// skyddar appen: man måste vara inloggad för att nå andra sidor än auth-sidorna.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // VIKTIGT: ingen logik mellan createServerClient och getUser() – det krävs
  // för att Supabase ska kunna uppdatera sessionen korrekt.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth");

  // Inte inloggad och försöker nå en skyddad sida → till inloggningen.
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redan inloggad och på login/register → in i appen.
  if (
    user &&
    (pathname.startsWith("/login") || pathname.startsWith("/register"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Kör på allt utom Next interna filer och statiska filer (med punkt).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
