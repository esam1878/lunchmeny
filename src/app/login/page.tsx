"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !email || !password) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Fel e-post eller lösenord.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#c8552b] px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dagens-logo.svg" alt="Dagens" className="mx-auto h-auto w-56" />

        <p className="mt-6 text-base text-stone-500">Logga in för att fortsätta</p>

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
            placeholder="Lösenord"
            autoComplete="current-password"
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
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-stone-500">
          Har du inget konto?{" "}
          <Link href="/register" className="font-medium text-[#c8552b] hover:underline">
            Registrera dig
          </Link>
        </p>
      </div>
    </main>
  );
}
