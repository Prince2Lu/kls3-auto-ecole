import type { Tables } from "./database";

export type Tenant = Tables<"tenants">;
export type TenantBranding = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
};
export type Formula = Tables<"formulas">;
export type TenantMember = Tables<"tenant_members">;
export type Student = Tables<"students">;
export type Document = Tables<"documents">;
export type OcrExtraction = Tables<"ocr_extractions">;
export type Reminder = Tables<"reminders">;

export type StudentStatus =
  | "en_attente"
  | "document_pending"
  | "documents_complets"
  | "payment_pending"
  | "complete";
export type DocumentType = "cni" | "photo" | "asr" | "rib";
export type DocumentStatus = "pending" | "uploaded" | "transferred_to_drive";
export type TenantMemberRole = "owner" | "member";

export type OcrExtractedData = {
  iban?: string;
  bic?: string;
  titulaire?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  [key: string]: string | undefined;
};
