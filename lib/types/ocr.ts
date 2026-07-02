/**
 * Types liés au pipeline OCR (US15/US16).
 *
 * Remplace l'usage de `OcrExtractedData` défini dans lib/types/domain.ts,
 * qui datait du schéma pré-0009 (non touché depuis, gardé tel quel pour ne
 * pas casser lib/tenant/resolve.ts qui importe Tenant/TenantBranding du même
 * fichier).
 */

export type OcrExtractionStatus =
  | "pending"
  | "failed_student_action"
  | "failed_secretary_entry"
  | "validated";

export type OcrEntryMethod = "ocr" | "manual";

/** Nombre de tentatives OCR consécutives en échec avant d'escalader vers la
 * saisie manuelle secrétaire (US16 : "si l'OCR échoue malgré plusieurs
 * tentatives"). En dessous de ce seuil, l'élève est invité à retéléverser
 * (US8) plutôt que de mobiliser la secrétaire dès le premier échec. */
export const OCR_ATTEMPTS_BEFORE_MANUAL_ENTRY = 2;

export type OcrExtractedData = {
  iban?: string;
  bic?: string;
  titulaire?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  [key: string]: string | undefined;
};

export type ManualRibEntry = {
  iban: string;
  bic: string;
  titulaire: string;
};

export type ManualCniEntry = {
  nom: string;
  prenom: string;
  date_naissance: string;
};

export type ManualOcrEntry = ManualRibEntry | ManualCniEntry;
