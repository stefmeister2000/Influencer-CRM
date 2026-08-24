"use client";

import { useTransition } from "react";
import { exportCsvAction } from "@/app/actions/import-export";
import type { FilterParams } from "@/lib/types";

export function ExportButton({ filters, label = "Export CSV" }: {
  filters?: FilterParams; label?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-ghost" disabled={pending}
      onClick={() => start(async () => {
        const csv = await exportCsvAction(filters ?? {});
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orvion-influencers-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })}>
      {pending ? "Exporting…" : label}
    </button>
  );
}
