import { askText, aiConfigured } from "./anthropic";
import { checkCompliance, type ComplianceResult } from "./compliance";
import type { Campaign, Influencer, MessageKind } from "../types";

// Business-agnostic outreach system prompt. The specific business is injected
// at call time via `businessContext`.
const SYSTEM_BASE = `You are an outreach assistant. You write personalized direct
messages and emails to Instagram influencers/creators on behalf of the business
described below. Use ONLY the business context and the creator's data - never
invent facts, products, claims, guarantees, or offers. Keep it human, concise,
premium and non-salesy. No emojis, no hype, no pressure. Mention the business
naturally. If a partnership offer is provided, state it clearly. Personalize to
the creator's visible niche, content style, location or audience. If information
is thin, write a safe but still human message.

Output ONLY the message text - no subject line unless it's a long email, no
preamble, no quotes around it.`;

function systemFor(businessContext?: string): string {
  return businessContext ? `${SYSTEM_BASE}\n\n--- BUSINESS CONTEXT ---\n${summarizeBusinessContext(businessContext)}` : SYSTEM_BASE;
}

const KIND_GUIDANCE: Record<MessageKind, string> = {
  friendly: "Warm, human, conversational opener.",
  premium: "Polished, premium, selective-feeling tone.",
  direct: "Short and to the point. Lead with the offer.",
  less_salesy: "Soft, no pitch energy. Curiosity over selling.",
  dutch: "Write the entire message in natural, friendly Dutch (Flemish-friendly).",
  english: "Write in clean, simple English.",
  short_dm: "Max 3 short sentences. Instagram DM length.",
  long_email: "Email format with a one-line subject (prefix 'Subject:') then body.",
  whatsapp: "Casual WhatsApp tone, 2-4 short lines.",
  follow_up_1: "Brief, no-reply follow-up. Reference the original idea, add value.",
  follow_up_2: "Final, polite follow-up. Mention selectivity and the offer once.",
  thank_you: "Short thank-you after they replied; promise clear details next.",
  rejection_reply: "Gracious reply to a soft no; leave the door open, no pressure.",
  negotiation_reply: "Professional reply opening terms; flexible, still premium.",
};

export interface GenerateOpts {
  influencer: Pick<Influencer,
    "instagram_username" | "full_name" | "bio" | "category" | "country" | "city" |
    "language" | "best_product_angle" | "follower_count" | "audience_type">;
  campaign?: Pick<Campaign, "product_focus" | "brand_voice" | "outreach_goal" |
    "affiliate_payout" | "name"> | null;
  kind: MessageKind;
  language?: string;
  customAngle?: string;
  businessContext?: string;
}

export interface GeneratedMessage {
  body: string;
  kind: MessageKind;
  language: string;
  compliance: ComplianceResult;
}

/**
 * Controls whether new outreach scripts spend AI tokens.
 *
 * Default: template-first to keep Anthropic costs predictable.
 * Set OUTREACH_MESSAGE_MODE=ai to restore automatic Claude generation.
 * Set OUTREACH_MESSAGE_MODE=off/template to force templates even with an API key.
 */
function shouldUseAIForNewMessages(): boolean {
  const mode = (process.env.OUTREACH_MESSAGE_MODE || process.env.MESSAGE_GENERATION_MODE || "template")
    .toLowerCase().trim();
  return aiConfigured() && ["ai", "claude", "anthropic"].includes(mode);
}

export async function generateMessage(opts: GenerateOpts): Promise<GeneratedMessage> {
  const { influencer, kind } = opts;
  const language =
    opts.language || (kind === "dutch" ? "Dutch" : influencer.language || "English");
  const name =
    influencer.full_name?.split(" ")[0] || influencer.instagram_username || "there";

  const draft = shouldUseAIForNewMessages()
    ? await generateWithAI({ ...opts, language, name })
    : templateMessage({ ...opts, language, name });

  const body = ensureCompliantTemplate(draft, { ...opts, language, name });
  return { body, kind, language, compliance: checkCompliance(body) };
}

