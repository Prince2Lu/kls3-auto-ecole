import type { OcrExtractedData } from "@/lib/types/domain";

export type OcrExtractionResult = {
  extractedData: OcrExtractedData;
  ibanChecksumValid: boolean | null;
};

/**
 * Validates IBAN checksum using mod-97 algorithm (ISO 13616).
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

/**
 * Calls external OCR service and parses extracted fields.
 * Stub — integrate with actual OCR provider in a later iteration.
 */
export async function extractFromDocument(
  _file: Blob,
  documentType: "cni" | "rib"
): Promise<OcrExtractionResult> {
  // Placeholder: real OCR integration to be wired up
  const extractedData: OcrExtractedData =
    documentType === "rib"
      ? { iban: "", bic: "", titulaire: "" }
      : { nom: "", prenom: "", date_naissance: "" };

  const iban = extractedData.iban ?? "";
  const ibanChecksumValid = iban ? validateIbanChecksum(iban) : null;

  return { extractedData, ibanChecksumValid };
}
