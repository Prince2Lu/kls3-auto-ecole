"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { validateDossier } from "@/app/tenant/[tenant]/(dashboard)/eleves/[studentId]/validate-action";
import { Button } from "@/components/ui/Button";

type ValidateDossierButtonProps = {
  studentId: string;
  tenantId: string;
  tenantSlug: string;
  prenom: string;
  nom: string;
  status: string | null;
};

export function ValidateDossierButton({
  studentId,
  tenantId,
  tenantSlug,
  prenom,
  nom,
  status,
}: ValidateDossierButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "documents_complets") {
    return null;
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await validateDossier(studentId, tenantId, tenantSlug);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setShowModal(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={() => {
          setError(null);
          setShowModal(true);
        }}
        disabled={isPending}
      >
        Valider le dossier
      </Button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validate-dossier-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-xl">
            <h2
              id="validate-dossier-title"
              className="font-display text-lg font-semibold text-ink"
            >
              Confirmer la validation
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral">
              Confirmer la validation du dossier de{" "}
              <span className="font-medium text-ink">
                {prenom} {nom}
              </span>{" "}
              ? Cette action marquera le dossier comme complet.
            </p>

            {error && (
              <p className="mt-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button onClick={handleConfirm} disabled={isPending}>
                {isPending ? "Validation…" : "Confirmer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
