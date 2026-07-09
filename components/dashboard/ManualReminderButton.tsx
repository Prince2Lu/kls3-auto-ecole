"use client";

import { useState, useTransition } from "react";
import { sendManualReminder } from "@/lib/actions/send-manual-reminder";
import { Button } from "@/components/ui/Button";

type ManualReminderButtonProps = {
  studentId: string;
  tenantId: string;
  tenantSlug: string;
  status: string | null;
};

type ReminderFeedback = { type: "success" | "error"; message: string } | null;

const ELIGIBLE_STATUSES = new Set(["document_pending", "en_attente"]);

export function ManualReminderButton(props: ManualReminderButtonProps) {
  const { studentId, tenantId, tenantSlug, status } = props;
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ReminderFeedback>(null);

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
      <Button variant="secondary" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Envoi..." : "Relancer maintenant"}
      </Button>
      {feedback && (
        <p
          className={
            feedback.type === "success"
              ? "text-xs text-success"
              : "text-xs text-danger"
          }
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
