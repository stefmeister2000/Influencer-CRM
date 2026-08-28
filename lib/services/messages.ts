import { db, uid, nowIso, insertRow, updateRow } from "../db";
import { mapMessage, mapCampaign } from "../db/map";
import type { Message, MessageKind, MessageState } from "../types";
import { generateMessage } from "../ai/messageGenerator";
import { getInfluencer } from "./influencers";
import { getBusinessContext } from "./business";
import { logEvent } from "./audit";

interface Ctx { teamId: string; userId: string; }

/** Generate + persist a personalized message for an influencer. */
export async function generateAndSave(
  ctx: Ctx,
  args: { influencerId: string; kind: MessageKind; language?: string; customAngle?: string },
): Promise<Message> {
  const inf = getInfluencer(ctx.teamId, args.influencerId);
  let campaign = null;
  if (inf.campaign_id) {
    const row = db.prepare("select * from campaigns where id = ? and team_id = ?")
      .get(inf.campaign_id, ctx.teamId) as any;
    campaign = row ? mapCampaign(row) : null;
  }

  const gen = await generateMessage({
    influencer: inf, campaign, kind: args.kind,
    language: args.language, customAngle: args.customAngle,
    businessContext: getBusinessContext(ctx.teamId),
  });

  const channel = args.kind === "long_email" ? "email"
    : args.kind === "whatsapp" ? "whatsapp" : "instagram_dm";

  const id = uid();
  insertRow("messages", {
    id,
    team_id: ctx.teamId,
    influencer_id: args.influencerId,
    campaign_id: inf.campaign_id ?? null,
    kind: args.kind,
    language: gen.language,
    channel,
    body: gen.body,
    state: "generated",
    compliance_passed: gen.compliance.passed ? 1 : 0,
    compliance_notes: gen.compliance.issues.join("; ") || null,
    edited_by_human: 0,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  // Advance influencer to message_generated if it was idle.
  db.prepare(
    "update influencers set outreach_status = 'message_generated', updated_by = ?, updated_at = ? where id = ? and team_id = ? and outreach_status = 'not_ready'",
  ).run(ctx.userId, nowIso(), args.influencerId, ctx.teamId);

  logEvent({
    teamId: ctx.teamId, influencerId: args.influencerId, actorId: ctx.userId,
    type: "message_generated", detail: `Generated ${args.kind} message`,
    metadata: { compliance_passed: gen.compliance.passed },
  });
  return getMessage(ctx.teamId, id);
}

function getMessage(teamId: string, id: string): Message {
  return mapMessage(db.prepare("select * from messages where id = ? and team_id = ?").get(id, teamId));
}

export function getMessageById(teamId: string, id: string): Message {
  const m = getMessage(teamId, id);
  if (!m) throw new Error("Message not found");
  return m;
}

/** Update body without downgrading the message state (used by AI tuning). */
export function saveBody(
  ctx: Ctx, id: string, body: string, compliancePassed: boolean, complianceNotes: string | null,
) {
  updateRow("messages", id, ctx.teamId, {
    body, compliance_passed: compliancePassed ? 1 : 0, compliance_notes: complianceNotes,
    edited_by_human: 1, updated_by: ctx.userId, updated_at: nowIso(),
  });
  return getMessage(ctx.teamId, id);
}

export function deleteMessage(ctx: Ctx, id: string) {
  updateRow("messages", id, ctx.teamId, { deleted_at: nowIso(), updated_by: ctx.userId });
}

export function listMessages(teamId: string, influencerId: string): Message[] {
  const rows = db.prepare(
    "select * from messages where team_id = ? and influencer_id = ? and deleted_at is null order by created_at desc",
  ).all(teamId, influencerId) as any[];
  return rows.map(mapMessage);
}

export function setMessageState(ctx: Ctx, messageId: string, state: MessageState) {
  const patch: Record<string, unknown> = { state, updated_by: ctx.userId, updated_at: nowIso() };
  if (state === "sent") patch.sent_at = nowIso();
  updateRow("messages", messageId, ctx.teamId, patch);
  return getMessage(ctx.teamId, messageId);
}

export function editMessageBody(ctx: Ctx, messageId: string, body: string) {
  updateRow("messages", messageId, ctx.teamId,
    { body, edited_by_human: 1, state: "needs_edit", updated_by: ctx.userId, updated_at: nowIso() });
  const msg = getMessage(ctx.teamId, messageId);
  logEvent({ teamId: ctx.teamId, influencerId: msg.influencer_id, actorId: ctx.userId, type: "message_edited" });
  return msg;
}

const TO_SEND_STATES = ["approved_to_send", "needs_edit", "generated"];
const SENT_STATES = ["sent", "replied", "follow_up_needed"];

/** Messages for the outreach view, filtered by a set of states. */
export function sendQueue(teamId: string, states: string[] = TO_SEND_STATES) {
  const placeholders = states.map(() => "?").join(",");
  const rows = db.prepare(
    `select m.*,
            i.id as inf_id, i.instagram_username, i.platform, i.full_name, i.profile_picture_url,
            i.country, i.city, i.whatsapp, i.email
     from messages m
     join influencers i on i.id = m.influencer_id
     where m.team_id = ? and m.deleted_at is null
       and m.state in (${placeholders})
     order by m.created_at desc`,
  ).all(teamId, ...states) as any[];

  return rows.map((r) => ({
    ...mapMessage(r),
    influencer: {
      id: r.inf_id, instagram_username: r.instagram_username, platform: r.platform,
      full_name: r.full_name, profile_picture_url: r.profile_picture_url,
      country: r.country, city: r.city, whatsapp: r.whatsapp, email: r.email,
    },
  }));
}

export { SENT_STATES };
