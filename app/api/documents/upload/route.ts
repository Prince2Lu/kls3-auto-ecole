import { NextResponse } from "next/server";
import { extractFromDocument } from "@/lib/ocr/extract";
import { createClient } from "@/lib/supabase/server";
import { touchLastActivity } from "@/lib/students/touch-last-activity";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const studentId = formData.get("studentId") as string | null;
  const documentType = formData.get("documentType") as "cni" | "rib" | null;

  if (!file || !studentId || !documentType) {
    return NextResponse.json(
      { error: "file, studentId et documentType sont requis" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: document, error: docError } = await supabase
    .from("documents")
    .insert({
      student_id: studentId,
      type: documentType,
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  await touchLastActivity(supabase, studentId);

  const ocrResult = await extractFromDocument(file, documentType);

  if (documentType === "rib" || documentType === "cni") {
    await supabase.from("ocr_extractions").insert({
      document_id: document.id,
      extracted_data: ocrResult.extractedData,
      iban_checksum_valid: ocrResult.ibanChecksumValid,
    });
  }

  // Pas de stockage serveur — transfert direct vers Drive client
  // TODO: appeler /api/drive/transfer avec le buffer en mémoire

  return NextResponse.json({
    documentId: document.id,
    ocr: ocrResult,
  });
}
