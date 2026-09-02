import { getSetting, setSetting } from "./settings";

export const BUSINESS_KEY = "business_profile";
export const DISCOVERY_KNOWLEDGE_KEY = "discovery_knowledge";

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

/**
 * A plain-text description of the business, injected into every AI prompt
 * (discovery, scoring, message generation, prompt library) so outreach and
 * targeting stay locked to THIS business and niche.
 */
export function getBusinessContext(teamId: string): string {
  const p = getBusinessProfile(teamId);
  const knowledge = getKnowledge(teamId);
  if (!p.name && !p.description && !p.website) {
    return "No business profile is set yet. Write safe, generic, professional content and do not invent specific claims, products, or offers.";
  }
  return [
    `BUSINESS: ${p.name || "(unnamed)"}`,
    p.website ? `Website: ${p.website}` : "",
    p.instagram ? `Instagram: ${p.instagram.replace(/^@/, "")}` : "",
    p.description ? `What they do / product / audience: ${p.description}` : "",
    p.location ? `Target market / location: ${p.location}` : "",
    p.offer ? `Partnership / affiliate offer: ${p.offer}` : "",
    p.voice ? `Voice / tone: ${p.voice}` : "Voice / tone: premium, human, concise, trustworthy, non-salesy.",
    knowledge.trim() ? `Additional knowledge (niche, past learnings, specifics to favor):\n${knowledge.trim()}` : "",
    "Use ONLY these facts. Do not invent products, claims, medical statements, guarantees, or offers not listed here.",
  ].filter(Boolean).join("\n");
}
