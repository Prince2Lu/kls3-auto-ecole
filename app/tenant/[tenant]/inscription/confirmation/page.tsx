import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

type ConfirmationPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function InscriptionConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12 text-center">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-6 py-10">
        <h1 className="text-lg font-semibold text-emerald-900">
          Inscription enregistrée
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-emerald-800">
          Votre dossier a bien été créé. Vous allez recevoir un email d&apos;ici
          quelques minutes pour compléter vos pièces justificatives.
        </p>
      </div>
    </div>
  );
}
