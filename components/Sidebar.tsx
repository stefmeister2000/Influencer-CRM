"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/content", label: "Organic content", icon: "✎" },
  { href: "/campaigns", label: "Discovery & campaigns", icon: "✦" },
  { href: "/influencers", label: "Influencers", icon: "☷" },
  { href: "/send-queue", label: "Send & outreach", icon: "➤" },
  { href: "/pipeline", label: "Pipeline", icon: "⠿" },
  { href: "/templates", label: "Prompt library", icon: "❏" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white h-screen sticky top-0 hidden md:flex flex-col">
      <div className="px-5 py-4 flex items-center gap-2 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white grid place-items-center font-bold">O</div>
        <div className="font-semibold text-ink-900">ORVION CRM</div>
      </div>
      <nav className="p-2 flex-1 overflow-y-auto">
        {NAV.map((item) => {
          let active = path === item.href || path.startsWith(item.href + "/");
          // The "Discovery & campaigns" item covers both routes.
          if (item.href === "/campaigns" && path.startsWith("/discovery")) active = true;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition",
                active ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-700 hover:bg-slate-50",
              )}>
              <span className="w-4 text-center opacity-70">{item.icon}</span>
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
