export function isDateNaissanceCoherente(
  extracted: string | undefined,
  declared: string | null
): boolean {
  if (!extracted?.trim() || !declared?.trim()) {
    return true;
  }

  return extracted.trim() === declared.trim();
}
