/**
 * Extraction de texte brut depuis un PDF natif numérique (couche texte
 * présente), en repli avant tout appel à Vision API — la majorité des RIB
 * bancaires sont des PDF de ce type, jamais des scans.
 *
 * Volontairement isolé de extract.ts : si `pdf-parse` doit être remplacé
 * un jour (ex. cas des PDF scannés nécessitant une rasterisation), seul ce
 * fichier est concerné.
 *
 * Fixé sur pdf-parse v1.1.1 (pas la v2, dont l'API a changé — exports
 * multiples ESM/CJS/worker, non testée ici). v1 expose une fonction
 * unique `pdf(buffer) => Promise<{ text: string, numpages: number, ... }>`,
 * stable et largement éprouvée en environnement Node serverless (Vercel).
 */

import pdfParse from "pdf-parse/lib/pdf-parse.js";

/** Nombre de caractères non-blancs minimum pour considérer qu'un PDF a une
 * couche texte exploitable. Un PDF scanné produit généralement une chaîne
 * vide ou quasi vide (parfois quelques caractères parasites) — ce seuil
 * évite de traiter du bruit comme un texte exploitable tout en restant
 * permissif sur les RIB courts (un RIB tient sur quelques lignes). */
const MIN_EXTRACTABLE_CHARS = 20;

export type PdfTextExtractionResult = {
  /** Texte brut extrait, tabulations normalisées en espaces (pdf-parse
   * sépare souvent les colonnes par \t plutôt que par un espace simple,
   * ce qui casse les regex de parse-rib.ts/parse-cni.ts conçues pour du
   * texte Vision — elles utilisent des espaces). Vide si non exploitable. */
  text: string;
  /** false si le PDF n'a pas de couche texte exploitable (scan probable) —
   * à charge de l'appelant de router vers l'échec OCR classique plutôt que
   * de tenter une rasterisation (non supportée en l'état, pas de binaire
   * système disponible sur Vercel serverless). */
  hasExtractableText: boolean;
};

/**
 * Tente d'extraire le texte d'un PDF natif. Ne lève jamais d'exception
 * "métier" : un PDF corrompu ou un scan sans texte retourne simplement
 * hasExtractableText: false, à charge de l'appelant de traiter ça comme un
 * échec OCR classique (US8/US16) — même contrat que callVisionOcr côté
 * erreurs métier.
 */
export async function extractPdfText(
  buffer: Buffer
): Promise<PdfTextExtractionResult> {
  let rawText = "";

  try {
    const result = await pdfParse(buffer);
    rawText = result.text ?? "";
  } catch (err) {
    console.error("[extractPdfText] Échec parsing PDF:", {
      error: err instanceof Error ? err.message : err,
    });
    return { text: "", hasExtractableText: false };
  }

  // Normalisation \t -> espace : pdf-parse restitue souvent les colonnes
  // d'un document tabulaire (RIB, tableau CNI) séparées par des
  // tabulations plutôt que par le simple espace attendu par IBAN_PATTERN
  // et les autres regex de parse-rib.ts/parse-cni.ts (conçues pour la
  // sortie texte de Vision, qui utilise des espaces). Sans cette
  // normalisation, un IBAN du type "FR76\t3000\t6000..." n'est pas reconnu
  // par le pattern qui attend "FR76 3000 6000...".
  const normalizedText = rawText.replace(/\t/g, " ");

  const nonWhitespaceCount = normalizedText.replace(/\s/g, "").length;
  const hasExtractableText = nonWhitespaceCount >= MIN_EXTRACTABLE_CHARS;

  return {
    text: hasExtractableText ? normalizedText : "",
    hasExtractableText,
  };
}
