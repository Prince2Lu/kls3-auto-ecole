"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { validateDossier } from "@/app/tenant/[tenant]/(dashboard)/eleves/[studentId]/validate-action";

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
      <button
        type="button"
        onClick={() => {
          setError(null);
          setShowModal(true);
        }}
        disabled={isPending}
        className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--tenant-primary)" }}
      >
        Valider le dossier
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validate-dossier-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2
              id="validate-dossier-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Confirmer la validation
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              Confirmer la validation du dossier de{" "}
              <span className="font-medium text-zinc-900">
                {prenom} {nom}
              </span>{" "}
              ? Cette action marquera le dossier comme complet.
            </p>

            {error && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--tenant-primary)" }}
              >
                {isPending ? "Validation…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
