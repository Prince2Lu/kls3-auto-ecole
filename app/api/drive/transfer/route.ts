import { NextResponse } from "next/server";
import { uploadToDrive } from "@/lib/drive/upload";

export async function POST(request: Request) {
  const body = await request.json();
  const { tenantId, fileName, fileBase64, mimeType } = body as {
    tenantId?: string;
    fileName?: string;
    fileBase64?: string;
    mimeType?: string;
  };

  if (!tenantId || !fileName || !fileBase64) {
    return NextResponse.json(
      { error: "tenantId, fileName et fileBase64 sont requis" },
      { status: 400 }
    );
  }

  // TODO: récupérer access token + folder_id du tenant
  const accessToken = "";
  const folderId = "";

  try {
    const buffer = Buffer.from(fileBase64, "base64");
    const blob = new Blob([buffer], { type: mimeType ?? "application/octet-stream" });
    const result = await uploadToDrive(accessToken, folderId, fileName, blob);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfert échoué";
    return NextResponse.json({ error: message }, { status: 501 });
  }
}
