import { notFound } from "next/navigation";
import { fontDisplay, fontBody } from "@/lib/fonts";
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

  const brandColor = tenant.primary_color ?? "#3454D1";

  return (
    <div
      style={
        {
          "--brand": brandColor,
          "--tenant-primary": "var(--brand)",
        } as React.CSSProperties
      }
      className={`${fontDisplay.variable} ${fontBody.variable} min-h-full font-body`}
    >
      <header className="border-b border-border bg-white px-6 py-4">
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
              style={{ backgroundColor: "var(--brand)" }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <span className="font-display text-lg font-semibold text-ink">
            {tenant.name}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
