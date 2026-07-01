import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";

type DashboardLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
};

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  if (!tenant) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("id, role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-zinc-50">
      <aside className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-100/80 px-3 py-6">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Espace collaborateur
        </p>
        <DashboardNav />
      </aside>
      <div className="flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
