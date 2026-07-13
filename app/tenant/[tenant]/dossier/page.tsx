import { DocumentUploadCard } from "@/components/dossier/DocumentUploadCard";
import { DocumentsChecklist } from "@/components/dossier/DocumentsChecklist";
import { RepresentantLegalCard } from "@/components/dossier/RepresentantLegalCard";
import { computeRequiredDocumentTypes } from "@/lib/constants/documents";
import { validateMagicLinkForDossier } from "@/lib/dossier/magic-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAge } from "@/lib/students/age";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { toStudentDocument } from "@/lib/types/documents";
import { Stepper } from "@/components/ui/Stepper";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

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
      "id, tenant_id, student_id, type, status, category, file_path, original_filename, mime_type, size_bytes, uploaded_at, date_document"
    )
    .eq("student_id", magicLink.student_id);

  const { data: representant } = await admin
    .from("representants_legaux")
    .select("nom, prenom, email")
    .eq("student_id", magicLink.student_id)
    .maybeSingle();

  const documents = (documentRows ?? [])
    .map((row) => toStudentDocument(row))
    .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

  const documentsByType = new Map(documents.map((doc) => [doc.type, doc]));
  const requiredTypes = computeRequiredDocumentTypes(student?.date_of_birth ?? null);
  const isMinor = student?.date_of_birth
    ? calculateAge(student.date_of_birth) < 18
    : false;

  return (
    <div className="mx-auto max-w-lg space-y-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          Bonjour {student?.prenom ?? ""} {student?.nom ?? ""}
        </h1>
        <div className="mt-4">
          <Stepper
            orientation="horizontal"
            currentStep={2}
            steps={[
              { number: 1, title: "Inscription" },
              { number: 2, title: "Dépôt des pièces" },
              { number: 3, title: "Validation" },
            ]}
          />
        </div>
        <p className="mt-2 text-sm text-neutral">
          Déposez vos pièces justificatives ci-dessous pour compléter votre
          dossier.
        </p>
      </div>

      {isMinor ? (
        <RepresentantLegalCard
          token={token.trim()}
          tenantSlug={slug}
          initialNom={representant?.nom ?? ""}
          initialPrenom={representant?.prenom ?? ""}
          initialEmail={representant?.email ?? ""}
        />
      ) : null}

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

      <p className="flex items-center gap-2 text-xs text-neutral">
        <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
        Documents transmis directement à votre auto-école, jamais stockés
        durablement chez KLS3.
      </p>
    </div>
  );
}
