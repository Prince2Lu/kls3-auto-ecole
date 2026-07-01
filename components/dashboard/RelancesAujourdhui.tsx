type RelancesAujourdhuiProps = {
  count: number;
};

export function RelancesAujourdhui({ count }: RelancesAujourdhuiProps) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Relances automatiques
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
        {count}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        {count === 0
          ? "Aucune relance envoyée aujourd'hui"
          : count === 1
            ? "relance envoyée aujourd'hui"
            : "relances envoyées aujourd'hui"}
      </p>
    </div>
  );
}
