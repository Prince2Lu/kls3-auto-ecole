import { OcrValidationCard } from "@/components/dashboard/OcrValidationCard";
import { ValidateDossierButton } from "@/components/dashboard/ValidateDossierButton";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { formatDateOnly } from "@/lib/utils/date";
import {
  STUDENT_STATUS_LABELS,
  STUDENT_STATUS_BADGE_CONFIG,
} from "@/lib/constants/student-status";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ManualReminderButton } from "@/components/dashboard/ManualReminderButton";
import type { OcrExtractionStatus } from "@/lib/types/ocr";
import type { BadgeVariant } from "@/components/ui/Badge";

type StudentDetailPageProps = {
  params: Promise<{ tenant: string; studentId: string }>;
};

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  uploaded: "Reçu",
  recu: "Reçu",
  perime: "Périmé",
  transferred_to_drive: "Transféré Drive",
};

const DOC_STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "warning",
  uploaded: "success",
  recu: "success",
  perime: "danger",
  transferred_to_drive: "success",
};

export default async function StudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const { tenant: slug, studentId } = await params;
  const tenant = await resolveTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!student) {
    notFound();
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("*, ocr_extractions(*)")
    .eq("student_id", studentId);

  const statusKey = student.status ?? "document_pending";
  const statusConfig =
    STUDENT_STATUS_BADGE_CONFIG[statusKey] ?? ({ variant: "neutral" } as const);
  const StatusIcon = statusConfig.icon;

  let validatorName: string | null = null;
  if (student.validated_by) {
    const { data: name } = await supabase.rpc("get_auth_user_display_name", {
      p_user_id: student.validated_by,
    });
    validatorName = name ?? null;
  }

  const ocrExtractions = (documents ?? []).flatMap((doc) =>
    (doc.ocr_extractions ?? []).map((extraction) => ({
      ...extraction,
      documentType: doc.type as "cni" | "rib" | "cni_representant",
    }))
  );

  const needsAttentionOcr = ocrExtractions.filter(
    (e) => e.status !== "validated"
  );
  const validatedOcr = ocrExtractions.filter((e) => e.status === "validated");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/eleves"
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">
              {student.prenom} {student.nom}
            </h1>
            <p className="mt-1 text-sm text-neutral">
              Inscrit le{" "}
              {student.created_at
                ? new Date(student.created_at).toLocaleDateString("fr-FR")
                : "—"}
              {student.date_of_birth
                ? ` · Né(e) le ${formatDateOnly(student.date_of_birth)}`
                : ""}
            </p>
            {student.status === "complete" && student.validated_at && (
              <p className="mt-2 text-sm text-success">
                Validé le{" "}
                {new Date(student.validated_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {validatorName ? ` par ${validatorName}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <Badge variant={statusConfig.variant}>
              {StatusIcon && <StatusIcon className="h-3 w-3" aria-hidden />}
              {STUDENT_STATUS_LABELS[statusKey] ?? statusKey}
            </Badge>
            <ValidateDossierButton
              studentId={studentId}
              tenantId={tenant.id}
              tenantSlug={slug}
              prenom={student.prenom}
              nom={student.nom}
              status={student.status}
            />
            <ManualReminderButton
              studentId={studentId}
              tenantId={tenant.id}
              tenantSlug={slug}
              status={student.status}
            />
          </div>
        </div>
      </div>

      {needsAttentionOcr.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-warning">
            Suivi OCR
          </h2>
          {needsAttentionOcr.map((extraction) => (
            <OcrValidationCard
              key={extraction.id}
              extractionId={extraction.id}
              tenantId={tenant.id}
              tenantSlug={slug}
              studentId={studentId}
              documentType={extraction.documentType}
              status={extraction.status as OcrExtractionStatus}
              extractedData={extraction.extracted_data as Record<string, string>}
              ibanChecksumValid={extraction.iban_checksum_valid}
              mrzChecksumValid={extraction.mrz_checksum_valid}
              attemptCount={extraction.attempt_count}
              entryMethod={extraction.entry_method as "ocr" | "manual"}
              validatedAt={extraction.validated_at}
              declaredDateNaissance={student.date_of_birth}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral">
          Documents
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                  Statut
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                  Reçu le
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {(documents ?? []).map((doc) => {
                const docStatus = doc.status ?? "pending";
                const extraction = doc.ocr_extractions?.[0];

                let docVariant: BadgeVariant =
                  DOC_STATUS_VARIANT[docStatus] ?? "neutral";
                let docLabel = DOC_STATUS_LABELS[docStatus] ?? docStatus;

                if (extraction && extraction.status !== "validated") {
                  if (extraction.status === "pending") {
                    docVariant = "warning";
                    docLabel = "À valider";
                  } else if (extraction.status === "failed_student_action") {
                    docVariant = "warning";
                    docLabel = "Lecture échouée";
                  } else if (extraction.status === "failed_secretary_entry") {
                    docVariant = "danger";
                    docLabel = "Saisie manuelle requise";
                  }
                }

                return (
                  <tr key={doc.id} className="hover:bg-surface-muted">
                    <td className="px-4 py-2.5 font-medium uppercase text-ink">
                      {doc.type}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={docVariant}>{docLabel}</Badge>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-neutral">
                      {doc.uploaded_at
                        ? new Date(doc.uploaded_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {(documents ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-neutral">
                    Aucun document
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {validatedOcr.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral">
            Validations OCR terminées
          </h2>
          <div className="space-y-3">
            {validatedOcr.map((extraction) => (
              <OcrValidationCard
                key={extraction.id}
                extractionId={extraction.id}
                tenantId={tenant.id}
                tenantSlug={slug}
                studentId={studentId}
                documentType={extraction.documentType}
                status={extraction.status as OcrExtractionStatus}
                extractedData={extraction.extracted_data as Record<string, string>}
                ibanChecksumValid={extraction.iban_checksum_valid}
                mrzChecksumValid={extraction.mrz_checksum_valid}
                attemptCount={extraction.attempt_count}
                entryMethod={extraction.entry_method as "ocr" | "manual"}
                validatedAt={extraction.validated_at}
                declaredDateNaissance={student.date_of_birth}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
