"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { runDiscoveryAction } from "@/app/actions/campaigns";

export function RunDiscoveryButton({ campaignId }: { campaignId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pending) {
      setElapsed(0);
      timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [pending]);

  function run() {
    setError(null);
    setResult(null);
    start(async () => {
      try {
        const r = await runDiscoveryAction(campaignId);
        setResult(`Found ${r.found}, added ${r.inserted}, skipped ${r.skipped}`);
      } catch (e: any) {
        setError(e?.message ?? "Discovery failed — try again.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button className="btn-primary" disabled={pending} onClick={run}>
        {pending ? `Running… (${elapsed}s)` : "Run discovery"}
      </button>
      {pending && (
        <span className="text-xs text-ink-500">
          Searching + scoring real creators — usually 30–90s.
        </span>
      )}
      {result && <span className="text-xs text-ink-500">{result}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
