mkdir -p lib/actions
cat > lib/actions/send-manual-reminder.ts << 'EOF'
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateActiveMagicLinkUrl } from "@/lib/relances/magic-link";
import { sendReminderEmail } from "@/lib/relances/send-reminder";

type ManualReminderResult = { success: true } | { error: string };

const ELIGIBLE_STATUSES = new Set(["document_pending", "en_attente"]);

export async function sendManualReminder(
  studentId: string,
  tenantId: string,
  tenantSlug: string
): Promise<ManualReminderResult> {
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

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[sendManualReminder] Client service role indisponible:", err);
    return { error: "Configuration serveur incomplète" };
  }

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("id, slug, name, email_expediteur")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return { error: "Auto-école introuvable" };
  }

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, status, email, prenom, nom")
    .eq("id", studentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (studentError || !student) {
    return { error: "Élève introuvable" };
  }

  if (!student.status || !ELIGIBLE_STATUSES.has(student.status)) {
    return {
      error:
        "Relance disponible uniquement pour un dossier en attente de documents.",
    };
  }

  if (!student.email?.trim()) {
    return { error: "Cet élève n'a pas d'email renseigné." };
  }

  const magicLinkUrl = await getOrCreateActiveMagicLinkUrl(admin, tenant, student);
  if (!magicLinkUrl) {
    return { error: "Impossible de générer le lien de relance." };
  }

  const sendResult = await sendReminderEmail(
    tenant,
    { email: student.email, prenom: student.prenom },
    magicLinkUrl
  );

  if (!sendResult.success) {
    return { error: "L'envoi de l'email a échoué." };
  }

  const { error: insertError } = await admin.from("reminders").insert({
    tenant_id: tenantId,
    student_id: studentId,
    sent_at: new Date().toISOString(),
    type: "manual",
  });

  if (insertError) {
    console.error("[sendManualReminder] Insert reminder:", insertError.message);
    return { error: "Relance envoyée, mais non tracée — vérifie le tableau." };
  }

  revalidatePath(`/tenant/${tenantSlug}/eleves/${studentId}`);
  revalidatePath(`/tenant/${tenantSlug}/eleves`);
  return { success: true };
}
