import { StudentsTable } from "@/components/dashboard/StudentsTable";
import { computeRequiredDocumentTypes } from "@/lib/constants/documents";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

type ElevesPageProps = {
  params: Promise<{ tenant: string }>;
};

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
      status,
      date_of_birth,
      created_at,
      last_activity_at,
      formulas ( label, documents_requis ),
      documents ( status )
    `
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  const rows = (students ?? []).map((student) => {
    const required = computeRequiredDocumentTypes(
      student.date_of_birth ?? null
    ).length;
    const uploaded = (student.documents ?? []).filter(
      (doc) => doc.status !== "pending"
    ).length;

    return {
      id: student.id,
      nom: student.nom,
      prenom: student.prenom,
      status: student.status,
      last_activity_at: student.last_activity_at,
      formulaLabel: student.formulas?.label ?? null,
      exigences: `${uploaded}/${required}`,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Élèves</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {rows.length} dossier{rows.length !== 1 ? "s" : ""} au total
        </p>
      </div>
      <StudentsTable students={rows} />
    </div>
  );
}
