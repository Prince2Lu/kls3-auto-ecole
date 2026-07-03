"use server";

import { createClient } from "@supabase/supabase-js";
import { getResend } from "@/lib/email/resend";
import {
  magicLinkEmail,
  notificationNouvelleInscription,
} from "@/lib/email/templates";
import { buildDossierUrl } from "@/lib/inscription/helpers";
import type { Database } from "@/lib/types/database";
import type { InscriptionFormData } from "@/lib/types/inscription";

type InscriptionResult = { success: true } | { error: string };

function isValidDateOfBirth(value: string): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return false;

  const minBirthDate = new Date(today);
  minBirthDate.setFullYear(today.getFullYear() - 12);
  if (date > minBirthDate) return false;

  return true;
}

type TenantRow = {
  id: string;
  name: string;
  notification_email: string | null;
  email_expediteur?: string | null;
};

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      `Variables manquantes: url=${Boolean(url)}, serviceRoleKey=${Boolean(serviceRoleKey)}`
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function inscrireEleve(
  formData: InscriptionFormData,
  tenantId: string,
  tenantSlug: string
): Promise<InscriptionResult> {
  const nom = formData.nom?.trim();
  const prenom = formData.prenom?.trim();
  const email = formData.email?.trim().toLowerCase();
  const dateOfBirth = formData.date_of_birth?.trim();
  const formulaId = formData.formula_id?.trim() || null;

  if (!nom || !prenom || !email) {
    return { error: "Nom, prénom et email sont requis." };
  }

  if (!isValidDateOfBirth(dateOfBirth ?? "")) {
    return { error: "Merci de renseigner une date de naissance valide." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Adresse email invalide." };
  }

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch (err) {
    console.error("[inscrireEleve] Client service role indisponible:", err);
    return { error: "Configuration serveur incomplète." };
  }

  // Lecture tenant via service role (table tenants protégée par RLS)
  let tenant: TenantRow | null = null;

  const { data: tenantById, error: tenantByIdError } = await admin
    .from("tenants")
    .select("id, name, notification_email, email_expediteur")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantByIdError) {
    console.error("[inscrireEleve] Lecture tenant par id échouée:", {
      tenantId,
      tenantSlug,
      code: tenantByIdError.code,
      message: tenantByIdError.message,
      details: tenantByIdError.details,
      hint: tenantByIdError.hint,
    });

    // Colonne email_expediteur absente si migration 0008 non appliquée
    const { data: tenantFallback, error: tenantFallbackError } = await admin
      .from("tenants")
      .select("id, name, notification_email")
      .eq("id", tenantId)
      .maybeSingle();

    if (tenantFallbackError || !tenantFallback) {
      console.error("[inscrireEleve] Repli lecture tenant par id échoué:", {
        tenantId,
        code: tenantFallbackError?.code,
        message: tenantFallbackError?.message,
      });
    } else {
      tenant = tenantFallback;
    }
  } else {
    tenant = tenantById;
  }

  if (!tenant) {
    const { data: tenantBySlug, error: tenantBySlugError } = await admin
      .from("tenants")
      .select("id, name, notification_email, email_expediteur")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (tenantBySlugError || !tenantBySlug) {
      console.error("[inscrireEleve] Lecture tenant par slug échouée:", {
        tenantSlug,
        code: tenantBySlugError?.code,
        message: tenantBySlugError?.message,
        details: tenantBySlugError?.details,
      });
      return { error: "Auto-école introuvable." };
    }

    tenant = tenantBySlug;
  }

  const resolvedTenantId = tenant.id;

  let formulaLabel = "Non précisée";

  if (formulaId) {
    const { data: formula, error: formulaError } = await admin
      .from("formulas")
      .select("id, label")
      .eq("id", formulaId)
      .eq("tenant_id", resolvedTenantId)
      .maybeSingle();

    if (formulaError || !formula) {
      console.error("[inscrireEleve] Formule invalide:", {
        formulaId,
        tenantId: resolvedTenantId,
        code: formulaError?.code,
        message: formulaError?.message,
      });
      return { error: "Formule invalide." };
    }

    formulaLabel = formula.label;
  }

  const { data: student, error: studentError } = await admin
    .from("students")
    .insert({
      tenant_id: resolvedTenantId,
      nom,
      prenom,
      email,
      date_of_birth: dateOfBirth,
      formula_id: formulaId,
      status: "en_attente",
    })
    .select("id")
    .single();

  if (studentError || !student) {
    console.error("[inscrireEleve] INSERT student échoué:", {
      tenantId: resolvedTenantId,
      email,
      code: studentError?.code,
      message: studentError?.message,
      details: studentError?.details,
      hint: studentError?.hint,
    });
    return { error: studentError?.message ?? "Impossible de créer le dossier." };
  }

  const { data: magicLink, error: linkError } = await admin
    .from("magic_links")
    .insert({
      tenant_id: resolvedTenantId,
      student_id: student.id,
    })
    .select("token")
    .single();

  if (linkError || !magicLink) {
    console.error("[inscrireEleve] INSERT magic_link échoué:", {
      tenantId: resolvedTenantId,
      studentId: student.id,
      code: linkError?.code,
      message: linkError?.message,
      details: linkError?.details,
      hint: linkError?.hint,
    });
    return {
      error: linkError?.message ?? "Impossible de générer le lien d'accès.",
    };
  }

  const dossierUrl = buildDossierUrl(tenantSlug, magicLink.token);

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "RESEND_API_KEY absente — inscription enregistrée sans envoi d'email"
    );
    return { success: true };
  }

  const resend = getResend();
  if (!resend) {
    console.warn(
      "Client Resend indisponible — inscription enregistrée sans envoi d'email"
    );
    return { success: true };
  }

  const from = tenant.email_expediteur
    ? `${tenant.name} <${tenant.email_expediteur}>`
    : "KLS3 Auto-École <onboarding@resend.dev>";

  const studentMail = magicLinkEmail(prenom, dossierUrl);

  const { error: studentMailError } = await resend.emails.send({
    from,
    to: email,
    subject: studentMail.subject,
    html: studentMail.html,
  });

  if (studentMailError) {
    console.error("Échec envoi magic link:", studentMailError.message);
  }

  if (tenant.notification_email) {
    const notification = notificationNouvelleInscription({
      nom,
      prenom,
      email,
      formule: formulaLabel,
      tenantName: tenant.name,
    });

    const { error: notifyError } = await resend.emails.send({
      from,
      to: tenant.notification_email,
      subject: notification.subject,
      html: notification.html,
    });

    if (notifyError) {
      console.error(
        "Échec notification auto-école (inscription conservée):",
        notifyError.message
      );
    }
  }

  return { success: true };
}
