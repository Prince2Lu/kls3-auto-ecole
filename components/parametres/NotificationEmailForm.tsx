"use client";

import { useState } from "react";
import { updateNotificationEmail } from "@/lib/actions/tenant-settings";

type NotificationEmailFormProps = {
  tenantId: string;
  initialEmail: string | null;
};

export function NotificationEmailForm({
  tenantId,
  initialEmail,
}: NotificationEmailFormProps) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const result = await updateNotificationEmail(tenantId, email);

    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Email de notification enregistré.");
    }

    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="notificationEmail"
          className="mb-1.5 block text-sm font-medium text-zinc-700"
        >
          Email de notification
        </label>
        <input
          id="notificationEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="secretariat@auto-ecole.fr"
          className="w-full max-w-md rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Recevez un email à chaque nouvelle inscription en ligne. Laissez vide
          pour désactiver.
        </p>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-700">{message}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {isSubmitting ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
