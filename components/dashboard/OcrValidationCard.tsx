"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

type OcrValidationCardProps = {
  extractionId: string;
  documentType: string;
  extractedData: Record<string, string>;
  ibanChecksumValid: boolean | null;
  validatedAt: string | null;
};

export function OcrValidationCard({
  extractionId,
  documentType,
  extractedData,
  ibanChecksumValid,
  validatedAt,
}: OcrValidationCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (validatedAt) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="font-medium text-emerald-800">
          {documentType.toUpperCase()} — validé le{" "}
          {new Date(validatedAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
    );
  }

  async function handleValidate(approved: boolean) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ocr/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractionId, approved }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Validation échouée");
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-md border-2 border-amber-400 bg-amber-50/60 p-5 ring-1 ring-amber-200">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Action requise — validation humaine
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-zinc-900">
              Extraction {documentType.toUpperCase()}
            </h3>
          </div>
        </div>
        {ibanChecksumValid !== null && (
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
              ibanChecksumValid
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            IBAN {ibanChecksumValid ? "valide" : "invalide"}
          </span>
        )}
      </div>

      <dl className="mb-4 divide-y divide-amber-200/80 rounded-md border border-amber-200/80 bg-white text-sm">
        {Object.entries(extractedData).map(([key, value]) => (
          <div key={key} className="flex gap-3 px-3 py-2">
            <dt className="w-28 shrink-0 text-zinc-500">{key}</dt>
            <dd className="font-mono text-zinc-900">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {ibanChecksumValid === false && (
        <p className="mb-3 text-sm font-medium text-red-700">
          Le checksum IBAN est invalide — vérifiez manuellement avant validation.
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleValidate(true)}
          className="rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--tenant-primary)" }}
        >
          {isSubmitting ? "Validation…" : "Valider l'extraction"}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleValidate(false)}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Rejeter
        </button>
      </div>
    </div>
  );
}
