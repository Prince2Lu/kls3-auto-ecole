import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";

type TrustBoxProps = {
  title: string;
  items: string[];
};

export function TrustBox({ title, items }: TrustBoxProps) {
  return (
    <Card className="bg-surface-muted">
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-neutral">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
