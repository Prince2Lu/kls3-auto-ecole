import { reminderEmail } from "@/lib/email/templates";
import { getResend } from "@/lib/email/resend";

export type TenantForReminder = {
  name: string;
  email_expediteur: string | null;
};

export type StudentForReminder = {
  email: string;
  prenom: string;
};

export type SendReminderResult =
  | { success: true }
  | { success: false; reason: "no_resend" | "send_failed"; message?: string };

export async function sendReminderEmail(
  tenant: TenantForReminder,
  student: StudentForReminder,
  magicLinkUrl: string
): Promise<SendReminderResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[sendReminderEmail] RESEND_API_KEY absente — relance non envoyée");
    return { success: false, reason: "no_resend" };
  }

  const resend = getResend();
  if (!resend) {
    return { success: false, reason: "no_resend" };
  }

  const from = tenant.email_expediteur
    ? `${tenant.name} <${tenant.email_expediteur}>`
    : "KLS3 Auto-École <onboarding@resend.dev>";

  const mail = reminderEmail(student.prenom, magicLinkUrl, tenant.name);

  const { error } = await resend.emails.send({
    from,
    to: student.email,
    subject: mail.subject,
    html: mail.html,
  });

  if (error) {
    console.error("[sendReminderEmail] Échec envoi:", error.message);
    return { success: false, reason: "send_failed", message: error.message };
  }

  return { success: true };
}
