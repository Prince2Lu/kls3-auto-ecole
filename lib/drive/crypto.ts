/**
 * Chiffrement du refresh token OAuth Google Drive avant stockage en base.
 *
 * AES-256-GCM : chiffrement symétrique authentifié (détecte toute
 * altération du texte chiffré, contrairement à un simple AES-CBC). Une
 * seule clé secrète partagée (DRIVE_TOKEN_ENCRYPTION_KEY), jamais commitée
 * — à générer une fois et stocker dans .env.local + Vercel, jamais
 * réutilisée depuis un autre secret du projet (CRON_SECRET, clés
 * Supabase, etc.), pour limiter le rayon d'exposition si un secret fuit.
 *
 * Format stocké : "iv:authTag:ciphertext", chacun en hex. L'IV
 * (vecteur d'initialisation) est aléatoire à chaque chiffrement — jamais
 * réutilisé pour la même clé, sinon la sécurité de GCM s'effondre.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommandé pour GCM (96 bits)

function getEncryptionKey(): Buffer {
  const keyHex = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "DRIVE_TOKEN_ENCRYPTION_KEY manquante — générer avec `openssl rand -hex 32` et l'ajouter à .env.local + Vercel"
    );
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "DRIVE_TOKEN_ENCRYPTION_KEY doit faire exactement 32 octets (64 caractères hex) pour AES-256"
    );
  }
  return key;
}

export function encryptToken(plainText: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(
    ":"
  );
}

export function decryptToken(encryptedPayload: string): string {
  const key = getEncryptionKey();
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Format de token chiffré invalide (attendu iv:authTag:ciphertext)");
  }
  const [ivHex, authTagHex, cipherTextHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const cipherText = Buffer.from(cipherTextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(cipherText),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Signature HMAC du paramètre `state` OAuth, pour prévenir la falsification
 * (un attaquant ne doit pas pouvoir forger un state pointant vers un autre
 * tenant que celui qui a réellement initié le flux OAuth — sinon il
 * pourrait faire connecter SON Drive au tenant de quelqu'un d'autre).
 * Réutilise la même clé que le chiffrement des tokens plutôt que d'ajouter
 * un secret supplémentaire à gérer.
 */
export function signOauthState(tenantId: string): string {
  const key = getEncryptionKey();
  const timestamp = Date.now().toString();
  const payload = `${tenantId}.${timestamp}`;
  const hmac = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/** Vérifie un state signé et retourne le tenantId s'il est valide, sinon
 * null (signature invalide, ou state expiré — évite qu'un lien OAuth
 * resté ouvert dans un onglet oublié reste exploitable indéfiniment). */
export function verifyOauthState(state: string): string | null {
  const key = getEncryptionKey();
  const parts = state.split(".");
  if (parts.length !== 3) return null;

  const [tenantId, timestamp, providedHmac] = parts;
  const payload = `${tenantId}.${timestamp}`;
  const expectedHmac = createHmac("sha256", key).update(payload).digest("hex");

  // Comparaison en temps constant pour éviter une attaque par timing sur
  // la comparaison de signature.
  const expectedBuf = Buffer.from(expectedHmac, "hex");
  const providedBuf = Buffer.from(providedHmac, "hex");
  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return null;
  }

  const age = Date.now() - Number(timestamp);
  if (Number.isNaN(age) || age < 0 || age > OAUTH_STATE_MAX_AGE_MS) {
    return null;
  }

  return tenantId;
}
