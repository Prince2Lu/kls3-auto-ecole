"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inscrireEleve } from "@/app/tenant/[tenant]/inscription/actions";

type FormulaOption = {
  id: string;
  name: string;
};

function isValidDateOfBirth(value: string): boolean {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return false;

  const minBirthDate = new Date(today);
  minBirthDate.setFullYear(today.getFullYear() - 12);
  if (date > minBirthDate) return false;

  return true;
}

type InscriptionFormProps = {
  formulas: FormulaOption[];
  tenantId: string;
  tenantSlug: string;
};

export function InscriptionForm({
  formulas,
  tenantId,
  tenantSlug,
}: InscriptionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nom = String(formData.get("nom") ?? "").trim();
    const prenom = String(formData.get("prenom") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const date_of_birth = String(formData.get("date_of_birth") ?? "").trim();
    const formula_id = String(formData.get("formula_id") ?? "").trim();

    if (!nom || !prenom || !email) {
      setError("Tous les champs obligatoires doivent être remplis.");
      return;
    }

    if (!isValidDateOfBirth(date_of_birth)) {
      setError("Merci de renseigner une date de naissance valide.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Adresse email invalide.");
      return;
    }

    if (formulas.length > 0 && !formula_id) {
      setError("Veuillez sélectionner une formule.");
      return;
    }

    startTransition(async () => {
      const result = await inscrireEleve(
        { nom, prenom, email, date_of_birth, formula_id },
        tenantId,
        tenantSlug
      );

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push("/inscription/confirmation");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-md border border-zinc-200 bg-white p-6"
    >
      <div>
        <label
          htmlFor="prenom"
          className="mb-1.5 block text-sm font-medium text-zinc-700"
        >
          Prénom
        </label>
        <input
          id="prenom"
          name="prenom"
          type="text"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          placeholder="Marie"
        />
      </div>
      <div>
        <label
          htmlFor="nom"
          className="mb-1.5 block text-sm font-medium text-zinc-700"
        >
          Nom
        </label>
        <input
          id="nom"
          name="nom"
          type="text"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          placeholder="Dupont"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-zinc-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          placeholder="marie.dupont@email.fr"
        />
      </div>
      <div>
        <label
          htmlFor="date_of_birth"
          className="mb-1.5 block text-sm font-medium text-zinc-700"
        >
          Date de naissance
        </label>
        <input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
      </div>
      {formulas.length > 0 && (
        <div>
          <label
            htmlFor="formula_id"
            className="mb-1.5 block text-sm font-medium text-zinc-700"
          >
            Formule
          </label>
          <select
            id="formula_id"
            name="formula_id"
            required
            defaultValue={formulas[0]?.id ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          >
            {formulas.map((formula) => (
              <option key={formula.id} value={formula.id}>
                {formula.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--color-primary, var(--tenant-primary))" }}
      >
        {isPending ? "Envoi en cours…" : "S'inscrire"}
      </button>
    </form>
  );
}
