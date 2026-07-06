import { Lock } from "lucide-react";
import { InscriptionForm } from "@/components/inscription/InscriptionForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Stepper";
import { TrustBox } from "@/components/ui/TrustBox";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type InscriptionPageProps = {
  params: Promise<{ tenant: string }>;
};

const STEPPER_STEPS = [
  {
    number: 1,
    title: "Inscription en ligne",
    description: "Renseignez vos informations pour ouvrir votre dossier.",
  },
  {
    number: 2,
    title: "Dépôt de vos pièces",
    description:
      "Déposez vos justificatifs via le lien sécurisé reçu par email.",
  },
  {
    number: 3,
    title: "Validation par le secrétariat",
    description:
      "L'équipe de l'auto-école vérifie votre dossier et vous accompagne.",
  },
] as const;

const TRUST_ITEMS = [
  "Chiffrement de bout en bout pour vos échanges",
  "Hébergement des données en France",
];

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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-12 w-auto object-contain"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              {tenant.name}
            </p>
            <p className="text-sm text-neutral">Inscription en ligne</p>
          </div>
        </div>
        <Badge variant="neutral" className="items-center gap-1.5 px-3 py-1.5">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Espace sécurisé
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0">
          <InscriptionForm
            formulas={(formulas ?? []).map((f) => ({ id: f.id, name: f.label }))}
            tenantId={tenant.id}
            tenantSlug={tenant.slug}
          />
        </div>

        <aside className="space-y-6">
          <Card className="p-6">
            <Stepper steps={[...STEPPER_STEPS]} />
          </Card>
          <TrustBox
            title="Vos documents sont protégés"
            items={TRUST_ITEMS}
          />
        </aside>
      </div>
    </div>
  );
}
