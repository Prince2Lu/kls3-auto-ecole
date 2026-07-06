import type { DocumentType } from "@/lib/types/documents";
import { calculateAge } from "@/lib/students/age";

export type DocumentCategory = "ants" | "facturation_kls3";

export type RequiredDocumentConfig = {
  type: DocumentType;
  label: string;
  accept: string;
  acceptMimeTypes: readonly string[];
  maxBytes: number;
  requiresDeclaredDate?: boolean;
  /** Pièce réglementaire ANTS (transmise au client via US18) vs pièce de
   * facturation KLS3 (le RIB) — décision actée le 6 juillet 2026. Fixe par
   * type, jamais configurable par tenant : le RIB n'est jamais une pièce
   * ANTS, quel que soit le contexte. */
  category: DocumentCategory;
};

const TEN_MB = 10 * 1024 * 1024;

export const REQUIRED_DOCUMENT_TYPES: readonly RequiredDocumentConfig[] = [
  {
    type: "cni",
    label: "Carte nationale d'identité",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
    category: "ants",
  },
  {
    type: "photo",
    label: "Photo d'identité",
    accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
    acceptMimeTypes: ["image/jpeg", "image/png"],
    maxBytes: TEN_MB,
    category: "ants",
  },
  {
    type: "domicile",
    label: "Justificatif de domicile",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
    requiresDeclaredDate: true,
    category: "ants",
  },
  {
    type: "assr",
    label: "ASSR / ASR",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
    category: "ants",
  },
  {
    type: "jdc",
    label: "Attestation de recensement / JDC",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
    category: "ants",
  },
  {
    type: "rib",
    label: "RIB",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
    category: "facturation_kls3",
  },
] as const;

export function getDocumentConfig(type: DocumentType) {
  return REQUIRED_DOCUMENT_TYPES.find((doc) => doc.type === type);
}

/** Dérive la catégorie à partir du type — utilisé à l'insertion pour
 * peupler documents.category de façon fiable (pas de saisie manuelle
 * possible, mapping fixe défini une seule fois ici). */
export function getDocumentCategory(type: DocumentType): DocumentCategory {
  return getDocumentConfig(type)?.category ?? "ants";
}

export function computeRequiredDocumentTypes(
  dateOfBirth: string | null
): readonly RequiredDocumentConfig[] {
  if (!dateOfBirth) {
    return REQUIRED_DOCUMENT_TYPES.filter(
      (doc) => doc.type !== "assr" && doc.type !== "jdc"
    );
  }

  const age = calculateAge(dateOfBirth);
  return REQUIRED_DOCUMENT_TYPES.filter((doc) => {
    if (doc.type === "assr") return age < 21;
    if (doc.type === "jdc") return age >= 17 && age <= 25;
    return true;
  });
}