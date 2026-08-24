"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { parseCsv, csvRowToProfile, toCsv, EXPORT_COLUMNS } from "@/lib/csv";
import { upsertInfluencer, listInfluencers } from "@/lib/services/influencers";
import { recordImport } from "@/lib/services/lookups";
import type { DuplicateStrategy } from "@/lib/services/duplicates";
import type { FilterParams } from "@/lib/types";

export interface ImportResult {
  total: number; inserted: number; updated: number; skipped: number; errors: string[];
}

export async function importCsvAction(
  csvText: string, opts: { campaignId?: string | null; strategy?: DuplicateStrategy } = {},
): Promise<ImportResult> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");

  const rows = parseCsv(csvText);
  const result: ImportResult = { total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    try {
      const profile = csvRowToProfile(rows[i]);
      if (!profile) { result.skipped++; result.errors.push(`Row ${i + 2}: missing username`); continue; }
      const { outcome } = upsertInfluencer(ctx, profile, {
        campaignId: opts.campaignId ?? null, strategy: opts.strategy ?? "skip", status: "needs_review",
      });
      if (outcome === "inserted") result.inserted++;
      else if (outcome === "updated") result.updated++;
      else result.skipped++;
    } catch (e: any) {
      result.skipped++;
      result.errors.push(`Row ${i + 2}: ${e.message}`);
    }
  }

  recordImport(ctx, { campaignId: opts.campaignId ?? null, ...result });
  revalidatePath("/influencers");
  revalidatePath("/review");
  return result;
}

export async function exportCsvAction(filters: FilterParams = {}): Promise<string> {
  const ctx = requireSession();
  let all: any[] = [];
  let page = 1;
  while (true) {
    const { rows } = listInfluencers(ctx.teamId, { ...filters, page });
    if (!rows.length) break;
    all = all.concat(rows);
    if (rows.length < 25) break;
    page++;
    if (page > 400) break;
  }
  return toCsv(all, EXPORT_COLUMNS);
}
