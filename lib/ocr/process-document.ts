import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { extractFromDocument } from "@/lib/ocr/extract";
import {
  OCR_ATTEMPTS_BEFORE_MANUAL_ENTRY,
  type OcrExtractedData,
  type OcrExtractionStatus,
} from "@/lib/types/ocr";

type ProcessDocumentOcrParams = {
  documentId: string;
  tenantId: string;
  documentType: "cni" | "rib";
  buffer: Buffer;
  mimeType: string;
};

/** 1er échec -> on suppose une photo illisible, on renvoie vers un
 * retéléversement élève (US8). À partir du seuil -> on suppose que le
 * problème n'est pas juste la photo, on bascule sur la saisie manuelle
 * secrétaire en dernier recours (US16). */
function classifyStatus(
  ocrSucceeded: boolean,
  attemptCount: number
): OcrExtractionStatus {
  if (ocrSucceeded) return "pending";
  return attemptCount >= OCR_ATTEMPTS_BEFORE_MANUAL_ENTRY
    ? "failed_secretary_entry"
    : "failed_student_action";
}

/**
 * Traite l'OCR d'un document fraîchement uploadé (ou re-uploadé) et
 * upsert le résultat dans ocr_extractions. N'appelle jamais d'exception :
 * une erreur d'infrastructure (Vision API indisponible, clé manquante) est
 * traitée comme un échec OCR classique plutôt que de remonter et bloquer
 * l'upload élève, qui doit toujours réussir indépendamment du sort de l'OCR.
 */
export async function processDocumentOcr(
  admin: SupabaseClient<Database>,
  { documentId, tenantId, documentType, buffer, mimeType }: ProcessDocumentOcrParams
): Promise<void> {
  const { data: existing } = await admin
    .from("ocr_extractions")
    .select("attempt_count, status")
    .eq("document_id", documentId)
    .maybeSingle();

  // Un document déjà validé referme le cycle d'échecs précédent : un nouveau
  // passage OCR après validation repart à zéro, plutôt que d'hériter du
  // compteur d'avant (qui mesurait un historique devenu non pertinent).
  const previousAttemptCount =
    existing?.status === "validated" ? 0 : existing?.attempt_count ?? 0;
  const attemptCount = previousAttemptCount + 1;

  let extractedData: OcrExtractedData = {};
  let ibanChecksumValid: boolean | null = null;
  let mrzChecksumValid: boolean | null = null;
  let ocrSucceeded = false;

  try {
    const result = await extractFromDocument(buffer, mimeType, documentType);
    extractedData = result.extractedData;
    ibanChecksumValid = result.ibanChecksumValid;
    mrzChecksumValid = result.mrzChecksumValid;
    ocrSucceeded = result.ocrSucceeded;
  } catch (err) {
    console.error("[processDocumentOcr] Échec appel Vision API:", {
      documentId,
      documentType,
      error: err instanceof Error ? err.message : err,
    });
  }

  const status = classifyStatus(ocrSucceeded, attemptCount);

  const { error } = await admin.from("ocr_extractions").upsert(
    {
      document_id: documentId,
      tenant_id: tenantId,
      document_type: documentType,
      extracted_data: extractedData,
      iban_checksum_valid: ibanChecksumValid,
      mrz_checksum_valid: mrzChecksumValid,
      status,
      attempt_count: attemptCount,
      entry_method: "ocr",
      // Un nouveau passage OCR invalide toute confirmation précédente : si
      // le fichier a été retéléversé, une éventuelle validation antérieure
      // ne correspond plus à ce qui est réellement en base.
      validated_at: null,
      validated_by: null,
    },
    { onConflict: "document_id" }
  );

  if (error) {
    console.error("[processDocumentOcr] Échec upsert ocr_extractions:", {
      documentId,
      code: error.code,
      message: error.message,
    });
  }
}
