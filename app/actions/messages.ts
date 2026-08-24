"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  generateAndSave, setMessageState, editMessageBody,
  getMessageById, saveBody, deleteMessage,
} from "@/lib/services/messages";
import { setStatus } from "@/lib/services/influencers";
import { logEvent } from "@/lib/services/audit";
import { tuneMessage } from "@/lib/ai/messageGenerator";
import type { MessageKind, MessageState } from "@/lib/types";

/** Ask AI to tune the message per a freeform instruction, then save it in place. */
export async function tuneMessageAction(messageId: string, instruction: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const msg = getMessageById(ctx.teamId, messageId);
  const { getBusinessContext } = await import("@/lib/services/business");
  const tuned = await tuneMessage({ body: msg.body, instruction, businessContext: getBusinessContext(ctx.teamId) });
  const saved = saveBody(
    ctx, messageId, tuned.body, tuned.compliance.passed,
    tuned.compliance.issues.join("; ") || null,
  );
  logEvent({ teamId: ctx.teamId, influencerId: msg.influencer_id, actorId: ctx.userId, type: "message_edited", detail: `Tuned: ${instruction.slice(0, 80)}` });
  revalidatePath("/send-queue");
  revalidatePath(`/influencers/${msg.influencer_id}`);
  return { body: saved.body };
}

/** Manually save an edited body (keeps it sendable). */
export async function saveMessageBodyAction(messageId: string, body: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const msg = getMessageById(ctx.teamId, messageId);
  const { checkCompliance } = await import("@/lib/ai/compliance");
  const c = checkCompliance(body);
  saveBody(ctx, messageId, body, c.passed, c.issues.join("; ") || null);
  revalidatePath("/send-queue");
  revalidatePath(`/influencers/${msg.influencer_id}`);
}

/** Delete a message AND auto-decline that influencer (changed your mind). */
export async function deleteMessageAction(messageId: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const msg = getMessageById(ctx.teamId, messageId);
  deleteMessage(ctx, messageId);
  setStatus(ctx, msg.influencer_id, { status: "rejected", outreach_status: "closed" });
  logEvent({ teamId: ctx.teamId, influencerId: msg.influencer_id, actorId: ctx.userId, type: "rejected", detail: "Declined (message deleted)" });
  revalidatePath("/send-queue");
  revalidatePath("/influencers");
  revalidatePath("/pipeline");
}

export async function generateMessageAction(
  influencerId: string, kind: MessageKind, language?: string,
) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const msg = await generateAndSave(ctx, { influencerId, kind, language });
  revalidatePath(`/influencers/${influencerId}`);
  revalidatePath("/send-queue");
  return msg;
}

export async function approveMessageAction(messageId: string, influencerId: string) {
  const ctx = requireSession();
  if (!can.approveMessages(ctx.role)) throw new Error("Not allowed");
  setMessageState(ctx, messageId, "approved_to_send");
  setStatus(ctx, influencerId, { outreach_status: "approved_to_send" });
  logEvent({ teamId: ctx.teamId, influencerId, actorId: ctx.userId, type: "approved_for_outreach" });
  revalidatePath("/send-queue");
  revalidatePath(`/influencers/${influencerId}`);
}

export async function setMessageStateAction(messageId: string, state: MessageState) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  setMessageState(ctx, messageId, state);
  revalidatePath("/send-queue");
}

export async function editMessageAction(messageId: string, body: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const msg = editMessageBody(ctx, messageId, body);
  revalidatePath(`/influencers/${msg.influencer_id}`);
  revalidatePath("/send-queue");
  return msg;
}

export async function markSentAction(messageId: string, influencerId: string) {
  const ctx = requireSession();
  if (!can.updateStatus(ctx.role)) throw new Error("Not allowed");
  setMessageState(ctx, messageId, "sent");
  setStatus(ctx, influencerId, { status: "contacted", outreach_status: "sent" });
  logEvent({ teamId: ctx.teamId, influencerId, actorId: ctx.userId, type: "marked_sent" });
  revalidatePath("/send-queue");
  revalidatePath(`/influencers/${influencerId}`);
}

export async function markRepliedAction(messageId: string, influencerId: string) {
  const ctx = requireSession();
  if (!can.updateStatus(ctx.role)) throw new Error("Not allowed");
  setMessageState(ctx, messageId, "replied");
  setStatus(ctx, influencerId, { status: "responded", outreach_status: "replied" });
  logEvent({ teamId: ctx.teamId, influencerId, actorId: ctx.userId, type: "reply_received" });
  revalidatePath("/send-queue");
  revalidatePath(`/influencers/${influencerId}`);
}
