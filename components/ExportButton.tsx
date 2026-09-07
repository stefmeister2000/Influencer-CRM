"use client";

import { useState, useTransition } from "react";
import { exportCsvAction } from "@/app/actions/import-export";
import type { FilterParams } from "@/lib/types";

export function ExportButton({ filters, label = "Export CSV" }: {
  filters?: FilterParams; label?: string;
}) {
  const [pending, start] = useTransition();
  const [count, setCount] = useState<number | null>(null);

  return (
    <div className="inline-flex items-center gap-2">
      <button className="btn-ghost" disabled={pending}
        onClick={() => start(async () => {
          setCount(null);
          const { csv, count } = await exportCsvAction(filters ?? {});
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          const stamp = new Date().toISOString().slice(0, 10);
          a.href = url;
          a.download = `influencers-export-${stamp}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          setCount(count);
        })}>
        {pending ? "Exporting…" : label}
      </button>
      {count !== null && (
        <span className="text-xs text-ink-500">
          {count > 0 ? `${count} row${count === 1 ? "" : "s"} exported` : "Nothing matched — nothing to export"}
        </span>
      )}
    </div>
  );
}
