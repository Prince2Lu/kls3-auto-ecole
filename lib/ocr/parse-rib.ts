/**
 * Extraction de champs RIB depuis du texte OCR brut (pas de champs
 * structurés côté Vision API — c'est le compromis de l'architecture simple
 * retenue). Le format RIB français est assez standardisé (labels IBAN / BIC
 * / Titulaire présents sur la quasi-totalité des relevés bancaires), donc
 * une recherche par proximité de label est plus fiable qu'un regex global
 * sur tout le document.
 */

const IBAN_PATTERN = /\b([A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}[ ]?[A-Z0-9]{1,4})\b/;
const BIC_PATTERN = /\b([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/;

function normalizeLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Cherche un pattern près d'un label donné : sur la même ligne après le
 * label, sinon sur la ligne suivante (mise en page en deux colonnes ou en
 * lignes séparées, fréquente sur les RIB scannés). */
function findNearLabel(
  lines: string[],
  labelPattern: RegExp,
  valuePattern: RegExp
): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!labelPattern.test(lines[i])) continue;

    const sameLineMatch = lines[i].match(valuePattern);
    if (sameLineMatch) return sameLineMatch[1];

    const nextLine = lines[i + 1];
    if (nextLine) {
      const nextLineMatch = nextLine.match(valuePattern);
      if (nextLineMatch) return nextLineMatch[1];
    }
  }
  return undefined;
}

export type ParsedRib = {
  iban?: string;
  bic?: string;
  titulaire?: string;
};

export function parseRibText(rawText: string): ParsedRib {
  const lines = normalizeLines(rawText.toUpperCase());

  const iban =
    findNearLabel(lines, /IBAN/, IBAN_PATTERN) ??
    rawText.toUpperCase().match(IBAN_PATTERN)?.[1];

  const bic =
    findNearLabel(lines, /\bBIC\b|SWIFT/, BIC_PATTERN) ??
    undefined; // pas de fallback global : le pattern BIC est trop générique
  // pour être cherché sans ancrage sur le label (faux positifs probables).

  const titulaireLine = lines.find((line) => /TITULAIRE/.test(line));
  const titulaire = titulaireLine
    ? titulaireLine.replace(/TITULAIRE( DU COMPTE)?\s*:?/, "").trim() ||
      undefined
    : undefined;

  return {
    iban: iban?.replace(/\s/g, ""),
    bic,
    titulaire,
  };
}
