export type StudentForRemind = {
  id: string;
  status: string | null;
  created_at: string | null;
  email: string | null;
  prenom: string;
  nom: string;
};

const ELIGIBLE_STATUSES = new Set(["document_pending", "en_attente"]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeStudentsToRemind(
  students: StudentForRemind[],
  lastReminderSentAtByStudentId: ReadonlyMap<string, string>,
  relanceDelaiJours: number,
  now: Date = new Date()
): StudentForRemind[] {
  if (relanceDelaiJours <= 0) {
    return [];
  }

  return students.filter((student) => {
    if (!student.status || !ELIGIBLE_STATUSES.has(student.status)) {
      return false;
    }

    if (!student.email?.trim()) {
      return false;
    }

    const referenceIso =
      lastReminderSentAtByStudentId.get(student.id) ?? student.created_at;

    if (!referenceIso) {
      return false;
    }

    const referenceMs = new Date(referenceIso).getTime();
    if (Number.isNaN(referenceMs)) {
      return false;
    }

    const daysElapsed = (now.getTime() - referenceMs) / MS_PER_DAY;
    return daysElapsed >= relanceDelaiJours;
  });
}
