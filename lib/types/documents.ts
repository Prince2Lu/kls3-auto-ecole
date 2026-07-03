export type DocumentType = "cni" | "photo" | "assr" | "rib" | "jdc" | "domicile";

export type DocumentStatus = "manquant" | "recu" | "perime";

export interface StudentDocument {
  id: string;
  tenant_id: string;
  student_id: string;
  type: DocumentType;
  status: DocumentStatus;
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

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    student_id: row.student_id,
    type,
    status,
    file_path: row.file_path,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    uploaded_at: row.uploaded_at,
    date_document: row.date_document ?? null,
  };
}
