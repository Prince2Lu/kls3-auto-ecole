"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ValidateResult = { success: true } | { error: string };

export async function validateDossier(
  studentId: string,
  tenantId: string,
  tenantSlug: string
): Promise<ValidateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié" };
  }

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "Accès refusé" };
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("students")
    .update({
      status: "complete",
      validated_at: nowIso,
      validated_by: user.id,
      last_activity_at: nowIso,
    })
    .eq("id", studentId)
    .eq("tenant_id", tenantId)
    .eq("status", "documents_complets")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[validateDossier] Erreur update:", error.message);
    return { error: error.message };
  }

  if (!data) {
    return {
      error:
        "Ce dossier n'est plus au statut « à valider » — il a peut-être déjà été validé.",
    };
  }

  // TODO US18 : déclencher le transfert Google Drive ici une fois l'OAuth en place
  // TODO US9 : déclencher l'email de confirmation élève ici une fois le template prêt

  revalidatePath(`/tenant/${tenantSlug}/eleves/${studentId}`);
  revalidatePath(`/tenant/${tenantSlug}/eleves`);
  return { success: true };
}
