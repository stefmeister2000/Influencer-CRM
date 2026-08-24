"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCampaignAction } from "@/app/actions/campaigns";

export function DeleteCampaignButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn-ghost px-2 py-1 text-xs text-red-600"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete campaign "${name}"? Its influencers stay in your list.`)) {
          start(async () => { await deleteCampaignAction(id); router.refresh(); });
        }
      }}
    >
      Delete
    </button>
  );
}
