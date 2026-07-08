import { decryptToken } from "@/lib/drive/crypto";

export type DriveUploadResult = {
  fileId: string;
  webViewLink?: string;
};

type GoogleDriveFile = {
  id: string;
  webViewLink?: string;
};

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

/**
 * Échange le refresh token (déchiffré) contre un access token de courte
 * durée. Un access token Drive expire en ~1h — on en redemande un neuf à
 * chaque transfert plutôt que de mettre en cache (le coût d'un appel
 * supplémentaire est négligeable comparé à la complexité de gérer
 * l'expiration d'un cache).
 */
export async function getAccessToken(refreshTokenEncrypted: string): Promise<string> {
  const refreshToken = decryptToken(refreshTokenEncrypted);
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Impossible de renouveler l'accès Drive (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Cherche un dossier par nom sous un parent donné, le crée s'il n'existe
 * pas. Utilisé uniquement pour la création initiale du dossier élève et
 * de ses deux sous-dossiers — une fois créés, leurs IDs sont stockés en
 * base (students.drive_*_folder_id) pour éviter de refaire cette
 * recherche à chaque transfert (recherche par nom fragile en cas
 * d'homonymes, et coûteuse en appels API).
 */
async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string
): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `name = '${escapedName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchResponse = await fetch(
    `${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchResponse.ok) {
    const body = await searchResponse.text();
    throw new Error(`Recherche de dossier Drive échouée (${searchResponse.status}): ${body}`);
  }

  const searchData = (await searchResponse.json()) as {
    files: { id: string; name: string }[];
  };

  if (searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createResponse = await fetch(`${DRIVE_API_BASE}/files?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new Error(`Création de dossier Drive échouée (${createResponse.status}): ${body}`);
  }

  const createData = (await createResponse.json()) as { id: string };
  return createData.id;
}

export type StudentDriveFolders = {
  studentFolderId: string;
  antsFolderId: string;
  facturationFolderId: string;
};

const TENANT_ROOT_FOLDER_NAME = "KLS3 Auto-École";

/**
 * Résout le dossier racine du tenant dans son Drive : si
 * tenants.google_drive_folder_id est déjà renseigné, on le réutilise tel
 * quel (le client a peut-être choisi un dossier existant). Sinon, crée un
 * dossier "KLS3 Auto-École" à la racine du Drive du client — décision
 * actée le 8 juillet 2026, pour ne pas bloquer la validation du premier
 * dossier élève sur une étape de configuration manuelle supplémentaire.
 */
export async function ensureTenantRootFolder(
  refreshTokenEncrypted: string,
  existingRootFolderId: string | null
): Promise<string> {
  if (existingRootFolderId) {
    return existingRootFolderId;
  }

  const accessToken = await getAccessToken(refreshTokenEncrypted);
  return findOrCreateFolder(accessToken, TENANT_ROOT_FOLDER_NAME, "root");
}

/**
 * Crée (ou retrouve) l'arborescence Drive d'un élève : un dossier à son
 * nom sous le dossier racine du tenant, avec deux sous-dossiers "ANTS" et
 * "Facturation" — décision actée le 6 juillet 2026, cohérente avec la
 * catégorisation documents.category (migration 0015).
 */
export async function ensureStudentDriveFolders(
  refreshTokenEncrypted: string,
  tenantRootFolderId: string,
  studentDisplayName: string
): Promise<StudentDriveFolders> {
  const accessToken = await getAccessToken(refreshTokenEncrypted);

  const studentFolderId = await findOrCreateFolder(
    accessToken,
    studentDisplayName,
    tenantRootFolderId
  );
  const antsFolderId = await findOrCreateFolder(
    accessToken,
    "ANTS",
    studentFolderId
  );
  const facturationFolderId = await findOrCreateFolder(
    accessToken,
    "Facturation",
    studentFolderId
  );

  return { studentFolderId, antsFolderId, facturationFolderId };
}

/**
 * Upload d'un fichier vers un dossier Drive donné, via l'API "multipart"
 * (métadonnées + contenu en un seul appel — plus simple qu'un upload
 * resumable pour des fichiers de quelques Mo, taille max des documents
 * élève étant bornée à 10 Mo côté upload initial, voir
 * lib/constants/documents.ts).
 */
export async function uploadToDrive(
  refreshTokenEncrypted: string,
  folderId: string,
  fileName: string,
  fileContent: Buffer | Blob,
  mimeType: string
): Promise<DriveUploadResult> {
  const accessToken = await getAccessToken(refreshTokenEncrypted);

  const metadata = { name: fileName, parents: [folderId] };
  const boundary = `kls3-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const buffer = Buffer.isBuffer(fileContent)
    ? fileContent
    : Buffer.from(await fileContent.arrayBuffer());

  const bodyParts = [
    `--${boundary}\r\n`,
    "Content-Type: application/json; charset=UTF-8\r\n\r\n",
    `${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\n`,
    `Content-Type: ${mimeType}\r\n\r\n`,
  ];

  const bodyBuffer = Buffer.concat([
    Buffer.from(bodyParts.join(""), "utf8"),
    buffer,
    Buffer.from(`\r\n--${boundary}--`, "utf8"),
  ]);

  const response = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: bodyBuffer,
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upload Drive échoué (${response.status}): ${body}`);
  }

  const data = (await response.json()) as GoogleDriveFile;
  return { fileId: data.id, webViewLink: data.webViewLink };
}

