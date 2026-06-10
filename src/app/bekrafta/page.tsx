"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  MENU_STORAGE_KEY,
  nextWeekNumber,
  wrapWeek,
  type Menu,
} from "@/lib/menu";

/** Redigerbar ruta för en enskild rätt – växer i höjd efter innehållet. */
function DishField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={1}
      aria-label="Redigera rätt"
      className="w-full resize-none rounded-2xl bg-stone-100 px-5 py-4 text-lg leading-snug text-stone-900 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-stone-300"
    />
  );
}

export default function ConfirmPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [week, setWeek] = useState<number>(() => nextWeekNumber());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Frigör objekt-URL:en för förhandsgranskningen när den byts ut / vid unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Läs in den inlästa menyn från sessionStorage en gång vid montering.
  // Datan finns bara i webbläsaren, så en effekt (inte en lazy initializer)
  // krävs för att undvika hydration-mismatch mellan server och klient.
  useEffect(() => {
    let parsed: Menu | null = null;
    try {
      const raw = sessionStorage.getItem(MENU_STORAGE_KEY);
      if (raw) {
        const candidate = JSON.parse(raw) as Menu;
        if (candidate && Array.isArray(candidate.dagar)) {
          parsed = candidate;
        }
      }
    } catch {
      // Ignorera trasig data – vi visar fallback-vyn nedan.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- engångsinläsning av webbläsar-state vid montering
    setMenu(parsed);
    // Återöppnad sparad meny har ett veckonummer → visa det. Färska
    // AI-menyer saknar oftast vecka och behåller "nästa vecka" som default.
    if (parsed && typeof parsed.vecka === "number") {
      setWeek(parsed.vecka);
    }
    setLoaded(true);
  }, []);

  // Återställ publiceringsstatus när menyn ändras (så en gammal bekräftelse
  // inte ligger kvar efter att krögaren redigerat).
  function markChanged() {
    setPublished(false);
    setPublishError(null);
  }

  function changeWeek(delta: number) {
    setWeek((w) => wrapWeek(w + delta));
    markChanged();
  }

  function updateDish(dayIndex: number, dishIndex: number, value: string) {
    markChanged();
    setMenu((prev) => {
      if (!prev) return prev;
      const dagar = prev.dagar.map((day, i) => {
        if (i !== dayIndex) return day;
        const rätter = day.rätter.map((rätt, j) =>
          j === dishIndex ? value : rätt,
        );
        return { ...day, rätter };
      });
      return { ...prev, dagar };
    });
  }

  // Genererar en bild av menyn och visar den inbäddat i appen.
  async function handlePreview() {
    if (!menu || previewLoading) return;

    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const res = await fetch("/api/menu-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vecka: week, dagar: menu.dagar, format: "png" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Kunde inte skapa förhandsgranskning.");
      }

      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Kunde inte skapa förhandsgranskning.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  // Sparar menyn på krögarens konto och skickar den till Make.com-scenariot.
  async function handlePublish() {
    if (!menu || publishLoading) return;

    setPublishLoading(true);
    setPublished(false);
    setPublishError(null);

    try {
      // 1. Spara menyn kopplad till inloggad krögare (RLS sätter tenant).
      const saveRes = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vecka: week, dagar: menu.dagar }),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json().catch(() => null);
        throw new Error(saveData?.error ?? "Kunde inte spara menyn.");
      }

      // 2. Publicera till Make.com (befintligt flöde).
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vecka: week, dagar: menu.dagar }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Publiceringen misslyckades.");
      }

      setPublished(true);
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Publiceringen misslyckades.",
      );
    } finally {
      setPublishLoading(false);
    }
  }

  if (!loaded) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-stone-400">Laddar…</p>
      </main>
    );
  }

  if (!menu) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="max-w-sm text-stone-500">
          Ingen inläst meny hittades. Börja med att ladda upp en bild.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-2xl bg-stone-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-stone-800"
        >
          Till uppladdning
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="flex w-full max-w-md flex-col">
        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          Inläst
        </div>

        {/* Veckoväljare */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => changeWeek(-1)}
            aria-label="Föregående vecka"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <span className="min-w-[7rem] text-center text-2xl font-semibold tabular-nums text-stone-900">
            Vecka {week}
          </span>

          <button
            type="button"
            onClick={() => changeWeek(1)}
            aria-label="Nästa vecka"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Dagar */}
        <div className="mt-10 flex flex-col gap-8">
          {menu.dagar.map((day, dayIndex) => (
            <section key={dayIndex}>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">
                  {day.dag}
                </h2>
                {day.rödDag && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Röd dag
                  </span>
                )}
              </div>

              {day.rödDag ? (
                <p className="mt-3 rounded-2xl bg-red-50 px-5 py-4 text-lg text-red-800">
                  {day.helgdag ?? "Helgdag"}
                </p>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {day.rätter.map((rätt, dishIndex) => (
                    <DishField
                      key={dishIndex}
                      value={rätt}
                      onChange={(value) =>
                        updateDish(dayIndex, dishIndex, value)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Åtgärder */}
        <div className="mt-12 flex flex-col gap-4">
          {/* Förhandsgranska */}
          <button
            type="button"
            onClick={handlePreview}
            disabled={previewLoading}
            className="w-full rounded-2xl border border-stone-300 bg-white px-6 py-4 text-base font-medium text-stone-800 transition-colors hover:bg-stone-100 active:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {previewLoading
              ? "Skapar förhandsgranskning…"
              : previewUrl
                ? "Uppdatera förhandsgranskning"
                : "Förhandsgranska"}
          </button>

          {previewError && (
            <p className="text-center text-sm text-red-600" role="alert">
              {previewError}
            </p>
          )}

          {previewUrl && (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Förhandsgranskning av den färdiga menyn"
                className="w-full"
              />
            </div>
          )}

          {/* Publicera */}
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishLoading || published}
            className="mt-2 w-full rounded-2xl bg-stone-900 px-6 py-4 text-lg font-medium text-white shadow-sm transition-colors hover:bg-stone-800 active:bg-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publishLoading
              ? "Publicerar…"
              : published
                ? "Publicerad ✓"
                : "Skicka & publicera"}
          </button>

          {published && (
            <p
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700"
              role="status"
            >
              Meny för vecka {week} är publicerad ✓
            </p>
          )}

          {publishError && (
            <p
              className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600"
              role="alert"
            >
              {publishError}
            </p>
          )}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-2xl border border-stone-200 bg-white px-6 py-4 text-base font-medium text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
          >
            Ny bild
          </button>
        </div>
      </div>
    </main>
  );
}
