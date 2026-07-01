import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = await createClient();

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: pendingStudents } = await supabase
    .from("students")
    .select("id, tenant_id, magic_link_sent_at")
    .eq("status", "document_pending")
    .lt("last_activity_at", threeDaysAgo.toISOString());

  let sent = 0;

  for (const student of pendingStudents ?? []) {
    const { count } = await supabase
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("student_id", student.id);

    await supabase.from("reminders").insert({
      student_id: student.id,
      reminder_number: (count ?? 0) + 1,
    });

    // TODO: envoyer email de relance
    sent++;
  }

  return NextResponse.json({ remindersSent: sent });
}
