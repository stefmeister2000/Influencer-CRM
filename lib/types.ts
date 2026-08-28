// Domain types shared across server actions, services, AI modules and UI.

export type UserRole = "admin" | "sales_manager" | "outreach_assistant" | "viewer";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export type InfluencerStatus =
  | "new" | "needs_review" | "approved" | "rejected" | "contacted"
  | "responded" | "interested" | "negotiating" | "onboarded"
  | "not_interested" | "deleted";

export type OutreachStatus =
  | "not_ready" | "message_generated" | "approved_to_send" | "sent"
  | "replied" | "follow_up_needed" | "closed";

export type AffiliateStatus =
  | "not_affiliate" | "invited" | "signed_up" | "active" | "inactive";

export type MessageKind =
  | "friendly" | "premium" | "direct" | "less_salesy" | "dutch" | "english"
  | "short_dm" | "long_email" | "whatsapp" | "follow_up_1" | "follow_up_2"
  | "thank_you" | "rejection_reply" | "negotiation_reply";

export type MessageState =
  | "generated" | "approved_to_send" | "do_not_send" | "needs_edit"
  | "sent" | "replied" | "follow_up_needed";

export type SourceKind = "manual" | "csv" | "instagram_graph" | "provider";

export type CreatorPlatform = "instagram" | "tiktok";

export type ProductFocus =
  | "hair_loss" | "mens_health" | "weight_loss" | "wellness" | string;

export interface Campaign {
  id: string;
  team_id: string;
  name: string;
  country: string | null;
  city: string | null;
  target_category: string | null;
  product_focus: ProductFocus | null;
  search_prompt: string | null;
  parsed_filters: DiscoveryFilters | null;
  brand_voice: string | null;
  outreach_goal: string | null;
  affiliate_payout: number | null;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Influencer {
  id: string;
  team_id: string;
  campaign_id: string | null;
  /** The creator's handle (without @). Named for legacy reasons; see `platform`. */
  instagram_username: string;
  platform: CreatorPlatform;
  profile_url: string | null;
  full_name: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  follower_count: number | null;
  following_count: number | null;
  post_count: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  engagement_rate: number | null;
  country: string | null;
  city: string | null;
  language: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  category: string | null;
  subcategory: string | null;
  gender_focus: string | null;
  audience_type: string | null;
  estimated_audience_country: string | null;
  product_fit: string | null;
  brand_fit_score: number | null;
  engagement_score: number | null;
  quality_score: number | null;
  risk_score: number | null;
  final_score: number | null;
  status: InfluencerStatus;
  outreach_status: OutreachStatus;
  affiliate_status: AffiliateStatus;
  ai_recommendation: string | null;
  ai_reasoning: string | null;
  best_product_angle: string | null;
  best_message_style: string | null;
  risk_warning: string | null;
  notes: string | null;
  source: SourceKind;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Message {
  id: string;
  team_id: string;
  influencer_id: string;
  campaign_id: string | null;
  kind: MessageKind;
  language: string;
  channel: string;
  body: string;
  state: MessageState;
  compliance_passed: boolean | null;
  compliance_notes: string | null;
  edited_by_human: boolean;
  created_at: string;
  sent_at: string | null;
}

/** Structured output of the AI prompt parser. */
export interface DiscoveryFilters {
  country: string;
  cities: string[];
  /** Friendly target locations chosen in the wizard, e.g. "Ghent", "Netherlands". */
  regions?: string[];
  /** Which platforms to search, e.g. ["instagram","tiktok"]. */
  platforms?: CreatorPlatform[];
  categories: string[];
  product_focus: ProductFocus;
  follower_min: number;
  follower_max: number;
  languages: string[];
  gender_focus?: "male" | "female" | "any";
  engagement_expectation?: string;
  excluded_niches?: string[];
  keywords?: string[];
  bio_keywords?: string[];
  hashtags?: string[];
  profile_types?: string[];
  content_style?: string;
  brand_fit?: string;
  risk_level?: string;
  exclude?: string[];
  message_angle: string;
}

/** Output of the AI scoring + quality check. */
export interface ScoringResult {
  brand_fit_score: number;
  engagement_score: number;
  quality_score: number;
  risk_score: number;
  final_score: number;
  product_fit: string;
  recommendation: "yes" | "no" | "maybe";
  reasoning: string;
  best_product_angle: string;
  best_message_style: MessageKind;
  risk_warning?: string;
  suggested_categories: string[];
}

export interface FilterParams {
  q?: string;
  view?: "review" | "approved" | "rejected" | "all";
  platform?: string;
  country?: string;
  city?: string;
  category?: string;
  product_focus?: string;
  status?: InfluencerStatus;
  outreach_status?: OutreachStatus;
  affiliate_status?: AffiliateStatus;
  language?: string;
  campaign_id?: string;
  source?: SourceKind;
  follower_min?: number;
  follower_max?: number;
  score_min?: number;
  score_max?: number;
  sort?: string;
  page?: number;
}
