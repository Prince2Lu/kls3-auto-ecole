export function calculateAge(
  dateOfBirth: string,
  referenceDate: Date = new Date()
): number {
  const birth = new Date(dateOfBirth);
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}
