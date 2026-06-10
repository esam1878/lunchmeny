// Delade typer och hjälpfunktioner för lunchmenyn.

export type MenuDay = {
  dag: string;
  rödDag: boolean;
  helgdag: string | null;
  rätter: string[];
};

export type Menu = {
  vecka: number | null;
  dagar: MenuDay[];
};

/** En meny sparad i databasen, kopplad till en tenant. */
export type SavedMenu = {
  id: string;
  vecka: number | null;
  dagar: MenuDay[];
  created_at: string;
};

// Nyckel för att skicka den inlästa menyn mellan uppladdnings- och
// bekräftelsesidan via sessionStorage.
export const MENU_STORAGE_KEY = "lunchmeny:inläst-meny";

/** Beräknar ISO-veckonummer (vecka börjar på måndag) för ett datum. */
export function isoWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  // Måndag = 0 … söndag = 6
  const dayNum = (d.getUTCDay() + 6) % 7;
  // Flytta till torsdagen i samma vecka (avgör vilket år veckan tillhör).
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return (
    1 +
    Math.round(
      (d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    )
  );
}

/** Veckonumret för nästa vecka (vänder runt 53 → 1). */
export function nextWeekNumber(from: Date = new Date()): number {
  const week = isoWeek(from) + 1;
  return week > 53 ? 1 : week;
}

/** Håller ett veckonummer inom 1–53 och vänder runt vid kanterna. */
export function wrapWeek(week: number): number {
  if (week < 1) return 53;
  if (week > 53) return 1;
  return week;
}
