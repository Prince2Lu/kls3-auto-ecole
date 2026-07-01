import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type ValidatedMagicLink = {
  id: string;
  student_id: string;
  tenant_id: string;
  expires_at: string;
};

type AdminClient = SupabaseClient<Database>;

export async function validateMagicLinkForDossier(
  admin: AdminClient,
  token: string,
  tenantId: string
): Promise<ValidatedMagicLink | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const { data: link, error } = await admin
    .from("magic_links")
    .select("id, student_id, tenant_id, expires_at, used_at")
    .eq("token", trimmed)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error || !link) return null;
  if (new Date(link.expires_at) < new Date()) return null;

  if (!link.used_at) {
    await admin
      .from("magic_links")
      .update({ used_at: new Date().toISOString() })
      .eq("id", link.id)
      .is("used_at", null);
  }

  return {
    id: link.id,
    student_id: link.student_id,
    tenant_id: link.tenant_id,
    expires_at: link.expires_at,
  };
}
