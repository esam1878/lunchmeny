"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { MENU_STORAGE_KEY } from "@/lib/menu";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setError(null);
    setFile(selected);

    // Frigör eventuell tidigare objekt-URL innan vi skapar en ny.
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

      // Spara den inlästa menyn och gå vidare till bekräftelsesidan.
      sessionStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(data));
      router.push("/bekrafta");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Ladda upp veckans meny
        </h1>
        <p className="mt-3 text-base leading-relaxed text-stone-500">
          Fotografera din handskrivna meny så sköter vi resten
        </p>

        {/* Två visuellt dolda inputs som öppnas via <label>-elementen nedan.
            sr-only + label gör att mobilen kan öppna kameran/galleriet utan
            JS-baserad .click(). Två separata inputs ger ett pålitligt val på
            alla telefoner: capture → kameran, utan capture → galleriet. */}
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
        )}
      </div>
    </main>
  );
}
