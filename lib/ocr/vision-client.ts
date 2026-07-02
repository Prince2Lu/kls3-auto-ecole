/**
 * Client REST minimal pour Google Cloud Vision (DOCUMENT_TEXT_DETECTION).
 *
 * Volontairement pas de SDK @google-cloud/vision : on envoie une image à la
 * fois de façon synchrone (upload élève -> OCR immédiat), ce qui est
 * supporté par une simple clé API sur l'endpoint images:annotate — pas
 * besoin d'un compte de service JSON (celui-ci n'est requis que pour
 * l'async batch depuis Cloud Storage, qu'on n'utilise pas ici).
 *
 * Variable d'env requise : GOOGLE_VISION_API_KEY
 * (clé restreinte à Cloud Vision API uniquement dans la console GCP,
 * jamais exposée côté client — utilisée uniquement dans ce module,
 * appelé exclusivement depuis des Server Actions).
 */

const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";

export class VisionOcrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionOcrError";
  }
}

/**
 * Envoie une image à Vision API en DOCUMENT_TEXT_DETECTION et retourne le
 * texte brut détecté (fullTextAnnotation.text). Chaîne vide si aucun texte
 * détecté (photo illisible, mauvais document) — c'est au parseur appelant
 * de décider que ça équivaut à un échec.
 */
export async function callVisionOcr(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new VisionOcrError("GOOGLE_VISION_API_KEY manquant côté serveur.");
  }

  if (!mimeType.startsWith("image/")) {
    // Vision images:annotate ne traite que des images. Les RIB/CNI envoyés
    // en PDF ne sont pas OCRisés par ce chemin (limitation connue,
    // documentée en fin de session) — on le signale comme un échec propre
    // plutôt que de laisser l'appel HTTP échouer de façon opaque.
    throw new VisionOcrError(
      `Type MIME non supporté par ce client Vision (image uniquement) : ${mimeType}`
    );
  }

  const response = await fetch(`${VISION_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: buffer.toString("base64") },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["fr"] },
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new VisionOcrError(
      `Vision API a répondu ${response.status} : ${body.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const result = data?.responses?.[0];

  if (result?.error) {
    throw new VisionOcrError(
      `Vision API error: ${result.error.message ?? "inconnue"}`
    );
  }

  return (result?.fullTextAnnotation?.text as string | undefined) ?? "";
}
