"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { validateIbanChecksum } from "@/lib/ocr/checksums";
import { isDateNaissanceCoherente } from "@/lib/ocr/coherence";
import type { Database } from "@/lib/types/database";
import type { ManualCniEntry, ManualRibEntry } from "@/lib/types/ocr";

type ActionResult = { success: true } | { error: string };

type MembershipResult =
  | { ok: true; supabase: SupabaseClient<Database>; userId: string }
  | { ok: false; error: string };

async function requireMembership(tenantId: string): Promise<MembershipResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Non authentifié" };
  }

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Accès refusé" };
  }

  return { ok: true, supabase, userId: user.id };
}

/**
 * US15 — confirmation en un clic d'une extraction OCR déjà validée par
 * checksum déterministe (IBAN mod-97 ou MRZ). Re-vérifie le checksum
 * côté serveur avant de marquer "validated" — jamais de confiance aveugle
 * dans le statut affiché côté client sur une donnée bancaire/identité.
 */
export async function confirmOcrExtraction(
  extractionId: string,
  tenantId: string,
  tenantSlug: string,
  studentId: string
): Promise<ActionResult> {
  const auth = await requireMembership(tenantId);
  if (!auth.ok) return { error: auth.error };
  const { supabase, userId } = auth;

  const { data: extraction } = await supabase
    .from("ocr_extractions")
    .select(
      "status, document_type, iban_checksum_valid, mrz_checksum_valid, extracted_data"
    )
    .eq("id", extractionId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!extraction) {
    return { error: "Extraction introuvable." };
  }

  if (extraction.status !== "pending") {
    return {
      error:
        "Cette extraction n'est plus en attente de confirmation — la page a peut-être besoin d'être rafraîchie.",
    };
  }

  const checksumOk =
    extraction.document_type === "rib"
      ? extraction.iban_checksum_valid === true
      : extraction.mrz_checksum_valid === true;

  if (!checksumOk) {
    return {
      error:
        "Checksum invalide — cette extraction ne peut pas être confirmée automatiquement. Utilisez la saisie manuelle.",
    };
  }

  if (extraction.document_type === "cni") {
    const { data: student } = await supabase
      .from("students")
      .select("date_of_birth")
      .eq("id", studentId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const extractedData = extraction.extracted_data as Record<
      string,
      string
    > | null;
    const extractedDate = extractedData?.date_naissance;

    if (
      !isDateNaissanceCoherente(extractedDate, student?.date_of_birth ?? null)
    ) {
      return {
        error:
          "Date de naissance déclarée par l'élève différente de celle lue sur la CNI — vérification manuelle requise.",
      };
    }
  }

  const { data, error } = await supabase
    .from("ocr_extractions")
    .update({
      status: "validated",
      validated_by: userId,
      validated_at: new Date().toISOString(),
    })
    .eq("id", extractionId)
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[confirmOcrExtraction] Erreur update:", error.message);
    return { error: error.message };
  }

  if (!data) {
    return { error: "Cette extraction a déjà été traitée entre-temps." };
  }

  revalidatePath(`/tenant/${tenantSlug}/eleves/${studentId}`);
  return { success: true };
}

/**
 * US16 — saisie manuelle secrétaire, en dernier recours uniquement (statut
 * `failed_secretary_entry`, atteint après plusieurs échecs OCR). Le
 * checksum IBAN est revalidé même en saisie manuelle : une donnée bancaire
 * ne doit jamais être acceptée sans passer ce contrôle, humaine ou pas.
 */
export async function submitManualOcrEntry(
  extractionId: string,
  tenantId: string,
  tenantSlug: string,
  studentId: string,
  documentType: "cni" | "rib",
  entry: ManualRibEntry | ManualCniEntry
): Promise<ActionResult> {
  const auth = await requireMembership(tenantId);
  if (!auth.ok) return { error: auth.error };
  const { supabase, userId } = auth;

  const { data: extraction } = await supabase
    .from("ocr_extractions")
    .select("status, document_type")
    .eq("id", extractionId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!extraction) {
    return { error: "Extraction introuvable." };
  }

  if (extraction.status !== "failed_secretary_entry") {
    return {
      error:
        "La saisie manuelle n'est disponible qu'après plusieurs échecs OCR pour ce document.",
    };
  }

  let extractedData: Record<string, string>;
  let ibanChecksumValid: boolean | null = null;

  if (documentType === "rib") {
    const { iban, bic, titulaire } = entry as ManualRibEntry;
    if (!iban?.trim() || !bic?.trim() || !titulaire?.trim()) {
      return { error: "IBAN, BIC et titulaire sont requis." };
    }
    const normalizedIban = iban.replace(/\s/g, "").toUpperCase();
    ibanChecksumValid = validateIbanChecksum(normalizedIban);
    if (!ibanChecksumValid) {
      return {
        error: "IBAN invalide (échec du checksum) — vérifiez la saisie.",
      };
    }
    extractedData = { iban: normalizedIban, bic: bic.trim(), titulaire: titulaire.trim() };
  } else {
    const { nom, prenom, date_naissance } = entry as ManualCniEntry;
    if (!nom?.trim() || !prenom?.trim() || !date_naissance?.trim()) {
      return { error: "Nom, prénom et date de naissance sont requis." };
    }
    extractedData = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      date_naissance: date_naissance.trim(),
    };
  }

  const { data, error } = await supabase
    .from("ocr_extractions")
    .update({
      extracted_data: extractedData,
      iban_checksum_valid: ibanChecksumValid,
      mrz_checksum_valid: null,
      status: "validated",
      entry_method: "manual",
      validated_by: userId,
      validated_at: new Date().toISOString(),
    })
    .eq("id", extractionId)
    .eq("tenant_id", tenantId)
    .eq("status", "failed_secretary_entry")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[submitManualOcrEntry] Erreur update:", error.message);
    return { error: error.message };
  }

  if (!data) {
    return { error: "Cette extraction a déjà été traitée entre-temps." };
  }

  revalidatePath(`/tenant/${tenantSlug}/eleves/${studentId}`);
  return { success: true };
}
