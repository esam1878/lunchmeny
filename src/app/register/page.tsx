"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !email || !password) return;

    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Om e-postbekräftelse är på finns ingen session ännu → be om bekräftelse.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    // Bekräftelse avstängd → användaren är inloggad direkt.
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#c8552b] px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dagens-logo.svg" alt="Dagens" className="mx-auto h-auto w-56" />

        {checkEmail ? (
          <div className="mt-8">
            <p className="text-lg font-medium text-stone-900">Kolla din mejl</p>
            <p className="mt-2 text-sm text-stone-500">
              Vi har skickat en bekräftelselänk till <strong>{email}</strong>.
              Klicka på länken för att aktivera kontot och logga in.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-[#c8552b] hover:underline"
            >
              Till inloggningen
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-6 text-base text-stone-500">
              Skapa ett konto för din restaurang
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-post"
                autoComplete="email"
                aria-label="E-post"
                className="w-full rounded-2xl bg-stone-100 px-5 py-4 text-center text-lg text-stone-900 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-[#c8552b]/40"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Lösenord (minst 6 tecken)"
                autoComplete="new-password"
                aria-label="Lösenord"
                className="w-full rounded-2xl bg-stone-100 px-5 py-4 text-center text-lg text-stone-900 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-[#c8552b]/40"
              />

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full rounded-2xl bg-stone-900 px-6 py-4 text-lg font-medium text-white shadow-sm transition-colors hover:bg-stone-800 active:bg-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Skapar konto…" : "Registrera dig"}
              </button>
            </form>

            <p className="mt-6 text-sm text-stone-500">
              Har du redan ett konto?{" "}
              <Link href="/login" className="font-medium text-[#c8552b] hover:underline">
                Logga in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
