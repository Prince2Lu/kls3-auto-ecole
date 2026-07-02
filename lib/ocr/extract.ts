import { callVisionOcr } from "@/lib/ocr/vision-client";
import { parseRibText } from "@/lib/ocr/parse-rib";
import { parseCniMrz, parseCniFreeText } from "@/lib/ocr/parse-cni";
import { validateIbanChecksum } from "@/lib/ocr/checksums";
import type { OcrExtractedData } from "@/lib/types/ocr";

export { validateIbanChecksum } from "@/lib/ocr/checksums";

export type OcrExtractionResult = {
  extractedData: OcrExtractedData;
  ibanChecksumValid: boolean | null;
  mrzChecksumValid: boolean | null;
  /** true seulement si un checksum déterministe a confirmé la donnée
   * extraite (IBAN mod-97 ou MRZ ICAO 9303). Détermine si l'extraction peut
   * être présentée en confirmation 1-clic ("pending") ou si elle doit être
   * traitée comme un échec OCR (US16). Jamais true sur le repli texte libre
   * CNI, qui n'a pas de checksum possible. */
  ocrSucceeded: boolean;
};

/**
 * Appelle Vision API sur le document et route vers le parseur adapté au
 * type de document. Ne lève jamais d'exception pour un échec "métier"
 * (document illisible, checksum invalide) — seulement pour une erreur
 * d'infrastructure (clé API manquante, Vision API indisponible), à charge
 * de l'appelant de la catcher pour ne jamais bloquer l'upload élève.
 */
export async function extractFromDocument(
  buffer: Buffer,
  mimeType: string,
  documentType: "cni" | "rib"
): Promise<OcrExtractionResult> {
  const rawText = await callVisionOcr(buffer, mimeType);
  console.log("[DEBUG OCR]", documentType, "texte brut:", rawText || "(vide)");

  if (documentType === "rib") {
    const { iban, bic, titulaire } = parseRibText(rawText);
    const ibanChecksumValid = iban ? validateIbanChecksum(iban) : null;

    return {
      extractedData: { iban: iban ?? "", bic: bic ?? "", titulaire: titulaire ?? "" },
      ibanChecksumValid,
      mrzChecksumValid: null,
      ocrSucceeded: ibanChecksumValid === true,
    };
  }

  const mrzResult = parseCniMrz(rawText);
  if (mrzResult) {
    return {
      extractedData: {
        nom: mrzResult.nom,
        prenom: mrzResult.prenom,
        date_naissance: mrzResult.date_naissance,
      },
      ibanChecksumValid: null,
      mrzChecksumValid: mrzResult.checksumValid,
      ocrSucceeded: mrzResult.checksumValid,
    };
  }

  // Pas de MRZ détectée (ancien format de carte, ou zone illisible) :
  // repli texte libre, jamais considéré comme fiable automatiquement.
  const freeText = parseCniFreeText(rawText);
  return {
    extractedData: {
      nom: freeText.nom ?? "",
      prenom: freeText.prenom ?? "",
      date_naissance: freeText.date_naissance ?? "",
    },
    ibanChecksumValid: null,
    mrzChecksumValid: null,
    ocrSucceeded: false,
  };
}
