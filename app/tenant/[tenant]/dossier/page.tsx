import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

type DossierPageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ token?: string }>;
};

type MagicLinkRow = {
  id: string;
  expires_at: string;
  used_at: string | null;
  students: { nom: string; prenom: string } | null;
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

  const { data: link, error } = await admin
    .from("magic_links")
    .select("id, expires_at, used_at, students(nom, prenom)")
    .eq("token", token.trim())
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (error || !link) {
    return (
      <ErrorMessage
        title="Lien invalide"
        message="Ce lien d'accès est invalide ou a expiré. Contactez votre auto-école pour recevoir un nouveau lien."
      />
    );
  }

  const row = link as MagicLinkRow;

  if (new Date(row.expires_at) < new Date()) {
    return (
      <ErrorMessage
        title="Lien expiré"
        message="Ce lien a expiré. Contactez votre auto-école pour recevoir un nouveau lien."
      />
    );
  }

  if (row.used_at) {
    return (
      <ErrorMessage
        title="Lien déjà utilisé"
        message="Ce lien a déjà été utilisé. Contactez votre auto-école pour recevoir un nouveau lien."
      />
    );
  }

  const { data: updated, error: updateError } = await admin
    .from("magic_links")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    return (
      <ErrorMessage
        title="Lien déjà utilisé"
        message="Ce lien a déjà été utilisé. Contactez votre auto-école pour recevoir un nouveau lien."
      />
    );
  }

  const student = row.students;

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <h1 className="text-xl font-semibold text-zinc-900">
        Bonjour {student?.prenom ?? ""} {student?.nom ?? ""}
      </h1>
      <p className="mt-6 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
        Votre dossier — pièces à fournir (à venir)
      </p>
    </div>
  );
}
