import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE, passwordToken } from "@/lib/auth";

// Next.js 15: middleware.ts + export "middleware".
export async function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;

  // Om inget lösenord är konfigurerat: släpp igenom (lås inte appen helt).
  if (!password) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const expected = await passwordToken(password);

  if (token === expected) {
    return NextResponse.next();
  }

  // Inte inloggad → skicka till inloggningssidan.
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Skydda allt UTOM: inloggningssidan, login-API:t, Next interna filer
  // och statiska filer (sökvägar som innehåller en punkt, t.ex. /limerick.png).
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
