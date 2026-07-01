type StatusCounts = {
  document_pending: number;
  payment_pending: number;
  complete: number;
};

type StatusCountersProps = {
  counts: StatusCounts;
};

const COUNTERS = [
  {
    key: "active" as const,
    label: "Dossiers actifs",
    sublabel: "En cours de traitement",
    accent: "border-zinc-300",
  },
  {
    key: "document_pending" as const,
    label: "En attente documents",
    sublabel: "Action requise",
    accent: "border-amber-400",
  },
  {
    key: "complete" as const,
    label: "Dossiers complets",
    sublabel: "Terminés",
    accent: "border-emerald-400",
  },
];

export function StatusCounters({ counts }: StatusCountersProps) {
  const values = {
    active:
      counts.document_pending + counts.payment_pending + counts.complete,
    document_pending: counts.document_pending,
    complete: counts.complete,
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {COUNTERS.map(({ key, label, sublabel, accent }) => (
        <div
          key={key}
          className={`rounded-md border border-zinc-200 border-l-4 bg-white px-5 py-4 ${accent}`}
        >
          <p className="text-3xl font-bold tabular-nums text-zinc-900">
            {values[key]}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-700">{label}</p>
          <p className="text-xs text-zinc-500">{sublabel}</p>
        </div>
      ))}
    </div>
  );
}
