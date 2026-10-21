"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Projets" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/now", label: "Now & stories" },
  { href: "/admin/settings", label: "Réglages" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${active ? "bg-surface text-ink shadow-[var(--card-shadow)]" : "text-muted hover:text-ink"}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
