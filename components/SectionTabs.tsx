"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/discovery", label: "New discovery" },
];

export function SectionTabs() {
  const path = usePathname();
  return (
    <div className="flex gap-1 mb-4">
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href}
            className={"text-sm px-3.5 py-1.5 rounded-lg border transition " +
              (active
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-ink-600 border-slate-200 hover:bg-slate-50")}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
