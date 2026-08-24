"use client";

import { useState } from "react";

/** Copy the @handle and open the Instagram profile — for fast manual outreach. */
export function HandleActions({ username, size = "sm" }: { username: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);
  const clean = username.replace(/^@/, "");
  const pad = size === "md" ? "px-2 py-1" : "px-1.5 py-0.5";

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        title="Copy @handle"
        className={`rounded border border-slate-200 ${pad} text-xs text-ink-600 hover:bg-slate-50`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.writeText("@" + clean);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={`https://instagram.com/${clean}`}
        target="_blank"
        rel="noreferrer"
        title="Open profile on Instagram"
        onClick={(e) => e.stopPropagation()}
        className={`rounded border border-slate-200 ${pad} text-xs text-ink-600 hover:bg-slate-50`}
      >
        IG ↗
      </a>
    </span>
  );
}
