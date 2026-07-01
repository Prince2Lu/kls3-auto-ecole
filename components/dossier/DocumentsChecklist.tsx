import { REQUIRED_DOCUMENT_TYPES } from "@/lib/constants/documents";
import {
  isDocumentReceived,
  type DocumentType,
  type StudentDocument,
} from "@/lib/types/documents";

type DocumentsChecklistProps = {
  documents: StudentDocument[];
};

export function DocumentsChecklist({ documents }: DocumentsChecklistProps) {
  const byType = new Map<DocumentType, StudentDocument>();
  for (const doc of documents) {
    byType.set(doc.type, doc);
  }

  const receivedCount = REQUIRED_DOCUMENT_TYPES.filter((config) =>
    isDocumentReceived(byType.get(config.type))
  ).length;

  const missing = REQUIRED_DOCUMENT_TYPES.filter(
    (config) => !isDocumentReceived(byType.get(config.type))
  );

  const total = REQUIRED_DOCUMENT_TYPES.length;
  const complete = receivedCount === total;

  return (
    <div
      className={`rounded-md border px-4 py-4 ${
        complete
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          complete ? "text-emerald-900" : "text-amber-900"
        }`}
      >
        {receivedCount}/{total} documents envoyés
      </p>
      {missing.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-amber-800">
            Documents encore manquants :
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-amber-900">
            {missing.map((config) => (
              <li key={config.type}>{config.label}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-emerald-800">
          Tous vos documents ont bien été reçus.
        </p>
      )}
    </div>
  );
}
