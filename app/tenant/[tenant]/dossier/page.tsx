import { DocumentUploadCard } from "@/components/dossier/DocumentUploadCard";
import { DocumentsChecklist } from "@/components/dossier/DocumentsChecklist";
import { computeRequiredDocumentTypes } from "@/lib/constants/documents";
import { validateMagicLinkForDossier } from "@/lib/dossier/magic-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { toStudentDocument } from "@/lib/types/documents";
import { notFound } from "next/navigation";

type DossierPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ token?: string }>;
};

function ErrorMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="rounded-md border border-red-200 bg-red-50 px-6 py-8 text-center">
        <h1 className="text-lg font-semibold text-red-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-red-800">{message}</p>
      </div>
    </div>
  );
}

export default async function DossierPage({
  params,
  searchParams,
}: DossierPageProps) {
  const { tenant: slug } = await params;
  const { token } = await searchParams;

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  if (!token?.trim()) {
    return (
      <ErrorMessage
        title="Lien invalide"
        message="Ce lien d'accès est invalide. Contactez votre auto-école pour recevoir un nouveau lien."
      />
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <ErrorMessage
        title="Service indisponible"
        message="Impossible de vérifier votre lien pour le moment. Réessayez plus tard ou contactez votre auto-école."
      />
    );
  }

  const magicLink = await validateMagicLinkForDossier(
    admin,
    token.trim(),
    tenant.id
  );

  if (!magicLink) {
    return (
      <ErrorMessage
        title="Lien invalide"
        message="Ce lien d'accès est invalide ou a expiré. Contactez votre auto-école pour recevoir un nouveau lien."
      />
    );
  }

  const { data: student } = await admin
    .from("students")
    .select("nom, prenom, date_of_birth")
    .eq("id", magicLink.student_id)
    .maybeSingle();

  const { data: documentRows } = await admin
    .from("documents")
    .select(
      "id, tenant_id, student_id, type, status, file_path, original_filename, mime_type, size_bytes, uploaded_at, date_document"
    )
    .eq("student_id", magicLink.student_id);

  const documents = (documentRows ?? [])
    .map((row) => toStudentDocument(row))
    .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

  const documentsByType = new Map(documents.map((doc) => [doc.type, doc]));
  const requiredTypes = computeRequiredDocumentTypes(student?.date_of_birth ?? null);

  return (
    <div className="mx-auto max-w-lg space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Bonjour {student?.prenom ?? ""} {student?.nom ?? ""}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Déposez vos pièces justificatives ci-dessous pour compléter votre
          dossier.
        </p>
      </div>

      <DocumentsChecklist documents={documents} requiredTypes={requiredTypes} />

      <div className="space-y-4">
        {requiredTypes.map((config) => (
          <DocumentUploadCard
            key={config.type}
            config={config}
            token={token.trim()}
            tenantSlug={slug}
            document={documentsByType.get(config.type)}
          />
        ))}
      </div>
    </div>
  );
}
