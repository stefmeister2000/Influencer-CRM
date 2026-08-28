import type { DiscoveryFilters, Influencer } from "../types";

/** A normalized profile shape every provider must emit. */
export type NormalizedProfile = Partial<Influencer> & {
  instagram_username: string;
};

export interface RecentPost {
  id: string;
  caption?: string;
  like_count?: number;
  comment_count?: number;
  media_url?: string;
  timestamp?: string;
}

/**
 * The single interface all discovery sources implement. This keeps the rest of
 * the app agnostic about WHERE profiles come from (manual, CSV, Graph API,
 * approved provider) and guarantees compliant, normalized output.
 */
export interface ProfileProvider {
  readonly name: string;
  /** Discover candidate profiles for a set of filters. */
  searchProfiles(filters: DiscoveryFilters, limit?: number, businessContext?: string): Promise<NormalizedProfile[]>;
  /** Enrich a single profile with metrics/bio where permitted. */
  enrichProfile(username: string): Promise<NormalizedProfile | null>;
  /** Fetch recent public posts (engagement signals). */
  fetchRecentPosts(username: string, limit?: number): Promise<RecentPost[]>;
  /** Basic metrics only. */
  fetchBasicMetrics(username: string): Promise<Partial<NormalizedProfile>>;
}

/** Normalize a raw profile: clean the handle, set platform + a canonical URL. */
export function normalizeProfileData(p: NormalizedProfile): NormalizedProfile {
  const out = { ...p };
  out.instagram_username = out.instagram_username.trim().replace(/^@/, "").toLowerCase();
  out.platform = /tik\s*tok|tiktok|^tt$/i.test(String(out.platform ?? "")) ? "tiktok" : "instagram";
  if (!out.profile_url) {
    out.profile_url = out.platform === "tiktok"
      ? `https://www.tiktok.com/@${out.instagram_username}`
      : `https://instagram.com/${out.instagram_username}`;
  }
  if (out.engagement_rate == null && out.follower_count && (out.avg_likes || out.avg_comments)) {
    out.engagement_rate =
      (((out.avg_likes ?? 0) + (out.avg_comments ?? 0)) / out.follower_count) * 100;
  }
  return out;
}
