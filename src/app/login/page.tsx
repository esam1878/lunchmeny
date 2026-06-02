"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Inloggningen misslyckades.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Inloggningen misslyckades.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-[#c8552b] px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dagens-logo.svg"
          alt="Dagens"
          className="mx-auto h-auto w-56"
        />

        <p className="mt-6 text-base text-stone-500">
          Ange lösenord för att fortsätta
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Lösenord"
            autoFocus
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
            disabled={loading || !password}
            className="w-full rounded-2xl bg-stone-900 px-6 py-4 text-lg font-medium text-white shadow-sm transition-colors hover:bg-stone-800 active:bg-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loggar in…" : "Logga in"}
          </button>
        </form>
      </div>
    </main>
  );
}
