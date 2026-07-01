import Link from "next/link";

const DEMO_STUDENTS = [
  { name: "Marie Dupont", status: "Complet", formula: "Permis B" },
  { name: "Lucas Martin", status: "Documents en attente", formula: "Permis B" },
  { name: "Sophie Bernard", status: "Paiement en attente", formula: "Conduite accompagnée" },
];

export default function AutoEcoleDemoPage() {
  return (
    <div className="min-h-full bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-sm font-bold text-white">
              K
            </div>
            <span className="text-lg font-semibold text-zinc-900">
              KLS3 Auto-École
            </span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Connexion collaborateur
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-600">
            Démo produit
          </p>
          <h1 className="mb-4 text-4xl font-bold text-zinc-900">
            Gérez les dossiers élèves en toute simplicité
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-600">
            Inscription en ligne, collecte de documents, OCR avec validation
            humaine, relances automatiques et export CSV. Données fictives
            ci-dessous — aucune donnée réelle.
          </p>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Dossiers actifs", value: "24" },
            { label: "En attente documents", value: "8" },
            { label: "Complets ce mois", value: "12" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-zinc-200 bg-white p-6 text-center"
            >
              <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="font-semibold text-zinc-900">
              Élèves fictifs — Auto-École Démo
            </h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-zinc-600">
                  Nom
                </th>
                <th className="px-6 py-3 text-left font-medium text-zinc-600">
                  Formule
                </th>
                <th className="px-6 py-3 text-left font-medium text-zinc-600">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {DEMO_STUDENTS.map((student) => (
                <tr key={student.name}>
                  <td className="px-6 py-4 font-medium text-zinc-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">{student.formula}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-400">
          Page de démonstration — auto-ecole.kls3-dev.com — données 100 % fictives
        </p>
      </main>
    </div>
  );
}
