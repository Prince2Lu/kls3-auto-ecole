export type DriveUploadResult = {
  fileId: string;
  webViewLink?: string;
};

/**
 * Uploads a file to the tenant's Google Drive folder.
 * Stub — requires OAuth tokens stored per tenant.
 */
export async function uploadToDrive(
  _accessToken: string,
  _folderId: string,
  _fileName: string,
  _fileContent: Buffer | Blob
): Promise<DriveUploadResult> {
  throw new Error("Google Drive upload not yet implemented");
}
