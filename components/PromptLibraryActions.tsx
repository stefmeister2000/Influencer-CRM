"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regeneratePromptLibraryAction } from "@/app/actions/templates";

export function GeneratePromptLibrary({
  hasLibrary,
  businessConfigured,
}: {
  hasLibrary: boolean;
  businessConfigured: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run() {
    setError(null);
    start(async () => {
      try {
        await regeneratePromptLibraryAction();
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to generate the prompt library");
      }
    });
  }

  if (!businessConfigured) {
    return (
      <a href="/settings" className="btn-primary">Set up business profile</a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={run} disabled={pending} className={hasLibrary ? "btn-ghost" : "btn-primary"}>
        {pending
          ? "Building from your business…"
          : hasLibrary ? "Regenerate from business" : "Generate from my business"}
      </button>
      {error && <p className="text-xs text-red-600 max-w-xs text-right">{error}</p>}
    </div>
  );
}
