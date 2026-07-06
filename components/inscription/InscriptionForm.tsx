"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { inscrireEleve } from "@/app/tenant/[tenant]/inscription/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";

type FormulaOption = {
  id: string;
  name: string;
};

type FieldErrors = Partial<
  Record<"prenom" | "nom" | "email" | "date_of_birth" | "formula_id", string>
>;

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

function mapServerErrorToField(message: string): {
  field?: keyof FieldErrors;
  formError?: string;
} {
  if (message.includes("email")) {
    return { field: "email", formError: message };
  }
  if (message.includes("date de naissance")) {
    return { field: "date_of_birth", formError: message };
  }
  if (message.includes("formule")) {
    return { field: "formula_id", formError: message };
  }
  if (message.includes("Nom") || message.includes("prénom")) {
    return { formError: message };
  }
  return { formError: message };
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
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nom = String(formData.get("nom") ?? "").trim();
    const prenom = String(formData.get("prenom") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const date_of_birth = String(formData.get("date_of_birth") ?? "").trim();
    const formula_id = String(formData.get("formula_id") ?? "").trim();

    const errors: FieldErrors = {};

    if (!prenom) {
      errors.prenom = "Le prénom est requis.";
    }
    if (!nom) {
      errors.nom = "Le nom est requis.";
    }
    if (!email) {
      errors.email = "L'email est requis.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Adresse email invalide.";
    }
    if (!isValidDateOfBirth(date_of_birth)) {
      errors.date_of_birth = "Merci de renseigner une date de naissance valide.";
    }
    if (formulas.length > 0 && !formula_id) {
      errors.formula_id = "Veuillez sélectionner une formule.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    startTransition(async () => {
      const result = await inscrireEleve(
        { nom, prenom, email, date_of_birth, formula_id },
        tenantId,
        tenantSlug
      );

      if ("error" in result) {
        const mapped = mapServerErrorToField(result.error);
        if (mapped.field) {
          setFieldErrors({ [mapped.field]: result.error });
        } else {
          setFormError(mapped.formError ?? result.error);
        }
        return;
      }

      setSubmittedEmail(email);
      setIsSuccess(true);
    });
  }

  if (isSuccess) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="text-center">
          <CheckCircle2
            className="mx-auto h-12 w-12 text-success"
            aria-hidden
          />
          <h2 className="mt-4 font-display text-xl font-semibold text-ink">
            Votre dossier est ouvert !
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral">
            Un email a été envoyé à{" "}
            <span className="font-medium text-ink">{submittedEmail}</span> avec
            un lien pour déposer vos pièces justificatives.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-6"
            onClick={() => setIsSuccess(false)}
          >
            Modifier mes informations
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold text-ink">
        Créer mon dossier d&apos;inscription
      </h2>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <Input
          id="prenom"
          name="prenom"
          label="Prénom"
          type="text"
          required
          placeholder="Marie"
          error={fieldErrors.prenom}
        />
        <Input
          id="nom"
          name="nom"
          label="Nom"
          type="text"
          required
          placeholder="Dupont"
          error={fieldErrors.nom}
        />
        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          placeholder="marie.dupont@email.fr"
          error={fieldErrors.email}
        />
        <Input
          id="date_of_birth"
          name="date_of_birth"
          label="Date de naissance"
          type="date"
          required
          error={fieldErrors.date_of_birth}
        />
        {formulas.length > 0 && (
          <Select
            id="formula_id"
            name="formula_id"
            label="Formule"
            required
            defaultValue={formulas[0]?.id ?? ""}
            error={fieldErrors.formula_id}
          >
            {formulas.map((formula) => (
              <option key={formula.id} value={formula.id}>
                {formula.name}
              </option>
            ))}
          </Select>
        )}
        {formError && (
          <p
            className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {formError}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          className="w-full py-2.5"
        >
          {isPending ? "Envoi en cours…" : "Démarrer mon dossier"}
        </Button>
        <p className="text-center text-xs leading-relaxed text-neutral">
          Vos données sont traitées conformément au RGPD.{" "}
          <a href="#" className="text-ink underline hover:text-brand">
            Politique de confidentialité
          </a>
        </p>
      </form>
    </Card>
  );
}
