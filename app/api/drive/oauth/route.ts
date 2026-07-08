import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOauthState } from "@/lib/drive/crypto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId requis" }, { status: 400 });
  }

  // Vérification auth + appartenance tenant : sans ça, n'importe qui
  // connaissant un tenantId pourrait initier un flux OAuth Drive pour ce
  // tenant (le state signé protège le callback, mais il faut aussi éviter
  // qu'un tiers déclenche le flux au départ).
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

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/drive/oauth/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
  // State signé (tenantId + timestamp + HMAC) plutôt que le tenantId nu :
  // sans signature, un attaquant pourrait forger un callback avec le
  // tenantId de son choix et faire connecter son propre Drive au compte
  // d'un autre client.
  authUrl.searchParams.set("state", signOauthState(tenantId));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
