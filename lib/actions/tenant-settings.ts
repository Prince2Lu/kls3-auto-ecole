"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateNotificationEmail(
  tenantId: string,
  email: string
) {
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

  const normalized = email.trim().toLowerCase();
  if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Email invalide" };
  }

  const { error } = await supabase
    .from("tenants")
    .update({ notification_email: normalized || null })
    .eq("id", tenantId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/parametres");
  return { success: true };
}
