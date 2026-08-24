"use client";

import { useState, useTransition } from "react";
import { runDiscoveryAction } from "@/app/actions/campaigns";

export function RunDiscoveryButton({ campaignId }: { campaignId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await runDiscoveryAction(campaignId);
          setResult(`Found ${r.found}, added ${r.inserted}, skipped ${r.skipped}`);
        })}
      >
        {pending ? "Running…" : "Run discovery"}
      </button>
      {result && <span className="text-xs text-ink-500">{result}</span>}
    </div>
  );
}
