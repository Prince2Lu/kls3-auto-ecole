/**
 * @types/pdf-parse type uniquement le point d'entrée principal `pdf-parse`.
 * On importe volontairement `pdf-parse/lib/pdf-parse.js` pour contourner
 * le bloc de debug piégé de index.js (voir commentaire dans
 * extract-pdf-text.ts) — ce sous-chemin nécessite donc sa propre
 * déclaration minimale.
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  import type PdfParse from "pdf-parse";

  function pdfParse(
    dataBuffer: Buffer,
    options?: PdfParse.Options
  ): Promise<PdfParse.Result>;

  export = pdfParse;
}
