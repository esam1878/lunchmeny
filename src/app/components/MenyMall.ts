import type { MenuDay } from "@/lib/menu";

// Statisk "Serveras varje dag"-sektion (samma databindning som tidigare).
const PASTARATTER = [
  "Spaghetti Carbonara",
  "Spaghetti Bolognese",
  "Spaghetti Frutti de Mare",
  "Vegetarisk Spaghetti",
  "Rigatoni al Filetto",
  "Rigatoni Emiliana",
  "Lasagne al Forno",
];

const KOTTRATTER = [
  "Lammfärsbiffar",
  "Kycklingspett",
  "Grillad Biff",
  "Grillad Fläskfile",
  "Cajunmarinerade Fläsknoisetter",
  "Fläskkarre",
  "Grillad Entrecote",
];

const SALLADER = [
  "Caesarsallad",
  "Tonsfisksallad",
  "Ost & Skinksallad",
  "Räksallad",
];

// Ny design (Limerick "Vecka 26"): crème bakgrund, grön/orange accenter och
// serif-typografi (DM Serif Display, Libre Baskerville, Source Serif 4, Archivo).
const CSS = `
  .mm-root * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mm-root {
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    background: #faf6ec;
    color: #1a1a1a;
    font-family: "Source Serif 4", serif;
    padding: 42px 58px 32px;
    display: flex;
    flex-direction: column;
  }
  @page { size: A4; margin: 0; }
  @media print {
    .mm-root { width: 210mm; min-height: 297mm; }
  }

  /* Header */
  .mm-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 13px;
    margin-bottom: 14px;
  }
  .mm-logo { width: 320px; height: auto; display: block; }
  .mm-wordmark {
    font-family: "DM Serif Display", serif;
    font-size: 38px;
    color: #1f6b34;
  }
  .mm-veckans {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
  }
  .mm-rule { flex: 1; height: 1px; background: #d4c8ad; }
  .mm-veckans-text {
    font-family: "DM Serif Display", serif;
    font-size: 25px;
    color: #1f6b34;
    letter-spacing: 0.5px;
  }
  .mm-subtitle {
    font-family: "Archivo", sans-serif;
    font-size: 13.5px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #a8480c;
  }

  /* Veckodagar */
  .mm-days { display: flex; flex-direction: column; gap: 9px; }
  .mm-day-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 9px;
  }
  .mm-day-name {
    font-family: "Libre Baskerville", serif;
    font-size: 24px;
    color: #1f6b34;
    margin: 0;
  }
  .mm-rod-dag {
    font-family: "Archivo", sans-serif;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #a8480c;
  }
  .mm-day-rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, #d8c79a, transparent);
  }
  .mm-dishes { display: flex; flex-direction: column; gap: 7px; }
  .mm-dish {
    margin: 0;
    font-size: 17px;
    line-height: 1.45;
    color: #1a1a1a;
  }
  .mm-holiday {
    margin: 0;
    font-size: 17px;
    line-height: 1.45;
    font-style: italic;
    color: #a8480c;
  }

  /* Serveras varje dag */
  .mm-everyday {
    margin-top: 12px;
    border-top: 2px solid #1f6b34;
    padding-top: 12px;
  }
  .mm-everyday-head {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 18px;
  }
  .mm-diamond { color: #d96a1f; font-size: 11px; }
  .mm-everyday-title {
    font-family: "Libre Baskerville", serif;
    font-size: 15px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #1f6b34;
  }
  .mm-everyday-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 26px;
  }
  .mm-everyday-col-title {
    font-family: "Libre Baskerville", serif;
    font-size: 15px;
    color: #a8480c;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }
  .mm-everyday-col-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14.5px;
    color: #2b2622;
  }

  /* Footer */
  .mm-spacer { flex: 1; }
  .mm-footer {
    text-align: center;
    font-style: italic;
    font-size: 13px;
    color: #6b6258;
    padding-top: 18px;
  }
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
  const tag = day.rödDag ? `<span class="mm-rod-dag">Röd dag</span>` : "";
  const head = `<div class="mm-day-head"><h3 class="mm-day-name">${esc(day.dag)}</h3>${tag}<div class="mm-day-rule"></div></div>`;

  const body = day.rödDag
    ? `<div class="mm-dishes"><p class="mm-holiday">${esc(day.helgdag ?? "Helgdag")}</p></div>`
    : `<div class="mm-dishes">${day.rätter
        .map((rätt) => `<p class="mm-dish">${esc(rätt)}</p>`)
        .join("")}</div>`;

  return `<div>${head}${body}</div>`;
}

function everydayCol(titel: string, rätter: string[]): string {
  return `<div><div class="mm-everyday-col-title">${esc(titel)}</div><div class="mm-everyday-col-list">${rätter
    .map((r) => `<span>${esc(r)}</span>`)
    .join("")}</div></div>`;
}

/**
 * Renderar lunchmenyn som en självständig HTML-sträng i A4-format.
 * logoSrc förväntas vara en data-URI (bäddas in vid PDF-generering).
 */
export function renderMenyMall({
  vecka,
  dagar,
  logoSrc,
}: {
  vecka: number;
  dagar: MenuDay[];
  logoSrc?: string | null;
}): string {
  const logo = logoSrc
    ? `<img class="mm-logo" src="${logoSrc}" alt="Restaurangens logga" />`
    : `<div class="mm-wordmark">Lunchmeny</div>`;

  const header = `<div class="mm-header">${logo}<div class="mm-veckans"><div class="mm-rule"></div><div class="mm-veckans-text">Veckans Lunch</div><div class="mm-rule"></div></div><div class="mm-subtitle">Vecka ${vecka} — serveras 10–16 — 120 kr</div></div>`;

  const days = `<div class="mm-days">${dagar.map(dagBlock).join("")}</div>`;

  const everyday = `<div class="mm-everyday"><div class="mm-everyday-head"><span class="mm-diamond">◆</span><div class="mm-everyday-title">Serveras varje dag</div><span class="mm-diamond">◆</span></div><div class="mm-everyday-grid">${everydayCol(
    "Pastarätter",
    PASTARATTER,
  )}${everydayCol("Kötträtter", KOTTRATTER)}${everydayCol("Sallader", SALLADER)}</div></div>`;

  const footer = `<div class="mm-spacer"></div><div class="mm-footer">Hjärtligt välkomna till Restaurang Limerick bar och grill</div>`;

  return `<div class="mm-root"><style>${CSS}</style>${header}${days}${everyday}${footer}</div>`;
}
