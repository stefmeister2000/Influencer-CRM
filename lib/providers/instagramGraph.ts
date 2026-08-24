import type { DiscoveryFilters } from "../types";
import { normalizeProfileData, type NormalizedProfile, type ProfileProvider, type RecentPost } from "./types";

/**
 * Instagram Graph API / Business Discovery provider — COMPLIANT placeholder.
 *
 * The official Business Discovery endpoint only returns data for PUBLIC
 * professional (Business/Creator) accounts, and only when you have an approved
 * Facebook App + a connected IG Business account. It does NOT support free-text
 * "find creators near me" search — discovery is by known username or hashtag.
 *
 * This class wires the real endpoints behind the standard ProfileProvider
 * interface. It NEVER scrapes, logs in, or bypasses rate limits. Where the
 * platform genuinely cannot provide a capability (e.g. arbitrary search), it
 * returns empty rather than faking data — the UI then falls back to manual/CSV.
 *
 * Endpoint reference (v19.0):
 *   GET /{ig-business-id}?fields=business_discovery.username({user}){...}
 */
export class InstagramGraphProvider implements ProfileProvider {
  readonly name = "instagram_graph";
  private token = process.env.IG_GRAPH_ACCESS_TOKEN;
  private businessId = process.env.IG_GRAPH_BUSINESS_ACCOUNT_ID;
  private base = "https://graph.facebook.com/v19.0";

  private configured() {
    return Boolean(this.token && this.businessId);
  }

  /**
   * Business Discovery has no general search. We treat `filters.keywords` as a
   * list of candidate usernames/hashtag handles supplied by the operator, and
   * enrich each. Returns [] when not configured.
   */
  async searchProfiles(filters: DiscoveryFilters, limit = 50): Promise<NormalizedProfile[]> {
    if (!this.configured()) return [];
    const candidates = (filters.keywords ?? [])
      .map((k) => k.replace(/^@/, "").trim())
      .filter(Boolean)
      .slice(0, limit);
    const results: NormalizedProfile[] = [];
    for (const username of candidates) {
      const p = await this.enrichProfile(username);
      if (p) results.push(p);
    }
    return results;
  }

  async enrichProfile(username: string): Promise<NormalizedProfile | null> {
    if (!this.configured()) return null;
    const fields =
      `business_discovery.username(${username})` +
      `{username,name,biography,profile_picture_url,followers_count,follows_count,` +
      `media_count,website,media.limit(12){like_count,comments_count,caption,timestamp,media_url}}`;
    const url = `${this.base}/${this.businessId}?fields=${encodeURIComponent(fields)}&access_token=${this.token}`;

    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const bd = json?.business_discovery;
    if (!bd) return null;

    const media: any[] = bd.media?.data ?? [];
    const avg = (key: string) =>
      media.length ? media.reduce((s, m) => s + (m[key] ?? 0), 0) / media.length : undefined;

    return normalizeProfileData({
      instagram_username: bd.username,
      full_name: bd.name ?? null,
      bio: bd.biography ?? null,
      profile_picture_url: bd.profile_picture_url ?? null,
      follower_count: bd.followers_count ?? null,
      following_count: bd.follows_count ?? null,
      post_count: bd.media_count ?? null,
      website: bd.website ?? null,
      avg_likes: avg("like_count") ?? null,
      avg_comments: avg("comments_count") ?? null,
      source: "instagram_graph",
    });
  }

  async fetchRecentPosts(username: string, limit = 12): Promise<RecentPost[]> {
    if (!this.configured()) return [];
    const fields =
      `business_discovery.username(${username})` +
      `{media.limit(${limit}){id,caption,like_count,comments_count,media_url,timestamp}}`;
    const url = `${this.base}/${this.businessId}?fields=${encodeURIComponent(fields)}&access_token=${this.token}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.business_discovery?.media?.data ?? []).map((m: any) => ({
      id: m.id,
      caption: m.caption,
      like_count: m.like_count,
      comment_count: m.comments_count,
      media_url: m.media_url,
      timestamp: m.timestamp,
    }));
  }

  async fetchBasicMetrics(username: string): Promise<Partial<NormalizedProfile>> {
    const p = await this.enrichProfile(username);
    if (!p) return {};
    const { follower_count, following_count, post_count, engagement_rate } = p;
    return { follower_count, following_count, post_count, engagement_rate };
  }
}
