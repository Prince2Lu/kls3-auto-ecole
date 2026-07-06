"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Vue d'ensemble", match: (p: string) => p === "/" },
  {
    href: "/eleves",
    label: "Élèves",
    match: (p: string) => p.startsWith("/eleves"),
  },
  {
    href: "/parametres",
    label: "Paramètres",
    match: (p: string) => p === "/parametres",
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
            style={
              isActive
                ? ({ borderLeft: "3px solid var(--tenant-primary)" } as React.CSSProperties)
                : undefined
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
