import type { DiscoveryFilters, Influencer } from "../types";

export interface RuleScores {
  brand_fit_score: number;
  engagement_score: number;
  quality_score: number;
  risk_score: number;
  final_score: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Deterministic baseline scorer. Cheap, explainable, and used as the floor that
 * the AI scorer adjusts. Works even with no API key configured.
 */
export function ruleBasedScore(
  inf: Partial<Influencer>,
  filters?: DiscoveryFilters | null,
): RuleScores {
  const followers = inf.follower_count ?? 0;
  const er = inf.engagement_rate ?? estimateEngagement(inf);

  // --- Engagement score: best around 2-8%, penalize 0 and absurd (>20%, fake) ---
  let engagement = 0;
  if (er > 0) {
    if (er >= 2 && er <= 8) engagement = 90;
    else if (er > 8 && er <= 20) engagement = 70;
    else if (er > 20) engagement = 35; // likely inflated/fake
    else engagement = clamp(er * 30); // <2%
  }

  // --- Follower quality: sweet spot 5k–100k (micro/mid), penalize tiny & mega ---
  let quality = 40;
  if (followers >= 5000 && followers <= 100000) quality = 85;
  else if (followers > 100000 && followers <= 300000) quality = 60;
  else if (followers > 300000) quality = 35; // celebrity, expensive/less reachable
  else if (followers >= 1000) quality = 55;
  if (inf.email || inf.whatsapp) quality += 8; // reachable
  if (inf.bio && inf.bio.length > 20) quality += 5;
  quality = clamp(quality);

  // --- Brand fit: country/city/category/product alignment with filters ---
  let fit = 45;
  if (filters) {
    if (matchCountry(inf.country, filters.country)) fit += 18;
    if (inf.city && filters.cities?.some((c) => eq(c, inf.city))) fit += 12;
    if (matchCategory(inf, filters.categories)) fit += 18;
    if (inf.language && filters.languages?.some((l) => eq(l, inf.language))) fit += 7;
    if (filters.gender_focus && filters.gender_focus !== "any" &&
        eq(inf.gender_focus, filters.gender_focus)) fit += 5;
  } else {
    if (eq(inf.country, "UAE") || eq(inf.country, "United Arab Emirates")) fit += 20;
  }
  fit = clamp(fit);

  // --- Risk: higher = worse. Mega-followers, no contact, fake engagement, missing data ---
  let risk = 10;
  if (followers > 500000) risk += 30;       // celebrity / expensive
  if (er > 20) risk += 30;                   // fake engagement signal
  if (!inf.email && !inf.whatsapp) risk += 10;
  if (!inf.country) risk += 10;
  if (filters?.exclude?.some((x) => containsAny(inf.bio, x))) risk += 25;
  risk = clamp(risk);

  // --- Final: weighted blend, risk subtracts ---
  const final = clamp(
    fit * 0.35 + engagement * 0.25 + quality * 0.25 + (100 - risk) * 0.15,
  );

  return {
    brand_fit_score: fit,
    engagement_score: engagement,
    quality_score: quality,
    risk_score: risk,
    final_score: final,
  };
}

function estimateEngagement(inf: Partial<Influencer>): number {
  const f = inf.follower_count ?? 0;
  const likes = inf.avg_likes ?? 0;
  const comments = inf.avg_comments ?? 0;
  if (!f || (!likes && !comments)) return 0;
  return ((likes + comments) / f) * 100;
}

const eq = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

function matchCountry(c?: string | null, target?: string) {
  if (!c || !target) return false;
  const norm = (s: string) =>
    s.toLowerCase().replace("united arab emirates", "uae").trim();
  return norm(c) === norm(target);
}

function matchCategory(inf: Partial<Influencer>, cats?: string[]) {
  if (!cats?.length) return false;
  const hay = `${inf.category ?? ""} ${inf.subcategory ?? ""} ${inf.bio ?? ""}`.toLowerCase();
  return cats.some((c) => hay.includes(c.toLowerCase()));
}

function containsAny(bio?: string | null, term?: string) {
  if (!bio || !term) return false;
  return bio.toLowerCase().includes(term.toLowerCase());
}
