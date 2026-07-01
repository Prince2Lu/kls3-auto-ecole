import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenant");

  if (!tenantId) {
    return NextResponse.json({ error: "tenant requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: students } = await supabase
    .from("students")
    .select("nom, prenom, date_of_birth, status, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const headers = ["Nom", "Prénom", "Date de naissance", "Statut", "Inscrit le"];
  const rows = (students ?? []).map((s) => [
    s.nom,
    s.prenom,
    s.date_of_birth ?? "",
    s.status ?? "",
    s.created_at ? new Date(s.created_at).toISOString().split("T")[0] : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="export-eleves.csv"',
    },
  });
}
