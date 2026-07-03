export function isDatePerime(
  dateDocument: string,
  monthsValidity: number,
  referenceDate: Date = new Date()
): boolean {
  const docDate = new Date(dateDocument);
  const expiry = new Date(docDate);
  expiry.setMonth(expiry.getMonth() + monthsValidity);
  return expiry < referenceDate;
}

export const JUSTIFICATIF_DOMICILE_VALIDITY_MONTHS = 6;
