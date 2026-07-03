"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import {
  confirmOcrExtraction,
  submitManualOcrEntry,
} from "@/app/tenant/[tenant]/(dashboard)/eleves/[studentId]/ocr-actions";
import type { OcrExtractionStatus } from "@/lib/types/ocr";

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
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="font-medium text-emerald-800">
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
      <div className="flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
        <div>
          <p className="font-medium text-zinc-700">
            {label} — lecture automatique échouée
          </p>
          <p className="mt-0.5 text-zinc-500">
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
      <div className="rounded-md border-2 border-red-300 bg-red-50/60 p-5 ring-1 ring-red-200">
        <div className="mb-4 flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Saisie manuelle requise — {attemptCount} échecs OCR
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-zinc-900">
              {label} — lecture automatique impossible
            </h3>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <p className="text-xs text-zinc-500">
            Champs pré-remplis à partir de la dernière tentative de lecture
            automatique — à vérifier avant d&apos;enregistrer.
          </p>
          {fields.map(({ key, label: fieldLabel }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-zinc-600">
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
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleManualSubmit}
          className="rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--tenant-primary)" }}
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
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("fr-FR");
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
              Extraction {label}
            </h3>
          </div>
        </div>
        {checksumValid !== null && (
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${
              checksumValid
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {checksumLabel} {checksumValid ? "valide" : "invalide"}
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

      {documentType === "cni" && (
        <p
          className={`mb-4 text-sm ${
            datesDivergent ? "font-medium text-red-700" : "text-zinc-600"
          }`}
        >
          Date déclarée à l&apos;inscription :{" "}
          {formatDeclaredDate(declaredDateNaissance)}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={handleConfirm}
        className="rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--tenant-primary)" }}
      >
        {isPending ? "Validation…" : "Confirmer l'extraction"}
      </button>
    </div>
  );
}
