"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type StudentRow = {
  id: string;
  nom: string;
  prenom: string;
  status: string | null;
  last_activity_at: string | null;
  formulaLabel: string | null;
  exigences: string;
};

type StudentsTableProps = {
  students: StudentRow[];
};

const STATUS_LABELS: Record<string, string> = {
  document_pending: "Documents en attente",
  payment_pending: "Paiement en attente",
  complete: "Complet",
};

const STATUS_BADGE: Record<string, string> = {
  document_pending: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  payment_pending: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  complete: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
};

const FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "document_pending", label: "Documents" },
  { value: "payment_pending", label: "Paiement" },
  { value: "complete", label: "Complets" },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];

function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? "";
  const classes =
    STATUS_BADGE[key] ?? "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {STATUS_LABELS[key] ?? status ?? "—"}
    </span>
  );
}

export function StudentsTable({ students }: StudentsTableProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return students;
    return students.filter((s) => s.status === filter);
  }, [students, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === opt.value
                ? "text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
            style={
              filter === opt.value
                ? { backgroundColor: "var(--tenant-primary)" }
                : undefined
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nom
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Prénom
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Formule
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Exigences
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Statut
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Dernière activité
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {filtered.map((student) => (
              <tr
                key={student.id}
                className="cursor-pointer transition-colors hover:bg-zinc-50"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/eleves/${student.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {student.nom}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-zinc-700">{student.prenom}</td>
                <td className="px-4 py-2.5 text-zinc-600">
                  {student.formulaLabel ?? "—"}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-zinc-700">
                  {student.exigences}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={student.status} />
                </td>
                <td className="px-4 py-2.5 tabular-nums text-zinc-600">
                  {student.last_activity_at
                    ? new Date(student.last_activity_at).toLocaleDateString(
                        "fr-FR"
                      )
                    : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  Aucun élève pour ce filtre
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        {filtered.length} élève{filtered.length !== 1 ? "s" : ""} affiché
        {filter !== "all" ? ` · filtre actif` : ""}
      </p>
    </div>
  );
}
