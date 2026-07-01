export interface InscriptionFormData {
  nom: string;
  prenom: string;
  email: string;
  formula_id: string;
}

export interface MagicLink {
  id: string;
  tenant_id: string;
  student_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export type StudentStatus =
  | "en_attente"
  | "docs_manquants"
  | "ocr_en_attente"
  | "ocr_echec_eleve"
  | "ocr_echec_secretaire"
  | "paiement_en_attente"
  | "complet"
  | "valide"
  | "refuse";
