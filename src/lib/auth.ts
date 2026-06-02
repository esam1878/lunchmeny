// Delad auth-hjälpare. Använder enbart Web Crypto + TextEncoder så att den
// fungerar både i proxy (edge-runtime) och i API-routen (Node-runtime).

export const AUTH_COOKIE = "lunchmeny_auth";

/**
 * Härleder ett cookie-värde ur lösenordet (SHA-256). Då hamnar aldrig
 * råa lösenordet i cookien, men proxyn kan ändå verifiera det.
 */
export async function passwordToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`lunchmeny::${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
