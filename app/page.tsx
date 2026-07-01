import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4">
      <main className="max-w-lg text-center">
        <h1 className="mb-4 text-3xl font-bold text-zinc-900">
          KLS3 Auto-École
        </h1>
        <p className="mb-8 text-zinc-600">
          Plateforme multi-tenant de gestion des dossiers élèves pour
          auto-écoles.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auto-ecole"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Voir la démo produit
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Connexion collaborateur
          </Link>
        </div>
      </main>
    </div>
  );
}
