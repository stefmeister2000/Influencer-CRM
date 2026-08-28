import { askText, aiConfigured } from "./anthropic";
import { checkCompliance, type ComplianceResult } from "./compliance";
import type { Campaign, Influencer, MessageKind } from "../types";

// Business-agnostic outreach system prompt. The specific business is injected
// at call time via `businessContext`.
const SYSTEM_BASE = `You are an outreach assistant. You write personalized direct
messages and emails to Instagram influencers/creators on behalf of the business
described below. Use ONLY the business context and the creator's data — never
invent facts, products, claims, guarantees, or offers. Keep it human, concise,
premium and non-salesy. No emojis, no hype, no pressure. Mention the business
naturally. If a partnership offer is provided, state it clearly. Personalize to
the creator's visible niche, content style, location or audience. If information
is thin, write a safe but still human message.

Output ONLY the message text — no subject line unless it's a long email, no
preamble, no quotes around it.`;

function systemFor(businessContext?: string): string {
  return businessContext ? `${SYSTEM_BASE}\n\n--- BUSINESS CONTEXT ---\n${businessContext}` : SYSTEM_BASE;
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

export async function generateMessage(opts: GenerateOpts): Promise<GeneratedMessage> {
  const { influencer, kind } = opts;
  const language =
    opts.language || (kind === "dutch" ? "Dutch" : influencer.language || "English");
  const name =
    influencer.full_name?.split(" ")[0] || influencer.instagram_username || "there";

  const body = aiConfigured()
    ? await generateWithAI({ ...opts, language, name })
    : fallbackMessage({ ...opts, language, name });

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
  let body = await askText({ system, user, maxTokens: 500 });

  const check = checkCompliance(body);
  if (!check.passed) {
    body = await askText({
      system,
      user: `Rewrite this message to fix these compliance issues: ${check.issues.join("; ")}.\nKeep it natural and on-brand.\n\n---\n${body}`,
      maxTokens: 500,
    });
  }
  return body;
}

/**
 * Tune an existing message per a freeform instruction (e.g. "make it shorter",
 * "more casual", "mention their barbershop"). Keeps it on-brand + compliant.
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

  let body = await askText({ system, user, maxTokens: 500 });
  const check = checkCompliance(body);
  if (!check.passed) {
    body = await askText({
      system,
      user: `Rewrite this to fix these compliance issues: ${check.issues.join("; ")}.\nKeep it natural and on-brand.\n\n---\n${body}`,
      maxTokens: 500,
    });
  }
  return { body, kind: "friendly", language: "English", compliance: checkCompliance(body) };
}

/** Safe template used when no API key is set — still personalized + compliant. */
function fallbackMessage(o: GenerateOpts & { language: string; name: string }): string {
  const niche = o.influencer.category || "content";
  return `Hey ${o.name}, really like the ${niche} you're building. We're reaching out about a partnership that could be a strong fit for your audience. Would you be open to taking a look?`;
}
