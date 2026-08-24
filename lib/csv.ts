import type { NormalizedProfile } from "./providers/types";
import { normalizeProfileData } from "./providers/types";

/** Minimal, dependency-free RFC-4180-ish CSV parser (handles quotes + commas). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1)
    .filter((r) => r.some((v) => v.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? "").trim()])));
}

const numOrNull = (v?: string) => {
  if (!v) return null;
  const n = Number(v.replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Map a CSV row (per the documented import columns) to a normalized profile. */
export function csvRowToProfile(row: Record<string, string>): NormalizedProfile | null {
  const username = (row.username || row.instagram_username || "").trim();
  if (!username) return null;
  return normalizeProfileData({
    instagram_username: username,
    profile_url: row.profile_url || null,
    full_name: row.full_name || null,
    bio: row.bio || null,
    follower_count: numOrNull(row.follower_count),
    following_count: numOrNull(row.following_count),
    post_count: numOrNull(row.post_count),
    engagement_rate: numOrNull(row.engagement_rate),
    country: row.country || null,
    city: row.city || null,
    email: row.email || null,
    whatsapp: row.whatsapp || null,
    category: row.category || null,
    notes: row.notes || null,
    source: "csv",
  });
}

/** Serialize rows to a CSV string for export. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return head + "\n" + body;
}

export const EXPORT_COLUMNS = [
  "instagram_username", "full_name", "profile_url", "follower_count",
  "engagement_rate", "country", "city", "language", "category", "email",
  "whatsapp", "product_fit", "final_score", "status", "outreach_status",
  "affiliate_status", "created_at",
];