async function generateWithAI(
  o: GenerateOpts & { language: string; name: string },
): Promise<string> {
  const { influencer: i, campaign, kind } = o;
  const offer = campaign?.affiliate_payout
    ? `Payout per confirmed referral: ${campaign.affiliate_payout} (with a personal tracking link).`
    : "Use the partnership offer from the business context, if any.";

  const user = `
Write a ${kind.replace(/_/g, " ")} outreach message.
Style guidance: ${KIND_GUIDANCE[kind]}
Language: ${o.language}

Creator:
- Name/handle: ${i.full_name ?? ""} (@${i.instagram_username})
- Niche/category: ${i.category ?? "unknown"}
- Bio: ${i.bio ?? "(none)"}
- Location: ${[i.city, i.country].filter(Boolean).join(", ") || "unknown"}
- Audience: ${i.audience_type ?? "unknown"}
- Followers: ${i.follower_count ?? "unknown"}

Campaign:
- Outreach goal: ${campaign?.outreach_goal ?? "partnership / collaboration"}
- Angle: ${o.customAngle ?? i.best_product_angle ?? "a strong fit for their audience"}
- ${offer}
${campaign?.brand_voice ? `- Extra voice notes: ${campaign.brand_voice}` : ""}

Address them as "${o.name}".`.trim();

  const system = systemFor(o.businessContext);
  let body = await askText({ system, user, maxTokens: 360 });

  const check = checkCompliance(body);
  if (!check.passed) {
    body = await askText({
      system,
      user: `Rewrite this message to fix these compliance issues: ${check.issues.join("; ")}.\nKeep it natural and on-brand.\n\n---\n${body}`,
      maxTokens: 320,
    });
  }
  return body;
}

/**
 * Tune an existing message per a freeform instruction (e.g. "make it shorter",
 * "more casual", "mention their barbershop"). Keeps it on-brand + compliant.
 * This remains AI-powered because it is an explicit human request, not an
 * automatic cost on every generated script.
 */
export async function tuneMessage(args: {
  body: string;
  instruction: string;
  businessContext?: string;
}): Promise<GeneratedMessage> {
  if (!aiConfigured()) {
    return { body: args.body, kind: "friendly", language: "English", compliance: checkCompliance(args.body) };
  }
  const system = systemFor(args.businessContext);
  const user =
    `Rewrite the outreach message below according to this instruction, keeping it ` +
    `personal, human and on-brand. Keep what works; only change what the instruction asks.\n\n` +
    `Instruction: ${args.instruction}\n\n---\nMessage:\n${args.body}`;

  let body = await askText({ system, user, maxTokens: 360 });
  const check = checkCompliance(body);
  if (!check.passed) {
    body = await askText({
      system,
      user: `Rewrite this to fix these compliance issues: ${check.issues.join("; ")}.\nKeep it natural and on-brand.\n\n---\n${body}`,
      maxTokens: 320,
    });
  }
  return { body, kind: "friendly", language: "English", compliance: checkCompliance(body) };
}

function templateMessage(o: GenerateOpts & { language: string; name: string }): string {
  const lang = o.language.toLowerCase();
  if (lang.includes("dutch") || o.kind === "dutch") return dutchTemplate(o);
  if (o.kind === "long_email") return emailTemplate(o);
  if (o.kind === "whatsapp") return whatsappTemplate(o);
  if (o.kind === "follow_up_1") return followUpTemplate(o, false);
  if (o.kind === "follow_up_2") return followUpTemplate(o, true);
  if (o.kind === "thank_you") return `Thanks ${o.name}, appreciate the reply. I can send a few clear details so you can see if it feels like a fit.`;
  if (o.kind === "rejection_reply") return `Thanks ${o.name}, totally understand. Appreciate you taking a look - happy to reconnect if it ever feels more relevant.`;
  if (o.kind === "negotiation_reply") return `Thanks ${o.name}. Open to discussing what would make sense for both sides. I can share the collaboration details and we can align from there.`;
  if (o.kind === "direct" || o.kind === "short_dm") return shortTemplate(o);
  if (o.kind === "premium") return premiumTemplate(o);
  if (o.kind === "less_salesy") return softTemplate(o);
  return friendlyTemplate(o);
}

function friendlyTemplate(o: GenerateOpts & { language: string; name: string }): string {
  return `Hey ${o.name}, I liked the ${niche(o)} content you're building. ${brandLine(o)} I think there could be a natural partnership fit for your audience. Would you be open to taking a look?`;
}

