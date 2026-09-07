"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchCompanyAction } from "@/app/actions/team";

/** Shown in the Topbar only while a platform admin is viewing a company that isn't their own. */
export function CompanySwitchBanner({ companyName }: { companyName: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <span className="badge bg-amber-50 text-amber-700 border border-amber-200 gap-1.5">
      Viewing: {companyName}
      <button
        type="button"
        className="underline hover:no-underline disabled:opacity-50"
        disabled={pending}
        onClick={() => start(async () => { await switchCompanyAction(null); router.refresh(); })}
      >
        {pending ? "Switching…" : "Back to my company"}
      </button>
    </span>
  );
}
