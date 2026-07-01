import { StatusCounters } from "@/components/dashboard/StatusCounters";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

type DashboardPageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("status")
    .eq("tenant_id", tenant.id);

  const counts = {
    document_pending: 0,
    payment_pending: 0,
    complete: 0,
  };

  for (const student of students ?? []) {
    const status = student.status as keyof typeof counts;
    if (status in counts) {
      counts[status]++;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Vue d&apos;ensemble</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Suivi des dossiers élèves — {tenant.name}
        </p>
      </div>
      <StatusCounters counts={counts} />
    </div>
  );
}
