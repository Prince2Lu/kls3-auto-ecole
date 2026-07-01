import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDossierUrl } from "@/lib/inscription/helpers";
import type { Database } from "@/lib/types/database";

type AdminClient = SupabaseClient<Database>;

type TenantRef = {
  id: string;
  slug: string;
};

type StudentRef = {
  id: string;
};

export async function getOrCreateActiveMagicLinkUrl(
  admin: AdminClient,
  tenant: TenantRef,
  student: StudentRef
): Promise<string | null> {
  const nowIso = new Date().toISOString();

  const { data: existing } = await admin
    .from("magic_links")
    .select("token")
    .eq("student_id", student.id)
    .eq("tenant_id", tenant.id)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    return buildDossierUrl(tenant.slug, existing.token);
  }

  const { data: newLink, error } = await admin
    .from("magic_links")
    .insert({
      tenant_id: tenant.id,
      student_id: student.id,
    })
    .select("token")
    .single();

  if (error || !newLink?.token) {
    console.error("[getOrCreateActiveMagicLinkUrl] Échec création lien:", {
      studentId: student.id,
      message: error?.message,
    });
    return null;
  }

  return buildDossierUrl(tenant.slug, newLink.token);
}
