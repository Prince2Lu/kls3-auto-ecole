"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "@/app/tenant/[tenant]/dossier/actions";
import type { RequiredDocumentConfig } from "@/lib/constants/documents";
import { isDocumentReceived, type StudentDocument } from "@/lib/types/documents";

type DocumentUploadCardProps = {
  config: RequiredDocumentConfig;
  token: string;
  tenantSlug: string;
  document?: StudentDocument;
};

export function DocumentUploadCard({
  config,
  token,
  tenantSlug,
  document,
}: DocumentUploadCardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justUploaded, setJustUploaded] = useState(false);

  const received = isDocumentReceived(document) || justUploaded;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSelectedName(file.name);
    setJustUploaded(false);

    const formData = new FormData();
    formData.append("token", token);
    formData.append("tenantSlug", tenantSlug);
    formData.append("documentType", config.type);
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadDocument(formData);

      if ("error" in result) {
        setError(result.error);
        setSelectedName(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      setJustUploaded(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{config.label}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            JPG, PNG ou PDF — max {Math.round(config.maxBytes / (1024 * 1024))} Mo
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            received
              ? "bg-emerald-100 text-emerald-800"
              : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {received ? "Reçu" : "Manquant"}
        </span>
      </div>

      {received && (document?.original_filename || selectedName) && (
        <p className="mt-2 truncate text-xs text-zinc-600">
          Fichier : {document?.original_filename ?? selectedName}
        </p>
      )}

      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          disabled={isPending}
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-50"
        />
      </div>

      {isPending && (
        <p className="mt-2 text-xs text-zinc-500">Envoi en cours…</p>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
