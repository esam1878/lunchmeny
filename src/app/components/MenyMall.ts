import type { Everyday, MenuDay } from "@/lib/menu";

// Modern, ren typografi: varm grafit i stället för rent svart,
// en dämpad terrakotta-accent och tydlig storlekshierarki.
const CSS = `
  .mm-root * { box-sizing: border-box; }
  .mm-root {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 15mm 17mm 13mm;
    background: #ffffff;
    color: #5c544c;
    font-family: "Poppins", system-ui, -apple-system, "Segoe UI", sans-serif;
    font-weight: 400;
    display: flex;
    flex-direction: column;
  }
  .mm-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 9mm;
  }
  .mm-logo { max-height: 24mm; width: auto; }
  .mm-wordmark { font-size: 24pt; font-weight: 700; letter-spacing: 1px; color: #2a2521; }
  .mm-title {
    margin-top: 4mm;
    align-self: flex-end;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5mm;
  }
  .mm-title-label {
    font-size: 8.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2.5px;
    color: #a8a29e;
  }
  .mm-title-week {
    font-size: 21pt;
    font-weight: 700;
    line-height: 1;
    color: #b5552f;
  }
  .mm-days { flex: 1 0 auto; }
  .mm-day { margin-bottom: 6mm; break-inside: avoid; }
  .mm-day-head {
    display: flex;
    align-items: center;
    gap: 3mm;
    padding-bottom: 1.5mm;
    margin-bottom: 2.5mm;
    border-bottom: 0.5pt solid #e7e5e4;
  }
  .mm-day-name {
    font-size: 14pt;
    font-weight: 600;
    letter-spacing: 0.2px;
    color: #2a2521;
    margin: 0;
  }
  .mm-holiday-tag {
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9f1239;
    background: #fbe9ec;
    padding: 0.6mm 2.2mm;
    border-radius: 2mm;
  }
  .mm-dishes { margin: 0; padding-left: 5mm; }
  .mm-dishes li { font-size: 11pt; line-height: 1.65; color: #5c544c; }
  .mm-holiday { font-size: 11pt; font-style: italic; margin: 0; color: #5c544c; }
  .mm-footer {
    margin-top: 8mm;
    border-top: 1pt solid #2a2521;
    padding-top: 5mm;
  }
  .mm-footer-title {
    text-align: center;
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: #b5552f;
    margin: 0 0 5mm;
  }
  .mm-cols { display: flex; gap: 9mm; }
  .mm-col { flex: 1; }
  .mm-col h3 {
    font-size: 10.5pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #2a2521;
    margin: 0 0 2.5mm;
    padding-bottom: 1.5mm;
    border-bottom: 0.75pt solid #b5552f;
  }
  .mm-col ul { margin: 0; padding-left: 4.5mm; }
  .mm-col li { font-size: 9.5pt; line-height: 1.6; color: #5c544c; }
  @page { size: A4; margin: 0; }
`;

/** Escapar text så att rätt-namn inte kan bryta HTML:en. */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dagBlock(day: MenuDay): string {
  const tag = day.rödDag ? `<span class="mm-holiday-tag">Röd dag</span>` : "";
  const head = `<div class="mm-day-head"><h2 class="mm-day-name">${esc(day.dag)}</h2>${tag}</div>`;

  const body = day.rödDag
    ? `<p class="mm-holiday">${esc(day.helgdag ?? "Helgdag")}</p>`
    : `<ul class="mm-dishes">${day.rätter
        .map((rätt) => `<li>${esc(rätt)}</li>`)
        .join("")}</ul>`;

  return `<div class="mm-day">${head}${body}</div>`;
}

function kolumn(titel: string, rätter: string[]): string {
  return `<div class="mm-col"><h3>${esc(titel)}</h3><ul>${rätter
    .map((r) => `<li>${esc(r)}</li>`)
    .join("")}</ul></div>`;
}

const EMPTY_EVERYDAY: Everyday = { pasta: [], meat: [], salad: [] };

/**
 * Renderar lunchmenyn som en självständig HTML-sträng i A4-format.
 * logoSrc förväntas vara en data-URI (bäddas in vid PDF-generering).
 * everyday är krögarens egen "Varje dag"-sektion.
 */
export function renderMenyMall({
  vecka,
  dagar,
  logoSrc,
  everyday = EMPTY_EVERYDAY,
}: {
  vecka: number;
  dagar: MenuDay[];
  logoSrc?: string | null;
  everyday?: Everyday;
}): string {
  const logo = logoSrc
    ? `<img class="mm-logo" src="${logoSrc}" alt="Restaurangens logga" />`
    : `<div class="mm-wordmark">Lunchmeny</div>`;

  const header = `<header class="mm-header">${logo}<div class="mm-title"><span class="mm-title-label">Lunch Meny</span><span class="mm-title-week">Vecka ${vecka}</span></div></header>`;

  const days = `<main class="mm-days">${dagar.map(dagBlock).join("")}</main>`;

  // "Varje dag" – visa bara kolumner som har rätter, och hela sektionen bara
  // om något finns ifyllt.
  const columns = [
    ["Pasträtter", everyday.pasta],
    ["Kötträtter", everyday.meat],
    ["Sallader", everyday.salad],
  ] as const;
  const filled = columns.filter(([, items]) => items.length > 0);

  const footer =
    filled.length > 0
      ? `<footer class="mm-footer"><h2 class="mm-footer-title">VARJE DAG</h2><div class="mm-cols">${filled
          .map(([titel, items]) => kolumn(titel, items))
          .join("")}</div></footer>`
      : "";

  return `<div class="mm-root"><style>${CSS}</style>${header}${days}${footer}</div>`;
}
