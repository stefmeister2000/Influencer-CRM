import { logout } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { SessionContext } from "@/lib/auth";
import { Avatar } from "./ui";

export function Topbar({ session, businessName }: { session: SessionContext; businessName: string }) {
  return (
    <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-5">
      <div className="text-sm text-ink-500 truncate">
        {businessName} · influencer outreach
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-ink-900 leading-tight">
            {session.fullName ?? session.email}
          </div>
          <div className="text-xs text-ink-500">{ROLE_LABELS[session.role]}</div>
        </div>
        <Avatar name={session.fullName ?? session.email} size={32} />
        <form action={logout}>
          <button className="btn-ghost text-xs py-1.5">Sign out</button>
        </form>
      </div>
    </header>
  );
}
