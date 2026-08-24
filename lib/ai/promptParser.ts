import { askJSON, aiConfigured } from "./anthropic";
import type { DiscoveryFilters } from "../types";

const SYSTEM_BASE = `You are a discovery analyst for a business doing influencer
outreach. Convert a recruiter's natural-language request for Instagram creators
into structured search filters that fit the business (described below) and the
request.

Return JSON with EXACTLY these keys:
{
  "country": string,
  "cities": string[],
  "categories": string[],          // creator niches, e.g. barber, fitness, lifestyle, beauty
  "product_focus": string,         // the business's product/service this targets
  "follower_min": number,
  "follower_max": number,
  "languages": string[],
  "gender_focus": "male"|"female"|"any",
  "engagement_expectation": string,
  "excluded_niches": string[],
  "keywords": string[],
  "bio_keywords": string[],
  "hashtags": string[],
  "profile_types": string[],
  "content_style": string,
  "brand_fit": string,
  "risk_level": string,
  "exclude": string[],             // e.g. celebrities, fake engagement, explicit content
  "message_angle": string          // the core outreach angle for THIS business
}
Infer sensible defaults from the business's market and the prompt. Never invent
named individuals. Keep arrays concise.`;

const FALLBACK: DiscoveryFilters = {
  country: "",
  cities: [],
  categories: ["lifestyle"],
  product_focus: "",
  follower_min: 5000,
  follower_max: 100000,
  languages: ["English"],
  gender_focus: "any",
  exclude: ["celebrities", "fake engagement", "explicit content"],
  message_angle: "a strong partnership fit",
};

/** Parse a discovery prompt into structured filters, tailored to the business. */
export async function parsePrompt(prompt: string, businessContext?: string): Promise<DiscoveryFilters> {
  if (!aiConfigured()) return { ...FALLBACK };

  const system = businessContext
    ? `${SYSTEM_BASE}\n\n--- BUSINESS CONTEXT ---\n${businessContext}`
    : SYSTEM_BASE;

  const parsed = await askJSON<DiscoveryFilters>({ system, user: prompt, maxTokens: 900 });
  return {
    ...FALLBACK,
    ...parsed,
    follower_min: Number(parsed.follower_min) || FALLBACK.follower_min,
    follower_max: Number(parsed.follower_max) || FALLBACK.follower_max,
    categories: parsed.categories?.length ? parsed.categories : FALLBACK.categories,
  };
}
