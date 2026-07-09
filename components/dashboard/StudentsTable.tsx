"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { REQUIRED_DOCUMENT_TYPES } from "@/lib/constants/documents";
import {
  STUDENT_STATUS_LABELS as STATUS_LABELS,
  STUDENT_STATUS_BADGE_CONFIG as STATUS_BADGE_CONFIG,
} from "@/lib/constants/student-status";

type DocumentDetailValue = "recu" | "manquant" | "non_applicable";

type StudentRow = {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  dateOfBirth: string | null;
  status: string | null;
  last_activity_at: string | null;
  formulaLabel: string | null;
  exigences: string;
  documentsDetail: Record<string, DocumentDetailValue>;
  manquants: string[];
};

type StudentsTableProps = {
  students: StudentRow[];
};

const FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "document_pending", label: "Documents" },
  { value: "documents_complets", label: "À valider" },
  { value: "payment_pending", label: "Paiement" },
  { value: "complete", label: "Complets" },
] as const;

type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];

/** Échappe une valeur pour l'inclure dans un champ CSV : entoure de
 * guillemets si la valeur contient une virgule, un guillemet ou un saut de
 * ligne (RFC 4180), et double les guillemets internes. */
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const DOCUMENT_DETAIL_LABELS: Record<DocumentDetailValue, string> = {
  recu: "Reçu",
  manquant: "Manquant",
  non_applicable: "N/A",
};

/** Construit le CSV à partir des lignes actuellement affichées (donc déjà
 * filtrées selon le statut sélectionné par la secrétaire) — l'export
 * reflète toujours exactement ce qui est visible à l'écran au moment du
 * clic, pas l'ensemble complet des élèves du tenant. */
function buildCsv(rows: StudentRow[]): string {
  const documentColumns = REQUIRED_DOCUMENT_TYPES.map((doc) => doc.label);

  const headers = [
    "Nom",
    "Prénom",
    "Email",
    "Date de naissance",
    "Formule",
    "Statut",
    ...documentColumns,
    "Documents manquants",
    "Dernière activité",
  ];

  const lines = rows.map((row) => {
    const documentValues = REQUIRED_DOCUMENT_TYPES.map((doc) => {
      const value = row.documentsDetail[doc.type];
      return DOCUMENT_DETAIL_LABELS[value] ?? "";
    });

    const fields = [
      row.nom,
      row.prenom,
      row.email ?? "",
      row.dateOfBirth
        ? new Date(row.dateOfBirth).toLocaleDateString("fr-FR")
        : "",
      row.formulaLabel ?? "",
      STATUS_LABELS[row.status ?? ""] ?? row.status ?? "",
      ...documentValues,
      row.manquants.join(", "),
      row.last_activity_at
        ? new Date(row.last_activity_at).toLocaleDateString("fr-FR")
        : "",
    ];

    return fields.map((field) => escapeCsvField(String(field))).join(",");
  });

  const BOM = "\uFEFF";
  return BOM + [headers.join(","), ...lines].join("\n");
}

function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }: { status: string | null }) {
  const key = status ?? "";
  const config = STATUS_BADGE_CONFIG[key] ?? { variant: "neutral" as const };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      {Icon && <Icon className="h-3 w-3" aria-hidden />}
      {STATUS_LABELS[key] ?? status ?? "—"}
    </Badge>
  );
}

export function StudentsTable({ students }: StudentsTableProps) {
  const [filter, setFilter] = useState<FilterValue>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return students;
    return students.filter((s) => s.status === filter);
  }, [students, filter]);

  const counts = useMemo(() => {
    const map: Record<FilterValue, number> = {
      all: students.length,
      document_pending: 0,
      documents_complets: 0,
      payment_pending: 0,
      complete: 0,
    };
    for (const s of students) {
      if (s.status && s.status in map) {
        map[s.status as FilterValue] += 1;
      }
    }
    return map;
  }, [students]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={filter === opt.value ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
              <span
                className={
                  filter === opt.value
                    ? "ml-1.5 opacity-75"
                    : "ml-1.5 text-neutral"
                }
              >
                {counts[opt.value]}
              </span>
            </Button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={filtered.length === 0}
          onClick={() => {
            const csv = buildCsv(filtered);
            const date = new Date().toISOString().slice(0, 10);
            downloadCsv(csv, `eleves-${date}.csv`);
          }}
        >
          Exporter en CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                Nom
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                Prénom
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                Formule
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                Exigences
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                Statut
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral">
                Dernière activité
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {filtered.map((student) => (
              <tr
                key={student.id}
                className="cursor-pointer transition-colors hover:bg-surface-muted"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/eleves/${student.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {student.nom}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-ink">{student.prenom}</td>
                <td className="px-4 py-2.5 text-neutral">
                  {student.formulaLabel ?? "—"}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-ink">
                  {student.exigences}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={student.status} />
                </td>
                <td className="px-4 py-2.5 tabular-nums text-neutral">
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
                  className="px-4 py-10 text-center text-neutral"
                >
                  Aucun élève pour ce filtre
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral">
        {filtered.length} élève{filtered.length !== 1 ? "s" : ""} affiché
        {filter !== "all" ? ` · filtre actif` : ""}
      </p>
    </div>
  );
}
