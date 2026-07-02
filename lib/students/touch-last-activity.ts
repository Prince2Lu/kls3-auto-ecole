import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export async function touchLastActivity(
  supabase: SupabaseClient<Database>,
  studentId: string
): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", studentId);

  if (error) {
    console.error(
      "[touchLastActivity] Échec mise à jour pour",
      studentId,
      error.message
    );
  }
}
