import { NotificationEmailForm } from "@/components/parametres/NotificationEmailForm";
import { resolveTenantBySlug, resolveTenantById } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

type ParametresPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function ParametresPage({ params }: ParametresPageProps) {
  const { tenant: slug } = await params;
  const branding = await resolveTenantBySlug(slug);

  if (!branding) {
    notFound();
  }

  const tenant = await resolveTenantById(branding.id);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Paramètres</h1>
      <div className="space-y-6">
        <section className="rounded-md border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Notifications
          </h2>
          <NotificationEmailForm
            tenantId={tenant.id}
            initialEmail={tenant.notification_email}
          />
        </section>
        <section className="rounded-md border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Identité visuelle
          </h2>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Couleur principale</dt>
              <dd className="flex items-center gap-2">
                <span
                  className="inline-block h-5 w-5 rounded"
                  style={{
                    backgroundColor: tenant.primary_color ?? "#4B7BF5",
                  }}
                />
                {tenant.primary_color ?? "#4B7BF5"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Logo</dt>
              <dd>{tenant.logo_url ?? "Non configuré"}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-md border border-zinc-200 bg-white p-6">
          <h2 className="mb-2 font-medium text-zinc-800">Formules</h2>
          <p className="text-sm text-zinc-500">
            Gestion des formules — à implémenter
          </p>
        </section>
        <section className="rounded-md border border-zinc-200 bg-white p-6">
          <h2 className="mb-2 font-medium text-zinc-800">Google Drive</h2>
          <p className="text-sm text-zinc-500">
            {tenant.google_drive_folder_id
              ? `Dossier connecté : ${tenant.google_drive_folder_id}`
              : "Non connecté — configurez OAuth Drive"}
          </p>
        </section>
      </div>
    </div>
  );
}
