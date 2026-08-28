import type {
  InfluencerStatus, OutreachStatus, AffiliateStatus, MessageKind, UserRole,
} from "./types";

export const PRODUCTS = [
  { value: "hair_loss", label: "Hair loss" },
  { value: "mens_health", label: "Men's health" },
  { value: "weight_loss", label: "Weight loss" },
  { value: "wellness", label: "Wellness" },
] as const;

export const INFLUENCER_STATUSES: InfluencerStatus[] = [
  "new","needs_review","approved","rejected","contacted","responded",
  "interested","negotiating","onboarded","not_interested","deleted",
];

export const OUTREACH_STATUSES: OutreachStatus[] = [
  "not_ready","message_generated","approved_to_send","sent","replied",
  "follow_up_needed","closed",
];

export const AFFILIATE_STATUSES: AffiliateStatus[] = [
  "not_affiliate","invited","signed_up","active","inactive",
];

export const MESSAGE_KINDS: { value: MessageKind; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "premium", label: "Premium" },
  { value: "direct", label: "Direct" },
  { value: "less_salesy", label: "Less salesy" },
  { value: "dutch", label: "Dutch" },
  { value: "english", label: "English" },
  { value: "short_dm", label: "Short DM" },
  { value: "long_email", label: "Long email" },
  { value: "whatsapp", label: "WhatsApp style" },
  { value: "follow_up_1", label: "Follow-up 1" },
  { value: "follow_up_2", label: "Follow-up 2" },
  { value: "thank_you", label: "Thank you" },
  { value: "rejection_reply", label: "Rejection reply" },
  { value: "negotiation_reply", label: "Negotiation reply" },
];

// The essential pipeline stages only.
export const KANBAN_COLUMNS: { status: InfluencerStatus; title: string }[] = [
  { status: "approved", title: "Approved" },
  { status: "contacted", title: "Sent" },
  { status: "onboarded", title: "Onboarded" },
];

// Status badge color tokens (tailwind utility groups)
export const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  needs_review: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  contacted: "bg-brand-100 text-brand-700",
  responded: "bg-indigo-100 text-indigo-700",
  interested: "bg-teal-100 text-teal-700",
  negotiating: "bg-purple-100 text-purple-700",
  onboarded: "bg-green-100 text-green-800",
  not_interested: "bg-slate-100 text-slate-500",
  deleted: "bg-red-50 text-red-400",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  sales_manager: "Sales manager",
  outreach_assistant: "Outreach assistant",
  viewer: "Viewer",
};

export const DEFAULT_AFFILIATE_PAYOUT = 0; // EUR per confirmed booking (set per campaign)
export const PAGE_SIZE = 25;

/**
 * Fallback brand voice, only used if a team has no business profile set.
 * The real voice comes from Settings → Business profile (getBusinessContext).
 */
export const DEFAULT_BRAND_VOICE = `
Write like a real person on behalf of the business: warm, concise, specific and
human. No emojis, no hype, no fake compliments, no pressure, no long paragraphs.
Make only claims supported by the business context.
`.trim();
