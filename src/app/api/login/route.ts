import { NextResponse } from "next/server";

import { AUTH_COOKIE, passwordToken } from "@/lib/auth";

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "APP_PASSWORD saknas. Lägg till den i .env.local." },
      { status: 500 },
    );
  }

  let submitted = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") {
      submitted = body.password;
    }
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  }

  if (submitted !== password) {
    return NextResponse.json({ error: "Fel lösenord." }, { status: 401 });
  }

  // Rätt lösenord → sätt en säker, httpOnly-cookie så användaren hålls inloggad.
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await passwordToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dagar
  });
  return response;
}
