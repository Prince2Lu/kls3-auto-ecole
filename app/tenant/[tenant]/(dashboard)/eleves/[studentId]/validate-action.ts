"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureTenantRootFolder,
  ensureStudentDriveFolders,
  uploadToDrive,
} from "@/lib/drive/upload";
import type { DocumentCategory } from "@/lib/constants/documents";

type ValidateResult = { success: true } | { error: string };

type DocumentToTransfer = {
  id: string;
  type: string;
  category: DocumentCategory;
  file_path: string;
  original_filename: string | null;
  mime_type: string | null;
};

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

  // Vérifie que le dossier est bien au bon statut AVANT de commencer le
  // transfert Drive (évite de transférer des documents pour un dossier
  // déjà validé ou pas encore prêt, et donne un message clair immédiat
  // plutôt qu'après un transfert pour rien).
  const { data: student } = await supabase
    .from("students")
    .select("id, nom, prenom, status")
    .eq("id", studentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!student) {
    return { error: "Élève introuvable." };
  }

  if (student.status !== "documents_complets") {
    return {
      error:
        "Ce dossier n'est plus au statut « à valider » — il a peut-être déjà été validé.",
    };
  }

  // Transfert Drive synchrone AVANT de marquer le dossier comme validé :
  // décision actée le 6 juillet 2026 — la secrétaire doit voir un échec
  // explicite plutôt qu'un dossier marqué "complet" sans que les pièces
  // aient réellement atteint le Drive du client.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("google_drive_folder_id, drive_refresh_token_encrypted")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant?.drive_refresh_token_encrypted) {
    return {
      error:
        "Connectez Google Drive dans Paramètres avant de valider un dossier.",
    };
  }

  const admin = createAdminClient();

  const { data: documents } = await admin
    .from("documents")
    .select("id, type, category, file_path, original_filename, mime_type")
    .eq("student_id", studentId)
    .eq("status", "recu")
    .not("file_path", "is", null);

  const documentsToTransfer = (documents ?? []).filter(
    (doc): doc is DocumentToTransfer => Boolean(doc.file_path)
  );

  try {
    const rootFolderId = await ensureTenantRootFolder(
      tenant.drive_refresh_token_encrypted,
      tenant.google_drive_folder_id
    );

    // Persistance immédiate dès la résolution du dossier racine, avant
    // même de commencer les transferts élève : si un dossier a dû être
    // créé automatiquement, on ne veut pas le recréer à chaque validation
    // suivante (findOrCreateFolder le retrouverait par nom, mais autant
    // fixer l'ID définitivement dès qu'on l'a).
    if (!tenant.google_drive_folder_id) {
      await admin
        .from("tenants")
        .update({ google_drive_folder_id: rootFolderId })
        .eq("id", tenantId);
    }

    const studentDisplayName = `${student.nom} ${student.prenom}`.trim();
    const folders = await ensureStudentDriveFolders(
      tenant.drive_refresh_token_encrypted,
      rootFolderId,
      studentDisplayName
    );

    for (const doc of documentsToTransfer) {
      const { data: fileBlob, error: downloadError } = await admin.storage
        .from("documents-eleves")
        .download(doc.file_path);

      if (downloadError || !fileBlob) {
        throw new Error(
          `Téléchargement du document "${doc.type}" échoué : ${downloadError?.message ?? "fichier introuvable"}`
        );
      }

      const targetFolderId =
        doc.category === "facturation_kls3"
          ? folders.facturationFolderId
          : folders.antsFolderId;

      const uploadResult = await uploadToDrive(
        tenant.drive_refresh_token_encrypted,
        targetFolderId,
        doc.original_filename ?? `${doc.type}.pdf`,
        fileBlob,
        doc.mime_type ?? "application/octet-stream"
      );

      await admin
        .from("documents")
        .update({
          drive_file_id: uploadResult.fileId,
          drive_transferred_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
    }

    await admin
      .from("students")
      .update({
        drive_student_folder_id: folders.studentFolderId,
        drive_ants_folder_id: folders.antsFolderId,
        drive_facturation_folder_id: folders.facturationFolderId,
      })
      .eq("id", studentId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfert Drive échoué";
    console.error("[validateDossier] Échec transfert Drive:", message);
    return {
      error: `Le transfert vers Google Drive a échoué : ${message}. Le dossier n'a pas été validé — réessayez.`,
    };
  }

  // Le statut n'est marqué "complete" qu'une fois le transfert Drive
  // entièrement réussi pour tous les documents.
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

  // TODO US9 : déclencher l'email de confirmation élève ici une fois le template prêt

  revalidatePath(`/tenant/${tenantSlug}/eleves/${studentId}`);
  revalidatePath(`/tenant/${tenantSlug}/eleves`);
  return { success: true };
}
