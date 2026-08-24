import type { DiscoveryFilters } from "../types";
import { InstagramGraphProvider } from "./instagramGraph";
import { AiDiscoveryProvider } from "./aiDiscovery";
import type { NormalizedProfile, ProfileProvider, RecentPost } from "./types";

/**
 * Default provider. Performs no automated discovery (returns []), reflecting the
 * compliant manual/CSV-first workflow. Single-profile enrich/metrics are
 * delegated to the Graph provider when credentials exist, so manual adds can be
 * optionally enriched for public professional accounts.
 */
export class ManualProvider implements ProfileProvider {
  readonly name = "manual";
  private graph = new InstagramGraphProvider();

  async searchProfiles(_f: DiscoveryFilters): Promise<NormalizedProfile[]> {
    return [];
  }
  async enrichProfile(username: string): Promise<NormalizedProfile | null> {
    return this.graph.enrichProfile(username);
  }
  async fetchRecentPosts(username: string, limit?: number): Promise<RecentPost[]> {
    return this.graph.fetchRecentPosts(username, limit);
  }
  async fetchBasicMetrics(username: string): Promise<Partial<NormalizedProfile>> {
    return this.graph.fetchBasicMetrics(username);
  }
}

/** Provider selector — driven by env, swappable per deployment. */
export function getProvider(): ProfileProvider {
  switch (process.env.DISCOVERY_PROVIDER) {
    case "instagram_graph":
      return new InstagramGraphProvider();
    case "ai":
      return new AiDiscoveryProvider();
    case "manual":
    case "csv":
      return new ManualProvider();
    default:
      // Default to AI discovery when an Anthropic key is present, else manual.
      return process.env.ANTHROPIC_API_KEY ? new AiDiscoveryProvider() : new ManualProvider();
  }
}
