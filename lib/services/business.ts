import { getSetting, setSetting } from "./settings";
import { db } from "../db";

export const BUSINESS_KEY = "business_profile";
export const DISCOVERY_KNOWLEDGE_KEY = "discovery_knowledge";
export const THEME_COLOR_KEY = "theme_color";

export interface BusinessProfile {
  name: string;
  website: string;
  instagram: string;
  description: string;   // what they do / product / target customer
  location: string;      // target market, e.g. "UAE" or "Global / US"
  offer: string;         // partnership/affiliate terms
  voice: string;         // tone notes (optional)
}

interface Ctx { teamId: string; userId: string; }

const EMPTY: BusinessProfile = {
  name: "", website: "", instagram: "", description: "", location: "", offer: "", voice: "",
};

export function getBusinessProfile(teamId: string): BusinessProfile {
  return { ...EMPTY, ...(getSetting<BusinessProfile>(teamId, BUSINESS_KEY) ?? {}) };
}

export function saveBusinessProfile(ctx: Ctx, p: BusinessProfile) {
  setSetting(ctx, BUSINESS_KEY, p);
}

export function isBusinessConfigured(teamId: string): boolean {
  const p = getBusinessProfile(teamId);
  return Boolean(p.name && (p.description || p.website));
}

/** Free-form, ever-growing notes about the business/niche — editable any time in Settings. */
export function getKnowledge(teamId: string): string {
  return getSetting<{ text: string }>(teamId, DISCOVERY_KNOWLEDGE_KEY)?.text ?? "";
}

export function saveKnowledge(ctx: Ctx, text: string) {
  setSetting(ctx, DISCOVERY_KNOWLEDGE_KEY, { text });
}

/** Per-team brand color (hex). Null means "use the app default" — see lib/theme.ts. */
export function getThemeColor(teamId: string): string | null {
  return getSetting<{ hex: string }>(teamId, THEME_COLOR_KEY)?.hex ?? null;
}

export function saveThemeColor(ctx: Ctx, hex: string | null) {
  setSetting(ctx, THEME_COLOR_KEY, { hex: hex || null });
}

/**
 * Recent, explained creator declines — a human explicitly said why a creator
 * wasn't a fit. Feeds into getBusinessContext so discovery/scoring learn to
 * avoid recommending or scoring highly similar profiles in the future.
 */
export function getRecentDeclineReasons(teamId: string, limit = 15): string[] {
  const rows = db.prepare(
    `select detail from outreach_events
     where team_id = ? and type = 'declined_with_reason' and detail is not null and trim(detail) != ''
     order by created_at desc limit ?`,
  ).all(teamId, limit) as { detail: string }[];
  return rows.map((r) => r.detail.trim());
}

/**
 * A plain-text description of the business, injected into every AI prompt
 * (discovery, scoring, message generation) so outreach and targeting stay
 * locked to THIS business and niche.
 */
export function getBusinessContext(teamId: string): string {
  const p = getBusinessProfile(teamId);
  const knowledge = getKnowledge(teamId);
  if (!p.name && !p.description && !p.website) {
    return "No business profile is set yet. Write safe, generic, professional content and do not invent specific claims, products, or offers.";
  }
  const declineReasons = getRecentDeclineReasons(teamId);
  return [
    `BUSINESS: ${p.name || "(unnamed)"}`,
    p.website ? `Website: ${p.website}` : "",
    p.instagram ? `Instagram: ${p.instagram.replace(/^@/, "")}` : "",
    p.description ? `What they do / product / audience: ${p.description}` : "",
    p.location ? `Target market / location: ${p.location}` : "",
    p.offer ? `Partnership / affiliate offer: ${p.offer}` : "",
    p.voice ? `Voice / tone: ${p.voice}` : "Voice / tone: premium, human, concise, trustworthy, non-salesy.",
    knowledge.trim() ? `Additional knowledge (niche, past learnings, specifics to favor):\n${knowledge.trim()}` : "",
    declineReasons.length
      ? `Creators this team has declined before, and why (avoid recommending or scoring highly similar profiles):\n${declineReasons.map((r) => `- ${r}`).join("\n")}`
      : "",
    "Use ONLY these facts. Do not invent products, claims, medical statements, guarantees, or offers not listed here.",
  ].filter(Boolean).join("\n");
}
