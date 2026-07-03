import { documentPerimeEmail } from "@/lib/email/templates";
import { getResend } from "@/lib/email/resend";
import type { SendReminderResult } from "@/lib/relances/send-reminder";

export type TenantForDocumentPerime = {
  name: string;
  email_expediteur: string | null;
};

export type StudentForDocumentPerime = {
  email: string;
  prenom: string;
};

export async function sendDocumentPerimeEmail(
  tenant: TenantForDocumentPerime,
  student: StudentForDocumentPerime,
  magicLinkUrl: string
): Promise<SendReminderResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[sendDocumentPerimeEmail] RESEND_API_KEY absente — email non envoyé"
    );
    return { success: false, reason: "no_resend" };
  }

  const resend = getResend();
  if (!resend) {
    return { success: false, reason: "no_resend" };
  }

  const from = tenant.email_expediteur
    ? `${tenant.name} <${tenant.email_expediteur}>`
    : "KLS3 Auto-École <onboarding@resend.dev>";

  const mail = documentPerimeEmail(student.prenom, magicLinkUrl, tenant.name);

  const { error } = await resend.emails.send({
    from,
    to: student.email,
    subject: mail.subject,
    html: mail.html,
  });

  if (error) {
    console.error("[sendDocumentPerimeEmail] Échec envoi:", error.message);
    return { success: false, reason: "send_failed", message: error.message };
  }

  return { success: true };
}
