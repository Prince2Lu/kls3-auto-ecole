/**
 * Extraction de champs RIB depuis du texte OCR brut (pas de champs
 * structurés côté Vision API — c'est le compromis de l'architecture simple
 * retenue). Le format RIB français est assez standardisé (labels IBAN / BIC
 * / Titulaire présents sur la quasi-totalité des relevés bancaires), donc
 * une recherche par proximité de label est plus fiable qu'un regex global
 * sur tout le document.
 *
 * Fallbacks "texte compacté" (ajoutés pour le support PDF natif) : un RIB
 * mis en page en tableau (cases séparées pour chaque groupe de l'IBAN, une
 * lettre par cellule pour le BIC — ex. Caisse d'Épargne) produit, une fois
 * extrait par pdf-parse, un texte où les segments sont collés sans
 * séparateur cohérent et répartis sur des lignes imprévisibles ("FR76",
 * "15135005", "000483344209605" chacun sur sa ligne, sans espace entre
 * segments). findNearLabel/IBAN_PATTERN ne peut pas reconstituer ça : le
 * pattern attend des groupes séparés par des espaces optionnels, pas des
 * segments coupés à des positions arbitraires. Les fonctions
 * findIbanCompact/findBicCompact compactent tout le texte (suppression de
 * tous les espaces/retours) puis cherchent après le label — cette
 * approche est complémentaire de findNearLabel, jamais un remplacement :
 * elle n'intervient qu'en repli si la méthode ligne-par-ligne échoue, donc
 * le comportement existant sur du texte Vision (images) est inchangé.
 */

/** Patterns du premier essai (findNearLabel, texte ligne par ligne, sur
 * fichier non compacté) — inchangés, c'est le comportement original
 * réutilisé tel quel pour le cas Vision/image standard. */
