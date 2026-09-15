"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  // Its own accent (violet) — it's a different kind of work (content creation)
  // from the rest of the influencer-CRM flow, so it should read as distinct
  // at a glance in the nav, not just another item in the same blue family.
  { href: "/content", label: "Organic content", icon: "✎", accent: "violet" as const },
  { href: "/campaigns", label: "Discovery & campaigns", icon: "✦" },
  { href: "/influencers", label: "Influencers", icon: "☷" },
  { href: "/send-queue", label: "Send & outreach", icon: "➤" },
  { href: "/pipeline", label: "Pipeline", icon: "⠿" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar({ businessName, isPlatformAdmin }: { businessName: string; isPlatformAdmin?: boolean }) {
  const path = usePathname();
  const initial = businessName.trim().charAt(0).toUpperCase() || "•";
  const nav = isPlatformAdmin
    ? [...NAV, { href: "/companies", label: "Companies", icon: "◈" }]
    : NAV;
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 hidden md:flex flex-col">
      <div className="px-5 py-4 flex items-center gap-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">{initial}</div>
        <div className="font-semibold text-ink-900 truncate">{businessName}</div>
      </div>
      <nav className="p-2 flex-1 overflow-y-auto">
        {nav.map((item) => {
          let active = path === item.href || path.startsWith(item.href + "/");
          // The "Discovery & campaigns" item covers both routes.
          if (item.href === "/campaigns" && path.startsWith("/discovery")) active = true;
          const isAccent = "accent" in item && item.accent === "violet";
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition",
                active
                  ? (isAccent ? "bg-violet-50 text-violet-700 font-medium" : "bg-brand-50 text-brand-700 font-medium")
                  : (isAccent ? "text-violet-600 hover:bg-violet-50/60" : "text-ink-700 hover:bg-slate-50"),
              )}>
              <span className={cn("w-4 text-center", isAccent ? "opacity-90" : "opacity-70")}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-[11px] text-ink-500 border-t border-slate-100">
        Compliant outreach · human review required
      </div>
    </aside>
  );
}
