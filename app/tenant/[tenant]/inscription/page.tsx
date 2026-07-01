import { InscriptionForm } from "@/components/inscription/InscriptionForm";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type InscriptionPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function InscriptionPage({ params }: InscriptionPageProps) {
  const { tenant: slug } = await params;

  const supabase = await createClient();
  const { data: tenant, error } = await supabase
    .from("public_tenant_branding")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !tenant?.id || !tenant.slug || !tenant.name) {
    notFound();
  }

  const { data: formulas } = await supabase
    .from("formulas")
    .select("id, label")
    .eq("tenant_id", tenant.id)
    .order("label");

  const primaryColor = tenant.primary_color ?? "#4B7BF5";

  return (
    <div
      className="mx-auto max-w-lg px-6 py-8"
      style={{ "--color-primary": primaryColor } as React.CSSProperties}
    >
      <div className="mb-6 text-center">
        {tenant.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.logo_url}
            alt={tenant.name}
            className="mx-auto mb-4 h-16 w-auto object-contain"
          />
        )}
        <h1 className="text-xl font-semibold text-zinc-900">Inscription</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Remplissez le formulaire pour démarrer votre dossier chez{" "}
          <span className="font-medium text-zinc-900">{tenant.name}</span>.
        </p>
      </div>
      <InscriptionForm
        formulas={(formulas ?? []).map((f) => ({ id: f.id, name: f.label }))}
        tenantId={tenant.id}
        tenantSlug={tenant.slug}
      />
    </div>
  );
}
