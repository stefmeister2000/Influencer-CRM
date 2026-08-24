import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL, aiConfigured, askJSON } from "../ai/anthropic";
import type { DiscoveryFilters } from "../types";
import { normalizeProfileData, type NormalizedProfile, type ProfileProvider, type RecentPost } from "./types";
import { InstagramGraphProvider } from "./instagramGraph";

/**
 * AI-powered discovery. Two robust steps:
 *   1) Claude + web search RESEARCHES real public creators (free-form text).
 *   2) A second plain Claude call STRUCTURES that research into clean JSON.
 * Splitting research from formatting avoids the truncation/format flakiness of
 * asking a single search call to also emit a large perfect JSON array.
 *
 * Compliance note: this does not scrape Instagram, log in, or bypass anything —
 * it searches the public web for creators who are publicly discoverable, and
 * every result lands in the human review queue for verification. Follower counts
 * and details are AI estimates and MUST be confirmed before outreach.
 */
export class AiDiscoveryProvider implements ProfileProvider {
  readonly name = "ai";
  private graph = new InstagramGraphProvider();

  async searchProfiles(
    filters: DiscoveryFilters, limit = 40, businessContext?: string,
  ): Promise<NormalizedProfile[]> {
    if (!aiConfigured()) return [];
    const want = Math.min(limit, 40);

    const researchSystem = `You are an influencer researcher for a business
(described below). Find REAL Instagram creators who would be a good fit for this
business's outreach and the brief.

${businessContext ? `--- BUSINESS CONTEXT ---\n${businessContext}\n\n` : ""}Use the web search tool aggressively to find REAL, currently-active, PUBLIC
Instagram creators that match the brief. Run SEVERAL searches — go niche by niche
and place by place (e.g. "<city> <niche> instagram", "top <market> <niche>
influencers", creator/agency lists, blog roundups). Only include people/pages you
are reasonably confident genuinely exist and are public — never invent usernames.
Prefer authentic micro/mid creators in the requested follower range, in the
business's target market, and respect exclusions.

Be thorough — list as MANY qualifying real creators as you can find (aim for
${want}+). For each: @handle, name, city, niche, rough follower estimate, language,
and a short reason they fit.`;

    const runResearch = async (extra: string): Promise<string> => {
      try {
        const res = await anthropic().messages.create({
          model: MODEL,
          max_tokens: 8000,
          system: researchSystem,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 } as any],
          messages: [{ role: "user", content: this.briefFromFilters(filters, want) + extra }],
        });
        return this.extractText(res);
      } catch {
        return "";
      }
    };

    // Two passes for breadth: a second pass explicitly asks for DIFFERENT creators.
    const research1 = await runResearch("");
    const research2 = await runResearch(
      "\n\nThis is a SECOND pass — find as many ADDITIONAL different real creators " +
      "as possible that a first pass would likely miss (smaller accounts, other " +
      "cities, Arabic-first creators, adjacent niches). Avoid repeating obvious big names.",
    );
    const research = [research1, research2].filter(Boolean).join("\n\n---\n\n");
    if (!research || !/@?\w/.test(research)) return [];

    // --- Structure the combined research into clean JSON ---
    let parsed: { creators?: any[] };
    try {
      parsed = await askJSON<{ creators: any[] }>({
        system:
          `Extract ALL the Instagram creators mentioned in the research into JSON. ` +
          `De-duplicate by handle. Only include creators with a real-looking @handle ` +
          `that actually appears in the text. Return an object: {"creators":[{` +
          `"instagram_username","full_name","city","category","estimated_followers",` +
          `"language","why"}]}. estimated_followers is a number (convert "25k" to 25000). ` +
          `Omit anyone without a handle. Include as many as are present.`,
        user: research,
        maxTokens: 8000,
      });
    } catch {
      return [];
    }

    const items = Array.isArray(parsed?.creators) ? parsed.creators : [];
    const seen = new Set<string>();
    return items
      .filter((it) => it && typeof it.instagram_username === "string")
      .filter((it) => {
        const u = String(it.instagram_username).replace(/^@/, "").toLowerCase().trim();
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return true;
      })
      .slice(0, want)
      .map((it) =>
        normalizeProfileData({
          instagram_username: String(it.instagram_username).replace(/^@/, "").trim(),
          full_name: it.full_name ?? null,
          city: it.city ?? null,
          country: filters.country ?? "UAE",
          category: it.category ?? null,
          language: it.language ?? null,
          follower_count: this.toNum(it.estimated_followers),
          bio: it.why ?? null,
          source: "provider",
        }),
      )
      .filter((p) => p.instagram_username.length > 0 && p.instagram_username !== "handle");
  }

  // Single-profile enrich/metrics fall back to the Graph API if configured.
  async enrichProfile(username: string): Promise<NormalizedProfile | null> {
    return this.graph.enrichProfile(username);
  }
  async fetchRecentPosts(username: string, limit?: number): Promise<RecentPost[]> {
    return this.graph.fetchRecentPosts(username, limit);
  }
  async fetchBasicMetrics(username: string): Promise<Partial<NormalizedProfile>> {
    return this.graph.fetchBasicMetrics(username);
  }

  private briefFromFilters(f: DiscoveryFilters, want: number): string {
    return [
      `Find up to ${want} real public Instagram creators.`,
      `Country: ${f.country || "UAE"}`,
      f.cities?.length ? `Cities: ${f.cities.join(", ")}` : "",
      f.categories?.length ? `Niches/categories: ${f.categories.join(", ")}` : "",
      `Follower range: ${f.follower_min ?? 1000}–${f.follower_max ?? 100000}`,
      f.languages?.length ? `Languages: ${f.languages.join(", ")}` : "",
      f.gender_focus && f.gender_focus !== "any" ? `Gender focus: ${f.gender_focus}` : "",
      (f.exclude ?? f.excluded_niches)?.length
        ? `Exclude: ${(f.exclude ?? f.excluded_niches)!.join(", ")}`
        : "",
      f.message_angle ? `Outreach angle: ${f.message_angle}` : "",
      `\nList up to ${want} creators.`,
    ].filter(Boolean).join("\n");
  }

  private extractText(res: Anthropic.Message): string {
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }

  private toNum(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v === "number") return Math.round(v);
    const s = String(v).toLowerCase().replace(/[, ]/g, "");
    const m = s.match(/([\d.]+)\s*([km])?/);
    if (!m) return null;
    let n = parseFloat(m[1]);
    if (m[2] === "k") n *= 1000;
    if (m[2] === "m") n *= 1_000_000;
    return Math.round(n);
  }
}
