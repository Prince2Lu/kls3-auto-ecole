import { StudentsTable } from "@/components/dashboard/StudentsTable";
import {
  computeRequiredDocumentTypes,
  REQUIRED_DOCUMENT_TYPES,
} from "@/lib/constants/documents";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

type ElevesPageProps = {
  params: Promise<{ tenant: string }>;
};

export type DocumentDetailValue = "recu" | "manquant" | "non_applicable";

export default async function ElevesPage({ params }: ElevesPageProps) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select(
      `
      id,
      nom,
      prenom,
      email,
      status,
      date_of_birth,
      created_at,
      last_activity_at,
      formulas ( label, documents_requis ),
      documents ( type, status )
    `
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  const rows = (students ?? []).map((student) => {
    const requiredTypes = computeRequiredDocumentTypes(
      student.date_of_birth ?? null
    );
    const requiredTypeSet = new Set(requiredTypes.map((r) => r.type));
    const required = requiredTypes.length;
    const studentDocuments = student.documents ?? [];
    const uploaded = studentDocuments.filter(
      (doc) => doc.status === "recu"
    ).length;

    // Détail sur TOUS les types de documents existants (pas seulement
    // ceux requis pour cet élève) afin que le CSV ait des colonnes
    // stables et comparables d'un élève à l'autre. "non_applicable" pour
    // un type non requis pour ce profil (ex. ASSR pour un majeur) évite
    // de le confondre avec un vrai "manquant" à réclamer.
    const documentsDetail: Record<string, DocumentDetailValue> = {};
    for (const docType of REQUIRED_DOCUMENT_TYPES) {
      if (!requiredTypeSet.has(docType.type)) {
        documentsDetail[docType.type] = "non_applicable";
        continue;
      }
      const doc = studentDocuments.find((d) => d.type === docType.type);
      documentsDetail[docType.type] =
        doc?.status === "recu" ? "recu" : "manquant";
    }

    const manquants = requiredTypes
      .filter((req) => documentsDetail[req.type] === "manquant")
      .map((req) => req.label);

    return {
      id: student.id,
      nom: student.nom,
      prenom: student.prenom,
      email: student.email,
      dateOfBirth: student.date_of_birth,
      status: student.status,
      last_activity_at: student.last_activity_at,
      formulaLabel: student.formulas?.label ?? null,
      exigences: `${uploaded}/${required}`,
      documentsDetail,
      manquants,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">Élèves</h1>
        <p className="mt-1 text-sm text-neutral">
          {rows.length} dossier{rows.length !== 1 ? "s" : ""} au total
        </p>
      </div>
      <StudentsTable students={rows} />
    </div>
  );
}
