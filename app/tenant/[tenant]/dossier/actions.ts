"use server";

import { computeStudentStatus } from "@/lib/documents/compute-student-status";
import { revalidatePath } from "next/cache";
import { getDocumentConfig, computeRequiredDocumentTypes } from "@/lib/constants/documents";
import { validateMagicLinkForDossier } from "@/lib/dossier/magic-link";
import { createAdminClient } from "@/lib/supabase/admin";
import { touchLastActivity } from "@/lib/students/touch-last-activity";
import { processDocumentOcr } from "@/lib/ocr/process-document";
import type { DocumentType } from "@/lib/types/documents";

type UploadResult = { success: true } | { error: string };

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadDocument(
  formData: FormData
): Promise<UploadResult> {
  const token = String(formData.get("token") ?? "").trim();
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "").trim() as DocumentType;
  const file = formData.get("file");

  if (!token || !tenantSlug) {
    return { error: "Session invalide. Rechargez la page via votre lien magique." };
  }

  const config = getDocumentConfig(documentType);
  if (!config) {
    return { error: "Type de document invalide." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Aucun fichier sélectionné." };
  }

  if (file.size > config.maxBytes) {
    return {
      error: `Fichier trop volumineux (max ${Math.round(config.maxBytes / (1024 * 1024))} Mo).`,
    };
  }

  if (!config.acceptMimeTypes.includes(file.type)) {
    return { error: "Format de fichier non accepté." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Configuration serveur incomplète." };
  }

  const { data: tenant, error: tenantError } = await admin
    .from("public_tenant_branding")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (tenantError || !tenant?.id) {
    console.error("[uploadDocument] Tenant introuvable:", tenantSlug, tenantError);
    return { error: "Auto-école introuvable." };
  }

  const magicLink = await validateMagicLinkForDossier(admin, token, tenant.id);
  if (!magicLink) {
    console.error("[uploadDocument] Magic link invalide ou expiré:", { tenantSlug });
    return {
      error: "Lien expiré ou invalide. Contactez votre auto-école pour un nouveau lien.",
    };
  }

  const timestamp = Date.now();
  const safeName = sanitizeFilename(file.name);
  const storagePath = `${magicLink.tenant_id}/${magicLink.student_id}/${documentType}/${timestamp}-${safeName}`;

  const { data: existing } = await admin
    .from("documents")
    .select("id, file_path")
    .eq("student_id", magicLink.student_id)
    .eq("type", documentType)
    .maybeSingle();

  if (existing?.file_path) {
    const { error: removeError } = await admin.storage
      .from("documents-eleves")
      .remove([existing.file_path]);

    if (removeError) {
      console.error(
        "[uploadDocument] Suppression ancien fichier:",
        removeError.message
      );
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageError } = await admin.storage
    .from("documents-eleves")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (storageError) {
    console.error("[uploadDocument] Upload Storage échoué:", {
      code: storageError.name,
      message: storageError.message,
    });
    return { error: "Impossible d'enregistrer le fichier. Réessayez." };
  }

  const now = new Date().toISOString();
  const documentRow = {
    tenant_id: magicLink.tenant_id,
    student_id: magicLink.student_id,
    type: documentType,
    status: "recu",
    file_path: storagePath,
    original_filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_at: now,
  };

  const { data: upsertedDocument, error: upsertError } = await admin
    .from("documents")
    .upsert(documentRow, { onConflict: "student_id,type" })
    .select("id")
    .single();

  if (upsertError) {
    console.error("[uploadDocument] Upsert documents échoué:", {
      code: upsertError.code,
      message: upsertError.message,
      details: upsertError.details,
    });
    await admin.storage.from("documents-eleves").remove([storagePath]);
    return { error: "Impossible d'enregistrer le document en base." };
  }

  await touchLastActivity(admin, magicLink.student_id);

  // OCR (US15/US16) : uniquement pour les documents qui portent des données
  // à extraire (CNI, RIB) — jamais bloquant pour l'élève, une panne Vision
  // API ne doit jamais faire échouer l'upload.
  if (documentType === "cni" || documentType === "rib") {
    try {
      await processDocumentOcr(admin, {
        documentId: upsertedDocument.id,
        tenantId: magicLink.tenant_id,
        documentType,
        buffer,
        mimeType: file.type,
      });
    } catch (ocrError) {
      console.error("[uploadDocument] Traitement OCR échoué:", {
        documentId: upsertedDocument.id,
        error: ocrError instanceof Error ? ocrError.message : ocrError,
      });
    }
  }

  const { data: allDocuments } = await admin
    .from("documents")
    .select("type, status, file_path")
    .eq("student_id", magicLink.student_id);

  const { data: studentRow } = await admin
    .from("students")
    .select("status, date_of_birth")
    .eq("id", magicLink.student_id)
    .maybeSingle();

  const requiredTypes = computeRequiredDocumentTypes(
    studentRow?.date_of_birth ?? null
  );

  const newStatus = computeStudentStatus(
    studentRow?.status ?? null,
    allDocuments ?? [],
    requiredTypes
  );

  if (newStatus !== studentRow?.status) {
    const { error: statusError } = await admin
      .from("students")
      .update({ status: newStatus })
      .eq("id", magicLink.student_id);

    if (statusError) {
      console.error("[uploadDocument] Mise à jour statut élève échouée:", {
        studentId: magicLink.student_id,
        newStatus,
        code: statusError.code,
        message: statusError.message,
      });
    }
  }

  revalidatePath(`/tenant/${tenantSlug}/dossier`);
  revalidatePath(`/tenant/${tenantSlug}/eleves`);
  revalidatePath(`/tenant/${tenantSlug}/eleves/${magicLink.student_id}`);
  return { success: true };
}
