"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function SettingsPage() {
  const [loaded, setLoaded] = useState(false);
  const [emailPrinter, setEmailPrinter] = useState("");
  const [emailNeighborhood, setEmailNeighborhood] = useState("");
  const [facebookPage, setFacebookPage] = useState("");
  const [pasta, setPasta] = useState("");
  const [meat, setMeat] = useState("");
  const [salad, setSalad] = useState("");

  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Läs in nuvarande inställningar.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (!active || !data?.settings) return;
        const s = data.settings;
        setEmailPrinter(s.email_printer ?? "");
        setEmailNeighborhood(s.email_neighborhood ?? "");
        setFacebookPage(s.facebook_page ?? "");
        setPasta((s.everyday_pasta ?? []).join("\n"));
        setMeat((s.everyday_meat ?? []).join("\n"));
        setSalad((s.everyday_salad ?? []).join("\n"));
        setLogoPath(s.logo_path ?? null);

        if (s.logo_path) {
          const supabase = createClient();
          const { data: signed } = await supabase.storage
            .from("logos")
            .createSignedUrl(s.logo_path, 3600);
          if (active && signed?.signedUrl) setLogoPreview(signed.signedUrl);
        }
      } catch {
        // Tyst – formuläret visas tomt.
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function handleLogoChange(file: File | null) {
    if (!file) return;
    setLogoFile(file);
    setSaved(false);
    setError(null);
    setLogoPreview((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const supabase = createClient();
      let newLogoPath = logoPath;

      // Ladda upp ny logga om en valts (till krögarens egen mapp i Storage).
      if (logoFile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Du är inte inloggad.");

        const ext = (logoFile.name.split(".").pop() || "png").toLowerCase();
        const path = `${user.id}/logo.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(path, logoFile, {
            upsert: true,
            contentType: logoFile.type || undefined,
          });
        if (uploadError) {
          throw new Error(`Kunde inte ladda upp loggan: ${uploadError.message}`);
        }
        newLogoPath = path;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo_path: newLogoPath,
          email_printer: emailPrinter,
          email_neighborhood: emailNeighborhood,
          facebook_page: facebookPage,
          everyday_pasta: splitLines(pasta),
          everyday_meat: splitLines(meat),
          everyday_salad: splitLines(salad),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Kunde inte spara inställningarna.");
      }

      setLogoPath(newLogoPath);
      setLogoFile(null);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-stone-400">Laddar…</p>
      </main>
    );
  }

  const fieldClass =
    "w-full rounded-2xl bg-stone-100 px-5 py-3.5 text-base text-stone-900 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-stone-300";

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <form onSubmit={handleSave} className="flex w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            Inställningar
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-800"
          >
            Tillbaka
          </Link>
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Det här används när dina menyer skapas och skickas.
        </p>

        {/* Logga */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-stone-900">
            Din logga
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Visas högst upp på menyn i stället för standardloggan.
          </p>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-stone-200">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt="Din logga"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-xs text-stone-400">Ingen logga</span>
              )}
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100"
            >
              {logoPreview ? "Byt logga" : "Ladda upp logga"}
            </button>
          </div>
        </section>

        {/* Mottagare */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-stone-900">Mottagare</h2>
          <p className="mt-1 text-sm text-stone-500">
            Vart menyn ska skickas när du publicerar.
          </p>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            E-post till skrivarpersonen
            <input
              type="email"
              value={emailPrinter}
              onChange={(e) => setEmailPrinter(e.target.value)}
              placeholder="skrivare@example.com"
              className={`mt-1.5 ${fieldClass}`}
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            E-post till kvartersmenyn
            <input
              type="email"
              value={emailNeighborhood}
              onChange={(e) => setEmailNeighborhood(e.target.value)}
              placeholder="kvartersmeny@example.com"
              className={`mt-1.5 ${fieldClass}`}
            />
          </label>
        </section>

        {/* Facebook */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-stone-900">Facebook</h2>
          <p className="mt-1 text-sm text-stone-500">
            Vilken Facebook-sida menyn ska publiceras till (kopplas in senare).
          </p>
          <label className="mt-4 block text-sm font-medium text-stone-700">
            Facebook-sida
            <input
              type="text"
              value={facebookPage}
              onChange={(e) => setFacebookPage(e.target.value)}
              placeholder="t.ex. facebook.com/dinrestaurang"
              className={`mt-1.5 ${fieldClass}`}
            />
          </label>
        </section>

        {/* Varje dag */}
        <section className="mt-8">
          <h2 className="text-base font-semibold text-stone-900">
            &quot;Varje dag&quot;-sektionen
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Rätterna som alltid serveras. Skriv <strong>en rätt per rad</strong>.
          </p>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            Pasträtter
            <textarea
              value={pasta}
              onChange={(e) => setPasta(e.target.value)}
              rows={5}
              placeholder={"Spaghetti Carbonara\nLasagne al Forno\n…"}
              className={`mt-1.5 resize-y ${fieldClass}`}
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            Kötträtter
            <textarea
              value={meat}
              onChange={(e) => setMeat(e.target.value)}
              rows={5}
              placeholder={"Grillad Entrecote\nKycklingspett\n…"}
              className={`mt-1.5 resize-y ${fieldClass}`}
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            Sallader
            <textarea
              value={salad}
              onChange={(e) => setSalad(e.target.value)}
              rows={4}
              placeholder={"Caesarsallad\nRäksallad\n…"}
              className={`mt-1.5 resize-y ${fieldClass}`}
            />
          </label>
        </section>

        {/* Spara */}
        <div className="mt-10 flex flex-col gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-stone-900 px-6 py-4 text-lg font-medium text-white shadow-sm transition-colors hover:bg-stone-800 active:bg-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Sparar…" : "Spara inställningar"}
          </button>

          {saved && (
            <p
              className="rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700"
              role="status"
            >
              Inställningarna är sparade ✓
            </p>
          )}
          {error && (
            <p
              className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
