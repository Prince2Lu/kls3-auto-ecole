import type { DocumentType } from "@/lib/types/documents";

export type RequiredDocumentConfig = {
  type: DocumentType;
  label: string;
  accept: string;
  acceptMimeTypes: readonly string[];
  maxBytes: number;
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
    type: "assr",
    label: "ASSR / ASR",
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
