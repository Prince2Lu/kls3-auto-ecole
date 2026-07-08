import { NextResponse } from "next/server";
import { verifyOauthState, encryptToken } from "@/lib/drive/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    // L'utilisateur a refusé le consentement côté Google, ou une autre
    // erreur OAuth standard (ex. access_denied) — pas une erreur serveur.
    return NextResponse.json(
      { error: `Autorisation Google refusée : ${oauthError}` },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: "code et state requis" },
      { status: 400 }
    );
  }

  const tenantId = verifyOauthState(state);
  if (!tenantId) {
    return NextResponse.json(
      { error: "State invalide ou expiré — relancez la connexion Drive depuis les paramètres." },
      { status: 400 }
    );
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/drive/oauth/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    console.error("[drive/oauth/callback] Échange token échoué:", {
      status: tokenResponse.status,
      body: errorBody,
    });
    return NextResponse.json(
      { error: "Échange du code d'autorisation contre les tokens échoué" },
      { status: 502 }
    );
  }

  const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokens.refresh_token) {
    // Google ne renvoie un refresh_token que lors du tout premier
    // consentement (ou si prompt=consent force une nouvelle autorisation,
    // ce qu'on fait déjà côté route d'initiation) — si absent malgré ça,
    // le tenant avait probablement déjà autorisé l'app sans révoquer
    // l'accès au préalable. On échoue explicitement plutôt que de stocker
    // un état incomplet (access_token seul, qui expire en ~1h sans moyen
    // de le renouveler).
    return NextResponse.json(
      {
        error:
          "Aucun refresh token reçu de Google. Révoquez l'accès existant (myaccount.google.com/permissions) puis relancez la connexion.",
      },
      { status: 502 }
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("tenants")
    .update({
      drive_refresh_token_encrypted: encryptToken(tokens.refresh_token),
      drive_connected_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (updateError) {
    console.error("[drive/oauth/callback] Échec stockage token:", updateError.message);
    return NextResponse.json(
      { error: "Échec de l'enregistrement de la connexion Drive" },
      { status: 500 }
    );
  }

  // Redirection vers la page paramètres du tenant plutôt qu'une réponse
  // JSON brute — l'utilisateur arrive ici depuis un clic dans l'UI, pas
  // depuis un appel API direct.
  const { data: tenant } = await admin
    .from("tenants")
    .select("slug")
    .eq("id", tenantId)
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectPath = tenant?.slug
    ? `${appUrl.replace("://", `://${tenant.slug}.`)}/parametres?drive=connected`
    : appUrl;

  return NextResponse.redirect(redirectPath);
}
