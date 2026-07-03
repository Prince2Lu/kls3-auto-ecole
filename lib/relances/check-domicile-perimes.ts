import type { SupabaseClient } from "@supabase/supabase-js";
import { computeRequiredDocumentTypes } from "@/lib/constants/documents";
import { computeStudentStatus } from "@/lib/documents/compute-student-status";
import {
  isDatePerime,
  JUSTIFICATIF_DOMICILE_VALIDITY_MONTHS,
} from "@/lib/documents/date-validity";
import { getOrCreateActiveMagicLinkUrl } from "@/lib/relances/magic-link";
import { sendDocumentPerimeEmail } from "@/lib/relances/send-document-perime";
import type { Database } from "@/lib/types/database";

type AdminClient = SupabaseClient<Database>;

type TenantRef = {
  id: string;
  slug: string;
  name: string;
  email_expediteur: string | null;
};

type StudentRow = {
  id: string;
  status: string | null;
  email: string | null;
  prenom: string;
  nom: string;
  date_of_birth: string | null;
};

export async function checkAndNotifyDomicilePerimes(
  admin: AdminClient,
  tenant: TenantRef,
  now: Date = new Date()
): Promise<number> {
  const { data: documents, error } = await admin
    .from("documents")
    .select(
      `
      id,
      student_id,
      date_document,
      students!inner (
        id,
        status,
        email,
        prenom,
        nom,
        date_of_birth
      )
    `
    )
    .eq("tenant_id", tenant.id)
    .eq("type", "domicile")
    .eq("status", "recu")
    .not("date_document", "is", null);

  if (error) {
    console.error(
      "[checkAndNotifyDomicilePerimes] Lecture documents:",
      error.message
    );
    return 0;
  }

  let processed = 0;

  for (const doc of documents ?? []) {
    if (!doc.date_document) {
      continue;
    }

    if (
      !isDatePerime(
        doc.date_document,
        JUSTIFICATIF_DOMICILE_VALIDITY_MONTHS,
        now
      )
    ) {
      continue;
    }

    const student = doc.students as StudentRow;

    const { error: updateDocError } = await admin
      .from("documents")
      .update({ status: "perime" })
      .eq("id", doc.id);

    if (updateDocError) {
      console.error(
        "[checkAndNotifyDomicilePerimes] Update document:",
        updateDocError.message
      );
      continue;
    }

    const { data: allDocuments } = await admin
      .from("documents")
      .select("type, status, file_path")
      .eq("student_id", doc.student_id);

    const requiredTypes = computeRequiredDocumentTypes(
      student.date_of_birth ?? null
    );
    const newStatus = computeStudentStatus(
      student.status,
      allDocuments ?? [],
      requiredTypes
    );

    if (newStatus !== student.status) {
      const { error: statusError } = await admin
        .from("students")
        .update({ status: newStatus })
        .eq("id", student.id);

      if (statusError) {
        console.error(
          "[checkAndNotifyDomicilePerimes] Update student status:",
          statusError.message
        );
      }
    }

    if (student.email) {
      const magicLinkUrl = await getOrCreateActiveMagicLinkUrl(admin, tenant, {
        id: student.id,
      });

      if (magicLinkUrl) {
        const sendResult = await sendDocumentPerimeEmail(
          tenant,
          { email: student.email, prenom: student.prenom },
          magicLinkUrl
        );

        if (sendResult.success) {
          const { error: insertError } = await admin.from("reminders").insert({
            tenant_id: tenant.id,
            student_id: student.id,
            sent_at: now.toISOString(),
            type: "domicile_perime",
          });

          if (insertError) {
            console.error(
              "[checkAndNotifyDomicilePerimes] Insert reminder:",
              insertError.message
            );
          }
        }
      }
    }

    processed++;
  }

  return processed;
}
