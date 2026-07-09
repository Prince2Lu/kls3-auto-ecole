import { CheckCircle2, Clock, CreditCard, FileCheck2, XCircle } from "lucide-react";
import type { BadgeVariant } from "@/components/ui/Badge";

export const STUDENT_STATUS_LABELS: Record<string, string> = {
  en_attente: "En attente",
  document_pending: "Documents en attente",
  documents_complets: "À valider",
  payment_pending: "Paiement en attente",
  complete: "Complet",
  refuse: "Refusé",
};

export const STUDENT_STATUS_BADGE_CONFIG: Record<
  string,
  { variant: BadgeVariant; icon?: typeof Clock }
> = {
  en_attente: { variant: "neutral" },
  document_pending: { variant: "warning", icon: Clock },
  documents_complets: { variant: "warning", icon: FileCheck2 },
  payment_pending: { variant: "warning", icon: CreditCard },
  complete: { variant: "success", icon: CheckCircle2 },
  refuse: { variant: "danger", icon: XCircle },
};
