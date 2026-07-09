"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import {
  confirmOcrExtraction,
  submitManualOcrEntry,
} from "@/app/tenant/[tenant]/(dashboard)/eleves/[studentId]/ocr-actions";
import { Badge } from "@/components/ui/Badge";
import type { OcrExtractionStatus } from "@/lib/types/ocr";
import { formatDateOnly } from "@/lib/utils/date";

type OcrValidationCardProps = {
  extractionId: string;
  tenantId: string;
  tenantSlug: string;
  studentId: string;
  documentType: "cni" | "rib";
  status: OcrExtractionStatus;
  extractedData: Record<string, string>;
  ibanChecksumValid: boolean | null;
  mrzChecksumValid: boolean | null;
  attemptCount: number;
  entryMethod: "ocr" | "manual";
  validatedAt: string | null;
  declaredDateNaissance?: string | null;
};

const DOCUMENT_LABELS: Record<"cni" | "rib", string> = {
  cni: "CNI",
  rib: "RIB",
};

export function OcrValidationCard({
  extractionId,
  tenantId,
  tenantSlug,
  studentId,
  documentType,
  status,
  extractedData,
  ibanChecksumValid,
  mrzChecksumValid,
  attemptCount,
  entryMethod,
  validatedAt,
  declaredDateNaissance,
}: OcrValidationCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState<Record<string, string>>(
    documentType === "rib"
      ? {
          iban: extractedData.iban ?? "",
          bic: extractedData.bic ?? "",
          titulaire: extractedData.titulaire ?? "",
        }
      : {
          nom: extractedData.nom ?? "",
          prenom: extractedData.prenom ?? "",
          date_naissance: extractedData.date_naissance ?? "",
        }
  );

  const label = DOCUMENT_LABELS[documentType];

  if (status === "validated") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-success bg-success-subtle px-4 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p className="font-medium text-success">
          {label} — validé{" "}
          {validatedAt
            ? `le ${new Date(validatedAt).toLocaleDateString("fr-FR")}`
            : ""}
          {entryMethod === "manual" ? " (saisie manuelle secrétaire)" : ""}
        </p>
      </div>
    );
  }

  if (status === "failed_student_action") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-border bg-surface-muted px-4 py-3 text-sm">
        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-neutral" />
        <div>
          <p className="font-medium text-ink">
            {label} — lecture automatique échouée
          </p>
          <p className="mt-0.5 text-neutral">
            L&apos;élève doit retéléverser ce document (tentative {attemptCount}).
            Aucune action secrétaire requise pour l&apos;instant.
          </p>
        </div>
      </div>
    );
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await confirmOcrExtraction(
        extractionId,
        tenantId,
        tenantSlug,
        studentId
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleManualSubmit() {
    setError(null);
    startTransition(async () => {
      const entry =
        documentType === "rib"
          ? {
              iban: manualEntry.iban,
              bic: manualEntry.bic,
              titulaire: manualEntry.titulaire,
            }
          : {
              nom: manualEntry.nom,
              prenom: manualEntry.prenom,
              date_naissance: manualEntry.date_naissance,
            };

      const result = await submitManualOcrEntry(
        extractionId,
        tenantId,
        tenantSlug,
        studentId,
        documentType,
        entry
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (status === "failed_secretary_entry") {
    const fields =
      documentType === "rib"
        ? [
            { key: "iban", label: "IBAN" },
            { key: "bic", label: "BIC" },
            { key: "titulaire", label: "Titulaire du compte" },
          ]
        : [
            { key: "nom", label: "Nom" },
            { key: "prenom", label: "Prénom" },
            { key: "date_naissance", label: "Date de naissance (AAAA-MM-JJ)" },
          ];

    return (
      <div className="rounded-md border-2 border-danger bg-danger-subtle p-5">
        <div className="mb-4 flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-danger">
              Saisie manuelle requise — {attemptCount} échecs OCR
            </p>
            <h3 className="mt-0.5 text-base font-semibold font-display text-ink">
              {label} — lecture automatique impossible
            </h3>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <p className="text-xs text-neutral">
            Champs pré-remplis à partir de la dernière tentative de lecture
            automatique — à vérifier avant d&apos;enregistrer.
          </p>
          {fields.map(({ key, label: fieldLabel }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-neutral">
                {fieldLabel}
              </label>
              <input
                type="text"
                value={manualEntry[key] ?? ""}
                onChange={(e) =>
                  setManualEntry((prev) => ({ ...prev, [key]: e.target.value }))
                }
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleManualSubmit}
          className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          {isPending ? "Enregistrement…" : "Enregistrer et valider"}
        </button>
      </div>
    );
  }

  // status === "pending" : checksum déterministe déjà confirmé
  // (IBAN mod-97 ou MRZ), simple confirmation en un clic.
  const checksumValid =
    documentType === "rib" ? ibanChecksumValid : mrzChecksumValid;
  const checksumLabel = documentType === "rib" ? "IBAN" : "MRZ";

  const extractedDateNaissance = extractedData.date_naissance?.trim();
  const declaredDate = declaredDateNaissance?.trim();
  const datesDivergent =
    Boolean(extractedDateNaissance) &&
    Boolean(declaredDate) &&
    extractedDateNaissance !== declaredDate;

  function formatDeclaredDate(value: string | null | undefined) {
    if (!value?.trim()) return "non renseignée";
    return formatDateOnly(value) || value;
  }

  function formatExtractedDisplayValue(key: string, value: string) {
    if (!value) return "—";
    if (key === "date_naissance") {
      return formatDateOnly(value) || value;
    }
    return value;
  }

  return (
    <div className="rounded-md border-2 border-warning bg-warning-subtle p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">
              Action requise — validation humaine
            </p>
            <h3 className="mt-0.5 text-base font-semibold font-display text-ink">
              Extraction {label}
            </h3>
          </div>
        </div>
        {checksumValid !== null && (
          <Badge variant={checksumValid ? "success" : "danger"}>
            {checksumLabel} {checksumValid ? "valide" : "invalide"}
          </Badge>
        )}
      </div>

      <dl className="mb-4 divide-y divide-border rounded-md border border-border bg-white text-sm">
        {Object.entries(extractedData).map(([key, value]) => (
          <div key={key} className="flex gap-3 px-3 py-2">
            <dt className="w-28 shrink-0 text-neutral">{key}</dt>
            <dd className="font-mono text-ink">
              {formatExtractedDisplayValue(key, value)}
            </dd>
          </div>
        ))}
      </dl>

      {documentType === "cni" && (
        <p
          className={`mb-4 text-sm ${
            datesDivergent ? "font-medium text-danger" : "text-neutral"
          }`}
        >
          Date déclarée à l&apos;inscription :{" "}
          {formatDeclaredDate(declaredDateNaissance)}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={handleConfirm}
        className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {isPending ? "Validation…" : "Confirmer l'extraction"}
      </button>
    </div>
  );
}
