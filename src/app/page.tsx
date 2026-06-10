"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { MENU_STORAGE_KEY, type SavedMenu } from "@/lib/menu";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("sv-SE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Hämta krögarens sparade menyer (RLS ger bara dennes egna).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/menus");
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.menus)) {
          setSavedMenus(data.menus as SavedMenu[]);
        }
      } catch {
        // Tyst – listan är inte kritisk för uppladdningsflödet.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setError(null);
    setFile(selected);

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(selected);
    });
  }

  function handleReset() {
    setFile(null);
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  async function handleContinue() {
    if (!file || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/read-menu", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Något gick fel vid avläsningen.");
      }

      sessionStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data));
      router.push("/bekrafta");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setIsLoading(false);
    }
  }

  // Öppna en sparad meny i bekräftelsevyn (för att se / redigera / publicera om).
  function openSavedMenu(menu: SavedMenu) {
    sessionStorage.setItem(
      MENU_STORAGE_KEY,
      JSON.stringify({ vecka: menu.vecka, dagar: menu.dagar }),
    );
    router.push("/bekrafta");
  }

  return (
    <main className="relative flex flex-1 flex-col items-center px-6 py-16">
      <Link
        href="/installningar"
        className="absolute left-5 top-5 text-sm font-medium text-stone-400 transition-colors hover:text-stone-700"
      >
        Inställningar
      </Link>
      <form action="/auth/signout" method="post" className="absolute right-5 top-5">
        <button
          type="submit"
          className="text-sm font-medium text-stone-400 transition-colors hover:text-stone-700"
        >
          Logga ut
        </button>
      </form>

      <div className="flex w-full max-w-md flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Ladda upp veckans meny
        </h1>
        <p className="mt-3 text-base leading-relaxed text-stone-500">
          Fotografera din handskrivna meny så sköter vi resten
        </p>

        <input
          ref={cameraInputRef}
          id="menu-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="sr-only"
        />
        <input
          ref={galleryInputRef}
          id="menu-gallery-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
        />

        {previewUrl ? (
          <div className="mt-12 flex w-full flex-col items-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Förhandsvisning av uppladdad meny"
              className="max-h-[60vh] w-full rounded-3xl object-cover shadow-sm ring-1 ring-stone-200"
            />

            <button
              type="button"
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full rounded-2xl bg-stone-900 px-6 py-4 text-lg font-medium text-white shadow-sm transition-colors hover:bg-stone-800 active:bg-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Läser av menyn…" : "Fortsätt"}
            </button>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 disabled:opacity-60"
            >
              Välj en annan bild
            </button>
          </div>
        ) : (
          <>
            <div className="mt-12 flex w-full max-w-xs flex-col items-center gap-4">
              {/* Primärt val: öppna kameran */}
              <label
                htmlFor="menu-camera-input"
                className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-stone-300 bg-white px-6 text-stone-600 shadow-sm transition-colors hover:border-stone-400 hover:bg-stone-50 active:bg-stone-100"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8"
                    aria-hidden="true"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </span>
                <span className="text-lg font-medium">Ta ett foto</span>
              </label>

              {/* Sekundärt val: välj en befintlig bild från galleriet */}
              <label
                htmlFor="menu-gallery-input"
                className="cursor-pointer text-sm font-medium text-stone-500 underline-offset-4 transition-colors hover:text-stone-800 hover:underline"
              >
                eller välj en bild från galleriet
              </label>
            </div>

            {/* Krögarens sparade menyer */}
            {savedMenus.length > 0 && (
              <section className="mt-14 w-full text-left">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Tidigare menyer
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {savedMenus.map((menu) => (
                    <li key={menu.id}>
                      <button
                        type="button"
                        onClick={() => openSavedMenu(menu)}
                        className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-4 text-left shadow-sm ring-1 ring-stone-200 transition-colors hover:bg-stone-50 active:bg-stone-100"
                      >
                        <span className="text-base font-medium text-stone-900">
                          {typeof menu.vecka === "number"
                            ? `Vecka ${menu.vecka}`
                            : "Meny"}
                        </span>
                        <span className="text-sm text-stone-400">
                          {formatDate(menu.created_at)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
