import { notFound } from "next/navigation";
import { resolveTenantBySlug } from "@/lib/tenant/resolve";

type TenantLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
};

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const primaryColor = tenant.primary_color ?? "#4B7BF5";

  return (
    <div
      style={{ "--tenant-primary": primaryColor } as React.CSSProperties}
      className="min-h-full"
    >
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="h-10 w-auto object-contain"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <span className="text-lg font-semibold text-zinc-900">
            {tenant.name}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
