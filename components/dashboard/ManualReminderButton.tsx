cat > components/dashboard/ManualReminderButton.tsx << 'EOF'
"use client";

import { useState, useTransition } from "react";
import { sendManualReminder } from "@/lib/actions/send-manual-reminder";

type ManualReminderButtonProps = {
  studentId: string;
  tenantId: string;
  tenantSlug: string;
  status: string | null;
};

const ELIGIBLE_STATUSES = new Set(["document_pending", "en_attente"]);

export function ManualReminderButton({
  studentId,
  tenantId,
  tenantSlug,
  status,
}: ManualReminderButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState
    { type: "success" | "error"; message: string } | null
  >(null);

  if (!status || !ELIGIBLE_STATUSES.has(status)) {
    return null;
  }

  const handleClick = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await sendManualReminder(studentId, tenantId, tenantSlug);
      if ("error" in result) {
        setFeedback({ type: "error", message: result.error });
      } else {
        setFeedback({ type: "success", message: "Relance envoyée." });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Envoi..." : "Relancer maintenant"}
      </button>
      {feedback && (
        <p
          className={`text-xs ${
            feedback.type === "success" ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