function premiumTemplate(o: GenerateOpts & { language: string; name: string }): string {
  return `Hi ${o.name}, I came across your ${niche(o)} content and liked the quality of what you're building. ${brandLine(o)} We're being selective with creators and I think your audience could be a strong fit. Open to a quick look at the collaboration?`;
}

function softTemplate(o: GenerateOpts & { language: string; name: string }): string {
  return `Hey ${o.name}, really liked your ${niche(o)} content. ${brandLine(o)} No hard pitch - I just thought there might be a good audience fit and wanted to ask if you're open to hearing the idea.`;
}

function shortTemplate(o: GenerateOpts & { language: string; name: string }): string {
  return `Hey ${o.name}, liked your ${niche(o)} content. ${brandLine(o)} Would you be open to a simple collaboration idea?`;
}

function whatsappTemplate(o: GenerateOpts & { language: string; name: string }): string {
  return `Hi ${o.name}, I liked your ${niche(o)} content.\n${brandLine(o)}\nWould you be open to hearing a collaboration idea?`;
}

function emailTemplate(o: GenerateOpts & { language: string; name: string }): string {
  return `Subject: Collaboration idea\n\nHi ${o.name},\n\nI came across your ${niche(o)} content and liked the way you connect with your audience. ${brandLine(o)}\n\nI think there could be a natural partnership fit, especially around ${angle(o)}. Would you be open to taking a look at the collaboration details?\n\nBest,`;
}

function dutchTemplate(o: GenerateOpts & { language: string; name: string }): string {
  return `Hey ${o.name}, ik vond je content rond ${niche(o)} sterk. ${brandLine(o, true)} Ik denk dat er een natuurlijke match kan zijn met je publiek. Sta je ervoor open om kort de samenwerking te bekijken?`;
}

function followUpTemplate(o: GenerateOpts & { language: string; name: string }, finalFollowUp: boolean): string {
  if (finalFollowUp) {
    return `Hi ${o.name}, just wanted to close the loop. I still think there could be a good fit, but no pressure at all. Happy to send details if useful.`;
  }
  return `Hi ${o.name}, quick follow-up on the collaboration idea. I thought it could fit your ${niche(o)} audience well. Open to seeing the details?`;
}

function niche(o: GenerateOpts): string {
  return clean(o.influencer.category) || clean(o.influencer.audience_type) || "content";
}

function angle(o: GenerateOpts): string {
  return clean(o.customAngle) || clean(o.influencer.best_product_angle) || clean(o.campaign?.outreach_goal) || "a relevant partnership angle";
}

function brandLine(o: GenerateOpts, dutch = false): string {
  const product = clean(o.campaign?.product_focus);
  const goal = clean(o.campaign?.outreach_goal);
  const offer = o.campaign?.affiliate_payout
    ? (dutch
      ? `We werken met een persoonlijke tracking link en een vergoeding per bevestigde referral.`
      : `We work with a personal tracking link and a payout per confirmed referral.`)
    : "";

  if (dutch) {
    if (product && offer) return `We zoeken passende creators voor ${product}. ${offer}`;
    if (product) return `We zoeken passende creators voor ${product}.`;
    if (goal) return `We werken aan ${goal}.`;
    return "We bouwen aan een partnershipprogramma met zorgvuldig gekozen creators.";
  }

  if (product && offer) return `We're looking for aligned creators around ${product}. ${offer}`;
  if (product) return `We're looking for aligned creators around ${product}.`;
  if (goal) return `We're working on ${goal}.`;
  return "We're building a creator partnership program with carefully selected profiles.";
}

function clean(value?: string | number | null): string {
  if (value == null) return "";
  return String(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function ensureCompliantTemplate(body: string, o: GenerateOpts & { language: string; name: string }): string {
  const check = checkCompliance(body);
  if (check.passed) return body;
  return o.language.toLowerCase().includes("dutch") ? dutchTemplate({ ...o, kind: "dutch" }) : shortTemplate({ ...o, kind: "short_dm" });
}

function summarizeBusinessContext(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join("\n")
    .slice(0, 1600);
}
