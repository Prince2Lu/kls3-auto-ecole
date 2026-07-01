import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { extractionId, approved } = body as {
    extractionId?: string;
    approved?: boolean;
  };

  if (!extractionId || approved === undefined) {
    return NextResponse.json(
      { error: "extractionId et approved sont requis" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (!approved) {
    await supabase.from("ocr_extractions").delete().eq("id", extractionId);
    return NextResponse.json({ status: "rejected" });
  }

  const { data: extraction } = await supabase
    .from("ocr_extractions")
    .select("iban_checksum_valid, extracted_data")
    .eq("id", extractionId)
    .single();

  if (!extraction) {
    return NextResponse.json({ error: "Extraction introuvable" }, { status: 404 });
  }

  const extractedData = extraction.extracted_data as Record<string, string>;
  if (extractedData.iban && extraction.iban_checksum_valid === false) {
    return NextResponse.json(
      { error: "IBAN invalide — validation humaine requise avec checksum valide" },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from("ocr_extractions")
    .update({
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    })
    .eq("id", extractionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "validated" });
}
