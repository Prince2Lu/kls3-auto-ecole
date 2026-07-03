import type { DocumentType } from "@/lib/types/documents";
import { calculateAge } from "@/lib/students/age";

export type RequiredDocumentConfig = {
  type: DocumentType;
  label: string;
  accept: string;
  acceptMimeTypes: readonly string[];
  maxBytes: number;
  requiresDeclaredDate?: boolean;
};

const TEN_MB = 10 * 1024 * 1024;

export const REQUIRED_DOCUMENT_TYPES: readonly RequiredDocumentConfig[] = [
  {
    type: "cni",
    label: "Carte nationale d'identité",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
  },
  {
    type: "photo",
    label: "Photo d'identité",
    accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
    acceptMimeTypes: ["image/jpeg", "image/png"],
    maxBytes: TEN_MB,
  },
  {
    type: "domicile",
    label: "Justificatif de domicile",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
    requiresDeclaredDate: true,
  },
  {
    type: "assr",
    label: "ASSR / ASR",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
  },
  {
    type: "jdc",
    label: "Attestation de recensement / JDC",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
  },
  {
    type: "rib",
    label: "RIB",
    accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf",
    acceptMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxBytes: TEN_MB,
  },
] as const;

export function getDocumentConfig(type: DocumentType) {
  return REQUIRED_DOCUMENT_TYPES.find((doc) => doc.type === type);
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
