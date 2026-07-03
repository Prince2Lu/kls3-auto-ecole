/** Date calendaire ISO (YYYY-MM-DD) → affichage fr-FR, sans décalage UTC. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value?.trim()) return "";

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("fr-FR");
}
