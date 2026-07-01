import { NextResponse } from "next/server";
import { computeStudentsToRemind } from "@/lib/relances/compute-students-to-remind";
import { getOrCreateActiveMagicLinkUrl } from "@/lib/relances/magic-link";
import { sendReminderEmail } from "@/lib/relances/send-reminder";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[cron/relances] Client service role indisponible:", err);
    return NextResponse.json(
      { error: "Configuration serveur incomplète" },
      { status: 500 }
    );
  }

  const { data: tenants, error: tenantsError } = await admin
    .from("tenants")
    .select("id, slug, name, email_expediteur, relance_delai_jours");

  if (tenantsError) {
    console.error("[cron/relances] Lecture tenants:", tenantsError.message);
    return NextResponse.json({ error: tenantsError.message }, { status: 500 });
  }

  let totalSent = 0;
  const now = new Date();

  for (const tenant of tenants ?? []) {
    const delai = tenant.relance_delai_jours ?? 3;

    const { data: students, error: studentsError } = await admin
      .from("students")
      .select("id, status, created_at, email, prenom, nom")
      .eq("tenant_id", tenant.id)
      .in("status", ["document_pending", "en_attente"]);

    if (studentsError) {
      console.error(
        `[cron/relances] Lecture students tenant ${tenant.id}:`,
        studentsError.message
      );
      continue;
    }

    if (!students?.length) {
      continue;
    }

    const studentIds = students.map((s) => s.id);

    const { data: reminders, error: remindersError } = await admin
      .from("reminders")
      .select("student_id, sent_at")
      .in("student_id", studentIds)
      .order("sent_at", { ascending: false });

    if (remindersError) {
      console.error(
        `[cron/relances] Lecture reminders tenant ${tenant.id}:`,
        remindersError.message
      );
      continue;
    }

    const lastReminderByStudent = new Map<string, string>();
    for (const reminder of reminders ?? []) {
      if (!reminder.sent_at || lastReminderByStudent.has(reminder.student_id)) {
        continue;
      }
      lastReminderByStudent.set(reminder.student_id, reminder.sent_at);
    }

    const toRemind = computeStudentsToRemind(
      students,
      lastReminderByStudent,
      delai,
      now
    );

    for (const student of toRemind) {
      if (!student.email) {
        continue;
      }

      const magicLinkUrl = await getOrCreateActiveMagicLinkUrl(
        admin,
        tenant,
        student
      );

      if (!magicLinkUrl) {
        continue;
      }

      const sendResult = await sendReminderEmail(
        tenant,
        { email: student.email, prenom: student.prenom },
        magicLinkUrl
      );

      if (!sendResult.success) {
        continue;
      }

      const { error: insertError } = await admin.from("reminders").insert({
        tenant_id: tenant.id,
        student_id: student.id,
        sent_at: now.toISOString(),
        type: "auto",
      });

      if (insertError) {
        console.error(
          `[cron/relances] Insert reminder student ${student.id}:`,
          insertError.message
        );
        continue;
      }

      totalSent++;
    }
  }

  return NextResponse.json({ success: true, totalSent });
}
