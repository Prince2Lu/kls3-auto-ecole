export type DocumentType = "cni" | "photo" | "assr" | "rib" | "jdc" | "domicile";

export type DocumentStatus = "manquant" | "recu" | "perime";

export type DocumentCategory = "ants" | "facturation_kls3";

export interface StudentDocument {
  id: string;
  tenant_id: string;
  student_id: string;
  type: DocumentType;
  status: DocumentStatus;
  category: DocumentCategory;
  file_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
  date_document: string | null;
}

export function isDocumentReceived(doc: StudentDocument | undefined): boolean {
  if (!doc) return false;
  return doc.status === "recu" && Boolean(doc.file_path);
}

export function toStudentDocument(row: {
  id: string;
  tenant_id: string;
  student_id: string;
  type: string;
  status: string | null;
  category?: string | null;
  file_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_at: string | null;
  date_document?: string | null;
}): StudentDocument | null {
  const type = row.type as DocumentType;
  if (!["cni", "photo", "assr", "rib", "jdc", "domicile"].includes(type)) {
    return null;
  }

  const status: DocumentStatus =
    row.status === "recu" && row.file_path
      ? "recu"
      : row.status === "perime" && row.file_path
        ? "perime"
        : "manquant";

  // Repli défensif si category n'est pas encore peuplée en base pour une
  // ligne donnée (ne devrait pas arriver après la migration 0015 et son
  // backfill, mais évite un crash si jamais une ligne y échappe).
  const category: DocumentCategory =
    row.category === "facturation_kls3" ? "facturation_kls3" : "ants";

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    student_id: row.student_id,
    type,
    status,
    category,
    file_path: row.file_path,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    uploaded_at: row.uploaded_at,
    date_document: row.date_document ?? null,
  };
}