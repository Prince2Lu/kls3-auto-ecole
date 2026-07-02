/**
 * Extraction de champs CNI depuis du texte OCR brut.
 *
 * Deux voies, dans l'ordre de priorité :
 * 1. Zone MRZ (CNIe, format 2021+) : 3 lignes de 30 caractères en bas de la
 *    carte, format TD1 (ICAO 9303). Auto-porteuse de chiffres de contrôle —
 *    même rôle que le checksum IBAN pour le RIB : on ne considère
 *    l'extraction fiable que si ces checksums passent.
 * 2. Repli texte libre (ancien format sans MRZ, ou MRZ illisible par
 *    l'OCR) : recherche par labels ("Nom", "Prénom(s)", date de naissance).
 *    Aucun checksum possible sur ce chemin -> jamais considéré comme
 *    validé automatiquement, toujours renvoyé vers la revue secrétaire.
 */

import { isMrzCheckDigitValid } from "./checksums";

export type ParsedCniMrz = {
  nom: string;
  prenom: string;
  date_naissance: string;
  checksumValid: boolean;
};

export type ParsedCniFreeText = {
  nom?: string;
  prenom?: string;
  date_naissance?: string;
};

function findMrzLines(rawText: string): [string, string, string] | null {
  const candidateLines = rawText
    .split(/\r?\n/)
    .map((line) => line.toUpperCase().replace(/[^A-Z0-9<]/g, ""))
    .filter((line) => line.length === 30);

  for (let i = 0; i + 2 < candidateLines.length; i++) {
    return [candidateLines[i], candidateLines[i + 1], candidateLines[i + 2]];
  }
  return null;
}

function decodeMrzDate(yyMMdd: string): string | null {
  if (!/^\d{6}$/.test(yyMMdd)) return null;
  const yy = Number(yyMMdd.slice(0, 2));
  const mm = yyMMdd.slice(2, 4);
  const dd = yyMMdd.slice(4, 6);
  // Pas de siècle explicite en MRZ : heuristique standard basée sur l'année
  // courante (les CNI en circulation ont une validité de 10-15 ans, une CNI
  // "née" avant l'an 2000 aurait aujourd'hui largement dépassé cette durée
  // pour un titulaire encore en âge de passer le permis).
  const currentYY = new Date().getFullYear() % 100;
  const century = yy > currentYY + 5 ? 1900 : 2000;
  return `${century + yy}-${mm}-${dd}`;
}

function decodeMrzName(line3: string): { nom: string; prenom: string } {
  const [surnamePart, givenPart = ""] = line3.split("<<");
  return {
    nom: surnamePart.replace(/</g, " ").trim(),
    prenom: givenPart.replace(/</g, " ").trim(),
  };
}

export function parseCniMrz(rawText: string): ParsedCniMrz | null {
  const mrzLines = findMrzLines(rawText);
  if (!mrzLines) return null;
  const [line1, line2, line3] = mrzLines;

  const documentNumberBlock = line1.slice(5, 14);
  const documentNumberCheck = line1.slice(14, 15);
  const birthDateBlock = line2.slice(0, 6);
  const birthDateCheck = line2.slice(6, 7);
  const expiryDateBlock = line2.slice(8, 14);
  const expiryDateCheck = line2.slice(14, 15);
  const compositeInput =
    line1.slice(5, 30) + line2.slice(0, 7) + line2.slice(8, 15) + line2.slice(18, 29);
  const compositeCheck = line2.slice(29, 30);

  const checksumValid =
    isMrzCheckDigitValid(documentNumberBlock, documentNumberCheck) &&
    isMrzCheckDigitValid(birthDateBlock, birthDateCheck) &&
    isMrzCheckDigitValid(expiryDateBlock, expiryDateCheck) &&
    isMrzCheckDigitValid(compositeInput, compositeCheck);

  const { nom, prenom } = decodeMrzName(line3);
  const dateNaissance = decodeMrzDate(birthDateBlock) ?? birthDateBlock;

  return { nom, prenom, date_naissance: dateNaissance, checksumValid };
}

function extractValueAfterLabel(
  lines: string[],
  labelPattern: RegExp
): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    if (!labelPattern.test(lines[i])) continue;

    // Sur une CNI, le label et sa valeur sont quasi toujours sur deux
    // lignes distinctes en sortie Vision (ex: "NOM/Surname" puis
    // "SCARPINO") — on privilégie la ligne suivante.
    const next = lines[i + 1]?.trim();
    if (next) return next;

    // Repli : label et valeur sur la même ligne (variante de mise en page).
    const stripped = lines[i]
      .replace(labelPattern, "")
      .replace(/^[/:\s]+/, "")
      .trim();
    if (stripped) return stripped;
  }
  return undefined;
}

// Accepte les séparateurs '.', '/', '-' et l'espace (ex: "07 06 1974",
// format observé sur la zone visuelle recto d'une CNIe).
const DATE_PATTERN = /\b(\d{2})[.\/\- ](\d{2})[.\/\- ](\d{4})\b/;

export function parseCniFreeText(rawText: string): ParsedCniFreeText {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const nom = extractValueAfterLabel(lines, /^NOM\b/i);
  const prenom = extractValueAfterLabel(lines, /^PR[ÉE]NOMS?\b/i);

  const birthLabelIndex = lines.findIndex((line) =>
    /DATE DE NAISS|Date of birth/i.test(line)
  );

  let date_naissance: string | undefined;
  if (birthLabelIndex !== -1) {
    const candidates = [
      lines[birthLabelIndex + 1],
      lines[birthLabelIndex],
    ].filter((line): line is string => Boolean(line));

    for (const candidate of candidates) {
      const match = candidate.match(DATE_PATTERN);
      if (match) {
        date_naissance = `${match[3]}-${match[2]}-${match[1]}`;
        break;
      }
    }
  }

  return { nom, prenom, date_naissance };
}
