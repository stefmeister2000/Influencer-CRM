export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Short display label for a creator's platform, e.g. for compact table badges. */
export function platformShortLabel(platform?: string | null): string {
  if (/tik/i.test(platform ?? "")) return "TikTok";
  if (/you\s*tube|^yt$/i.test(platform ?? "")) return "YouTube";
  return "IG";
}

/** Full display label for a creator's platform. */
export function platformFullLabel(platform?: string | null): string {
  if (/tik/i.test(platform ?? "")) return "TikTok";
  if (/you\s*tube|^yt$/i.test(platform ?? "")) return "YouTube";
  return "Instagram";
}

/** Public profile URL for a creator on their platform. */
export function platformProfileUrl(platform: string | null | undefined, handle: string): string {
  const clean = handle.replace(/^@/, "");
  if (/tik/i.test(platform ?? "")) return `https://www.tiktok.com/@${clean}`;
  if (/you\s*tube|^yt$/i.test(platform ?? "")) return `https://www.youtube.com/@${clean}`;
  return `https://instagram.com/${clean}`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(1) + "%";
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "bg-slate-100 text-slate-500";
  if (score >= 75) return "bg-emerald-100 text-emerald-800";
  if (score >= 50) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  return name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
}

export function profileUrlFromUsername(username: string): string {
  return `https://instagram.com/${normalizeUsername(username)}`;
}
