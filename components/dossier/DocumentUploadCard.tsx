"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "@/app/tenant/[tenant]/dossier/actions";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { RequiredDocumentConfig } from "@/lib/constants/documents";
import { isDocumentReceived, type StudentDocument } from "@/lib/types/documents";
import { Upload } from "lucide-react";

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
  const [declaredDate, setDeclaredDate] = useState(
    document?.date_document ?? ""
  );

  const isPerime = document?.status === "perime";
  const received = isDocumentReceived(document) || justUploaded;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (config.requiresDeclaredDate && !declaredDate) {
      setError("Merci d'indiquer la date d'émission du document.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setSelectedName(file.name);
    setJustUploaded(false);

    const formData = new FormData();
    formData.append("token", token);
    formData.append("tenantSlug", tenantSlug);
    formData.append("documentType", config.type);
    formData.append("file", file);
    if (config.requiresDeclaredDate) {
      formData.append("dateDocument", declaredDate);
    }

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

  const badgeLabel = isPerime
    ? "Périmé — à renouveler"
    : received
      ? "Reçu"
      : "Manquant";
  const badgeVariant = isPerime ? "danger" : received ? "success" : "neutral";
  const fileName = document?.original_filename ?? selectedName;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">
            {config.label}
          </h3>
          <p className="mt-0.5 text-xs text-neutral">
            JPG, PNG ou PDF — max {Math.round(config.maxBytes / (1024 * 1024))} Mo
          </p>
        </div>
        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      </div>

      {config.requiresDeclaredDate && (
        <div className="mt-3">
          <label
            htmlFor={`date-${config.type}`}
            className="mb-1 block text-xs font-medium text-neutral"
          >
            Date d&apos;émission du document
          </label>
          <input
            id={`date-${config.type}`}
            type="date"
            value={declaredDate}
            onChange={(e) => setDeclaredDate(e.target.value)}
            disabled={isPending}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-surface-muted px-3 py-1.5 text-sm font-medium text-ink hover:bg-border disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          Choisir un fichier
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          disabled={isPending}
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="truncate text-xs text-neutral">
          {received && fileName ? fileName : "Aucun fichier choisi"}
        </p>
      </div>

      {isPending && <p className="mt-2 text-xs text-neutral">Envoi en cours…</p>}

      {error && (
        <p className="mt-2 rounded-md bg-danger-subtle px-2 py-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
