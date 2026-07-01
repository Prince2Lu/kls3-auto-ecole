import { OcrValidationCard } from "@/components/dashboard/OcrValidationCard";
import { ValidateDossierButton } from "@/components/dashboard/ValidateDossierButton";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type StudentDetailPageProps = {
  params: Promise<{ tenant: string; studentId: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  document_pending: "Documents en attente",
  documents_complets: "À valider",
  payment_pending: "Paiement en attente",
  complete: "Complet",
};

const STATUS_BADGE: Record<string, string> = {
  en_attente: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  document_pending: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  documents_complets: "bg-violet-100 text-violet-800 ring-1 ring-violet-200",
  payment_pending: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  complete: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
};

const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  uploaded: "Reçu",
  recu: "Reçu",
  transferred_to_drive: "Transféré Drive",
};

const DOC_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  uploaded: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  recu: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  transferred_to_drive: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
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
  const statusBadge =
    STATUS_BADGE[statusKey] ?? "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";

  let validatorName: string | null = null;
  if (student.validated_by) {
    const { data: name } = await supabase.rpc("get_auth_user_display_name", {
      p_user_id: student.validated_by,
    });
    validatorName = name ?? null;
  }

  const pendingOcr = (documents ?? []).flatMap((doc) =>
    (doc.ocr_extractions ?? [])
      .filter((e) => !e.validated_at)
      .map((extraction) => ({ ...extraction, documentType: doc.type }))
  );

  const validatedOcr = (documents ?? []).flatMap((doc) =>
    (doc.ocr_extractions ?? [])
      .filter((e) => e.validated_at)
      .map((extraction) => ({ ...extraction, documentType: doc.type }))
  );

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/eleves"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              {student.prenom} {student.nom}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Inscrit le{" "}
              {student.created_at
                ? new Date(student.created_at).toLocaleDateString("fr-FR")
                : "—"}
            </p>
            {student.status === "complete" && student.validated_at && (
              <p className="mt-2 text-sm text-emerald-700">
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
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${statusBadge}`}
            >
              {STATUS_LABELS[statusKey] ?? statusKey}
            </span>
            <ValidateDossierButton
              studentId={studentId}
              tenantId={tenant.id}
              tenantSlug={slug}
              prenom={student.prenom}
              nom={student.nom}
              status={student.status}
            />
          </div>
        </div>
      </div>

      {pendingOcr.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Validations OCR en attente
          </h2>
          {pendingOcr.map((extraction) => (
            <OcrValidationCard
              key={extraction.id}
              extractionId={extraction.id}
              documentType={extraction.documentType}
              extractedData={
                extraction.extracted_data as Record<string, string>
              }
              ibanChecksumValid={extraction.iban_checksum_valid}
              validatedAt={extraction.validated_at}
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Documents
        </h2>
        <div className="overflow-hidden rounded-md border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Statut
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Reçu le
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {(documents ?? []).map((doc) => {
                const docStatus = doc.status ?? "pending";
                const docBadge =
                  DOC_STATUS_BADGE[docStatus] ??
                  "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
                return (
                  <tr key={doc.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5 font-medium uppercase text-zinc-900">
                      {doc.type}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${docBadge}`}
                      >
                        {DOC_STATUS_LABELS[docStatus] ?? docStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-zinc-600">
                      {doc.uploaded_at
                        ? new Date(doc.uploaded_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {(documents ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Validations OCR terminées
          </h2>
          <div className="space-y-3">
            {validatedOcr.map((extraction) => (
              <OcrValidationCard
                key={extraction.id}
                extractionId={extraction.id}
                documentType={extraction.documentType}
                extractedData={
                  extraction.extracted_data as Record<string, string>
                }
                ibanChecksumValid={extraction.iban_checksum_valid}
                validatedAt={extraction.validated_at}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
