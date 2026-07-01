import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tenantId = searchParams.get("state");

  if (!code || !tenantId) {
    return NextResponse.json(
      { error: "code et state requis" },
      { status: 400 }
    );
  }

  // TODO: échanger le code contre tokens, stocker refresh token par tenant
  return NextResponse.json({
    status: "oauth_callback_received",
    tenantId,
  });
}
