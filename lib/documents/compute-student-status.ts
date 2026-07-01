import { REQUIRED_DOCUMENT_TYPES } from "@/lib/constants/documents";
import type { DocumentType } from "@/lib/types/documents";

export type StudentWorkflowStatus =
  | "en_attente"
  | "document_pending"
  | "documents_complets"
  | "payment_pending"
  | "complete";

export type DocumentForStatus = {
  type: string;
  status: string | null;
  file_path?: string | null;
};

const IMMUTABLE_STATUSES = new Set<string>(["complete", "payment_pending"]);

function isRequiredDocumentReceived(
  documents: DocumentForStatus[],
  type: DocumentType
): boolean {
  const doc = documents.find((d) => d.type === type);
  return doc?.status === "recu" && Boolean(doc.file_path);
}

export function computeStudentStatus(
  currentStatus: string | null,
  documents: DocumentForStatus[],
  requiredTypes: readonly { type: DocumentType }[] = REQUIRED_DOCUMENT_TYPES
): string {
  const status = currentStatus ?? "document_pending";

  if (IMMUTABLE_STATUSES.has(status)) {
    return status;
  }

  const allReceived = requiredTypes.every((req) =>
    isRequiredDocumentReceived(documents, req.type)
  );

  if (allReceived) {
    return "documents_complets";
  }

  if (status === "documents_complets") {
    return "document_pending";
  }

  return status;
}
