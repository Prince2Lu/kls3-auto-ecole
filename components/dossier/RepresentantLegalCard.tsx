"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { upsertRepresentantLegal } from "@/app/tenant/[tenant]/dossier/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type RepresentantLegalCardProps = {
  token: string;
  tenantSlug: string;
  initialNom?: string;
  initialPrenom?: string;
  initialEmail?: string;
};

export function RepresentantLegalCard({
  token,
  tenantSlug,
  initialNom = "",
  initialPrenom = "",
  initialEmail = "",
}: RepresentantLegalCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nom, setNom] = useState(initialNom);
  const [prenom, setPrenom] = useState(initialPrenom);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.append("token", token);
    formData.append("tenantSlug", tenantSlug);
    formData.append("nom", nom);
    formData.append("prenom", prenom);
    formData.append("email", email);

    startTransition(async () => {
      const result = await upsertRepresentantLegal(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="font-display text-base font-semibold text-ink">
        Représentant légal
      </h2>
      <p className="mt-1 text-sm text-neutral">
        En tant que mineur, indiquez les coordonnées de votre représentant
        légal (parent ou tuteur).
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          label="Nom"
          name="nom"
          value={nom}
          onChange={(event) => setNom(event.target.value)}
          required
          autoComplete="family-name"
        />
        <Input
          label="Prénom"
          name="prenom"
          value={prenom}
          onChange={(event) => setPrenom(event.target.value)}
          required
          autoComplete="given-name"
        />
        <Input
          label="Email (facultatif)"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {saved ? (
          <p className="text-sm text-success">Informations enregistrées.</p>
        ) : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </Card>
  );
}
