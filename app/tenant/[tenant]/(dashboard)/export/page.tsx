import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

type ExportPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function ExportPage({ params }: ExportPageProps) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900">
        Export CSV
      </h1>
      <p className="mb-6 text-zinc-600">
        Exportez les dossiers élèves complets au format CSV.
      </p>
      <form action={`/api/export-csv?tenant=${tenant.id}`} method="GET">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Télécharger l&apos;export CSV
        </button>
      </form>
    </div>
  );
}
