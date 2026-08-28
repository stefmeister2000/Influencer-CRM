import { askJSON, aiConfigured } from "./anthropic";
import type { BusinessProfile } from "../services/business";

export interface TemplateSeed {
  name: string;    // short label
  prompt: string;  // natural-language discovery request
  product: string; // the business product/service this outreach promotes
  angle: string;   // core outreach angle for this business
}

const SYSTEM = `You design a STARTER LIBRARY of reusable Instagram-creator DISCOVERY
prompts for ONE specific business (described below). Each prompt is something an
outreach recruiter would type to find creators to partner with.

Return JSON with EXACTLY this shape:
{
  "templates": [
    { "name": string, "prompt": string, "product": string, "angle": string }
  ]
}

Rules:
- 6 to 9 templates.
- "name": a short label, 2-5 words (e.g. "Local fitness coaches").
- "prompt": 1-3 sentences — who to find, which niches, location, follower range,
  engagement expectation, and what to avoid. Written in plain recruiter language.
- "product": the business's product/service this particular outreach promotes.
- "angle": the core outreach angle for this business and this segment.
- Cover a spread: the core niche, 1-2 adjacent niches whose audiences overlap,
  micro / UGC-style everyday voices, a local-market focus, and any obvious
  partner types for this business (e.g. complementary businesses, professionals).
- Tailor everything to the business's market, audience and offer. Never invent
  named individuals or specific handles.`;

export async function generatePromptLibrary(
  business: BusinessProfile,
  businessContext: string,
): Promise<TemplateSeed[]> {
  if (!aiConfigured()) return fallbackLibrary(business);
  try {
    const r = await askJSON<{ templates: TemplateSeed[] }>({
      system: `${SYSTEM}\n\n--- BUSINESS ---\n${businessContext}`,
      user: "Generate the starter discovery prompt library for this business.",
      maxTokens: 1800,
    });
    const items = (r.templates ?? [])
      .filter((t) => t && t.name && t.prompt)
      .slice(0, 12)
      .map((t) => ({
        name: String(t.name).trim().slice(0, 60),
        prompt: String(t.prompt).trim().slice(0, 600),
        product: String(t.product ?? "").trim().slice(0, 90),
        angle: String(t.angle ?? "").trim().slice(0, 140),
      }));
    return items.length ? items : fallbackLibrary(business);
  } catch {
    return fallbackLibrary(business);
  }
}

/** No-AI fallback: build a handful of prompts straight from the profile fields. */
function fallbackLibrary(b: BusinessProfile): TemplateSeed[] {
  const loc = b.location?.trim() || "your target market";
  const locWord = b.location?.trim() || "local";
  const what = b.description?.trim() || b.name?.trim() || "the business";
  const product = b.offer?.trim() || b.description?.trim().slice(0, 80) || "partnership";
  const angle = `authentic partnership fit with ${b.name?.trim() || "the brand"}`;

  return [
    {
      name: "Core niche creators",
      prompt: `Find ${locWord} Instagram creators whose content and audience closely match ${what}. 5k–100k followers, strong genuine engagement, not celebrities.`,
      product, angle,
    },
    {
      name: "Micro & UGC voices",
      prompt: `Find relatable micro-creators and UGC-style accounts in ${loc} who casually talk about topics related to ${what}. 1k–30k followers, high trust with their audience.`,
      product, angle,
    },
    {
      name: "Adjacent niches",
      prompt: `Find ${locWord} creators in niches adjacent to ${what} whose followers would still be interested. 5k–100k followers, clean aesthetic, authentic engagement.`,
      product, angle,
    },
    {
      name: "Local market focus",
      prompt: `Find creators based specifically in ${loc} with a strong local audience relevant to ${what}. 5k–80k followers, real engagement, not celebrities.`,
      product, angle,
    },
    {
      name: "Lifestyle & everyday",
      prompt: `Find ${locWord} lifestyle creators covering daily life, routines and recommendations whose audience overlaps with ${what}. 5k–100k followers.`,
      product, angle,
    },
    {
      name: "Complementary businesses",
      prompt: `Find owners, coaches or professionals in ${loc} whose business complements ${what} and who are open to partnerships. Authentic following, 3k–80k followers.`,
      product, angle,
    },
  ];
}
