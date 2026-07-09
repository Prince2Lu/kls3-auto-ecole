import type { RequiredDocumentConfig } from "@/lib/constants/documents";
import {
  isDocumentReceived,
  type DocumentType,
  type StudentDocument,
} from "@/lib/types/documents";

type DocumentsChecklistProps = {
  documents: StudentDocument[];
  requiredTypes: readonly RequiredDocumentConfig[];
};

export function DocumentsChecklist({
  documents,
  requiredTypes,
}: DocumentsChecklistProps) {
  const byType = new Map<DocumentType, StudentDocument>();
  for (const doc of documents) {
    byType.set(doc.type, doc);
  }

  const receivedCount = requiredTypes.filter((config) =>
    isDocumentReceived(byType.get(config.type))
  ).length;

  const missing = requiredTypes.filter(
    (config) => !isDocumentReceived(byType.get(config.type))
  );

  const total = requiredTypes.length;
  const complete = receivedCount === total;
  const remainingCount = total - receivedCount;

  return (
    <div
      className={`rounded-md border px-4 py-4 ${
        complete ? "border-success bg-success-subtle" : "border-warning bg-warning-subtle"
      }`}
    >
      <div className="mb-1 flex items-baseline justify-between">
        <p className="font-display text-base font-bold text-ink">
          {receivedCount} sur {total} documents envoyés
        </p>
        <p className="text-xs text-neutral">
          {remainingCount === 0
            ? "Dossier complet"
            : `${remainingCount} document${
                remainingCount > 1 ? "s" : ""
              } restant${remainingCount > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-brand transition-all duration-300"
          style={{
            width: total === 0 ? "0%" : `${(receivedCount / total) * 100}%`,
          }}
        />
      </div>

      {missing.length > 0 ? (
        <div className="mt-0">
          <p className="text-xs font-medium text-warning">
            Documents encore manquants :
          </p>
          <ul className="mt-1 list-inside list-disc text-sm text-ink">
            {missing.map((config) => (
              <li key={config.type}>{config.label}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-success">Tous vos documents ont bien été reçus.</p>
      )}
    </div>
  );
}
