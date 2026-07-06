import { callVisionOcr } from "@/lib/ocr/vision-client";
import { extractPdfText } from "@/lib/ocr/extract-pdf-text";
import { parseRibText } from "@/lib/ocr/parse-rib";
import { parseCniMrz, parseCniFreeText } from "@/lib/ocr/parse-cni";
import { validateIbanChecksum } from "@/lib/ocr/checksums";
import type { OcrExtractedData } from "@/lib/types/ocr";

export { validateIbanChecksum } from "@/lib/ocr/checksums";

const PDF_MIME_TYPE = "application/pdf";

/**
 * Résout le texte brut du document, quelle que soit sa source :
 * - PDF natif numérique (couche texte présente) -> pdf-parse, jamais
 *   d'appel Vision (inutile, et Vision rejetterait le MIME de toute façon).
 * - PDF scanné (pas de couche texte exploitable) -> chaîne vide, même
 *   contrat qu'une image illisible : l'appelant route vers l'échec OCR
 *   classique (US8/US16). Pas de rasterisation en repli : pas de binaire
 *   système disponible sur Vercel serverless, à évaluer séparément si le
 *   volume de PDF scannés s'avère significatif.
 * - Image (jpg/png) -> comportement inchangé, appel Vision direct.
 */
async function resolveRawText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === PDF_MIME_TYPE) {
    const { text, hasExtractableText } = await extractPdfText(buffer);
    if (!hasExtractableText) {
      console.log(
        "[DEBUG OCR] PDF sans couche texte exploitable (scan probable) — pas d'appel Vision, échec OCR classique."
      );
    }
    return text;
  }

  return callVisionOcr(buffer, mimeType);
}

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
 * Résout le texte brut du document (PDF natif via pdf-parse, sinon Vision
 * API pour les images) et route vers le parseur adapté au type de
 * document. Ne lève jamais d'exception pour un échec "métier" (document
 * illisible, checksum invalide, PDF scanné sans couche texte) — seulement
 * pour une erreur d'infrastructure (clé API manquante, Vision API
 * indisponible), à charge de l'appelant de la catcher pour ne jamais
 * bloquer l'upload élève.
 */
export async function extractFromDocument(
  buffer: Buffer,
  mimeType: string,
  documentType: "cni" | "rib"
): Promise<OcrExtractionResult> {
  const rawText = await resolveRawText(buffer, mimeType);
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
