/**
 * Checksums déterministes utilisés pour décider automatiquement si une
 * extraction OCR peut être présentée à la secrétaire pour confirmation en un
 * clic (US15), sans jamais valider quoi que ce soit de manière autonome.
 */

/**
 * Validation IBAN par checksum mod-97 (ISO 13616).
 * (Inchangé — déplacé depuis lib/ocr/extract.ts.)
 */
export function validateIbanChecksum(iban: string): boolean {
  const normalized = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalized) || normalized.length < 15) {
    return false;
  }

  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 65 ? (code - 55).toString() : char;
    })
    .join("");

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = remainder.toString() + numeric.slice(i, i + 7);
    remainder = parseInt(block, 10) % 97;
  }

  return remainder === 1;
}

const MRZ_CHAR_VALUES: Record<string, number> = {};
"0123456789".split("").forEach((c, i) => {
  MRZ_CHAR_VALUES[c] = i;
});
"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((c, i) => {
  MRZ_CHAR_VALUES[c] = i + 10;
});
MRZ_CHAR_VALUES["<"] = 0;

const MRZ_WEIGHTS = [7, 3, 1];

/**
 * Calcule le chiffre de contrôle MRZ (ICAO 9303) pour une chaîne donnée.
 * Pondération 7-3-1 répétée, chaque caractère mappé sur sa valeur numérique
 * (0-9 -> lui-même, A-Z -> 10-35, '<' -> 0), somme mod 10.
 */
export function mrzCheckDigit(input: string): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const value = MRZ_CHAR_VALUES[input[i]] ?? 0;
    sum += value * MRZ_WEIGHTS[i % 3];
  }
  return sum % 10;
}

/**
 * Compare un chiffre de contrôle MRZ observé à sa valeur attendue.
 * `observed` doit être un chiffre unique ('0'-'9') ou '<' (champ vide,
 * traité comme invalide plutôt qu'ignoré : on ne veut jamais valider par
 * défaut sur un champ manquant).
 */
export function isMrzCheckDigitValid(input: string, observed: string): boolean {
  if (!/^[0-9]$/.test(observed)) return false;
  return mrzCheckDigit(input) === Number(observed);
}