const IBAN_PATTERN = /\b([A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}[ ]?[A-Z0-9]{1,4})\b/;
const BIC_PATTERN = /\b([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/;

/** IBAN français : FR + 2 chiffres de clé + 23 caractères alphanumériques
 * (BBAN), soit 27 caractères au total — cas très majoritaire, testé en
 * priorité. Repli générique 15-34 caractères pour les autres pays (SEPA),
 * moins fréquent dans ce contexte mais pas exclu. */
const FR_IBAN_COMPACT_PATTERN = /^(FR\d{2}[A-Z0-9]{23})/;
const GENERIC_IBAN_COMPACT_PATTERN = /^([A-Z]{2}\d{2}[A-Z0-9]{11,30})/;
const BIC_COMPACT_PATTERN = /^([A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)/;

function normalizeLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Cherche un pattern près d'un label donné : sur la même ligne après le
 * label, sinon sur la ligne suivante (mise en page en deux colonnes ou en
 * lignes séparées, fréquente sur les RIB scannés).
 *
 * Piège corrigé : un libellé complet entre parenthèses (ex. "BIC
 * (Identifiant international de l'établissement)") peut contenir un mot
 * qui matche accidentellement valuePattern — "IDENTIFIANT" (8 lettres)
 * correspond au format d'un BIC. On exclut donc le contenu jusqu'à la
 * parenthèse fermante avant de chercher sur la même ligne. */
function findNearLabel(
  lines: string[],
  labelPattern: RegExp,
  valuePattern: RegExp
): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!labelPattern.test(lines[i])) continue;

    const closingParenIdx = lines[i].indexOf(")");
    const searchableSameLine =
      closingParenIdx !== -1 ? lines[i].slice(closingParenIdx + 1) : lines[i];

    const sameLineMatch = searchableSameLine.match(valuePattern);
    if (sameLineMatch) return sameLineMatch[1];

    const nextLine = lines[i + 1];
    if (nextLine) {
      const nextLineMatch = nextLine.match(valuePattern);
      if (nextLineMatch) return nextLineMatch[1];
    }
  }
  return undefined;
}

/** Isole la zone de texte compacté qui suit un label, en sautant la
 * parenthèse fermante du libellé complet si présente (ex. "IBAN
 * (IDENTIFIANT INTERNATIONAL DE COMPTE)FR76..." -> on veut chercher après
 * la ")", pas juste après "IBAN", sinon le pattern risque de matcher dans
 * le libellé lui-même — c'est exactement le bug observé sur "BIC
 * (IDENTIFIANT..." où "IDENTIFI" matchait à tort le pattern BIC). */
function zoneAfterLabelCompact(compactUpperText: string, label: string): string | undefined {
  const labelIdx = compactUpperText.indexOf(label);
  if (labelIdx === -1) return undefined;

  const afterLabel = compactUpperText.slice(labelIdx);
  const closingParenIdx = afterLabel.indexOf(")");
  return closingParenIdx !== -1
    ? afterLabel.slice(closingParenIdx + 1)
    : afterLabel.slice(label.length);
}

/** Repli pour les RIB en tableau où l'IBAN est fragmenté sur plusieurs
 * lignes/cellules sans espace entre les segments (ex. Caisse d'Épargne :
 * "FR76", "15135005", "000483344209605" chacun sur sa ligne). Compacte le
 * texte puis ancre la capture en tout début de la zone qui suit le label
 * — un ancrage `^` plutôt qu'une recherche libre dans la zone, pour ne pas
 * dériver dans les lettres du libellé lui-même. */
function findIbanCompact(compactUpperText: string): string | undefined {
  const zone = zoneAfterLabelCompact(compactUpperText, "IBAN");
  if (!zone) return undefined;

  return zone.match(FR_IBAN_COMPACT_PATTERN)?.[1] ?? zone.match(GENERIC_IBAN_COMPACT_PATTERN)?.[1];
}

/** Même principe que findIbanCompact, pour le BIC. */
function findBicCompact(compactUpperText: string): string | undefined {
  const zone = zoneAfterLabelCompact(compactUpperText, "BIC");
  if (!zone) return undefined;

  return zone.match(BIC_COMPACT_PATTERN)?.[1];
}

export type ParsedRib = {
  iban?: string;
  bic?: string;
  titulaire?: string;
};

export function parseRibText(rawText: string): ParsedRib {
  const upperText = rawText.toUpperCase();
  const lines = normalizeLines(upperText);
  const compactText = upperText.replace(/\s+/g, "");

  const iban =
    findNearLabel(lines, /IBAN/, IBAN_PATTERN) ??
    upperText.match(IBAN_PATTERN)?.[1] ??
    findIbanCompact(compactText);

  const bic =
    findNearLabel(lines, /\bBIC\b|SWIFT/, BIC_PATTERN) ??
    findBicCompact(compactText);
    // Toujours pas de fallback global sans ancrage sur label pour le BIC :
    // le pattern est trop générique pour être cherché sur tout le
    // document (faux positifs probables).

  const titulaireLineIdx = lines.findIndex((line) => /TITULAIRE/.test(line));
  let titulaire = titulaireLineIdx !== -1
    ? lines[titulaireLineIdx]
        .replace(/TITULAIRE( DU COMPTE)?\s*:?/, "")
        .trim() || undefined
    : undefined;

  // Repli "Intitulé du compte" (Caisse d'Épargne et probablement d'autres
  // banques n'utilisent pas le mot "TITULAIRE"). Particularité observée :
  // la valeur précède le label dans le flux de texte reconstruit par
  // pdf-parse (contrairement à TITULAIRE, où la valeur suit), donc on
  // regarde la ligne précédente plutôt que la suivante.
  if (!titulaire) {
    const intituleIdx = lines.findIndex((line) => /INTITULÉ DU COMPTE/.test(line));
    if (intituleIdx > 0) {
      const candidateLine = lines[intituleIdx - 1];
      // Filtre basique : une ligne d'adresse/ville ne devrait pas être
      // confondue avec un nom de titulaire. On accepte la ligne
      // précédente telle quelle si elle ne ressemble pas à une ligne
      // purement numérique ou à un label déjà connu.
      if (candidateLine && !/^\d+$/.test(candidateLine)) {
        titulaire = candidateLine;
      }
    }
  }

  return {
    iban: iban?.replace(/\s/g, ""),
    bic,
    titulaire,
  };
}
