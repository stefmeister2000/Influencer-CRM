"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { generateScript, translateToDutch, type ScriptFormat } from "@/lib/ai/scriptWriter";
import {
  saveScript, getScript, setScriptStatus, updateScriptBody, deleteScript,
  recentScripts, type ScriptStatus,
} from "@/lib/services/scripts";
import { getSetting, setSetting, CONTENT_KNOWLEDGE_KEY } from "@/lib/services/settings";

function knowledge(teamId: string): string {
  return getSetting<{ text: string }>(teamId, CONTENT_KNOWLEDGE_KEY)?.text ?? "";
}

/** Generate a script (aware of saved context + past scripts) and save as draft. */
export async function generateScriptAction(
  topic: string, brief: string, format: ScriptFormat = "video",
): Promise<{ id: string; script: string; usedWebSearch: boolean }> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");

  const past = recentScripts(ctx.teamId, 8).map((s) => s.body);
  const result = await generateScript({
    topic, brief, format, knowledge: knowledge(ctx.teamId), avoid: past,
  });
  const saved = saveScript(ctx, {
    topic, brief, body: result.script, usedWebSearch: result.usedWebSearch,
    language: "en", format,
  });
  revalidatePath("/content");
  return { id: saved.id, script: result.script, usedWebSearch: result.usedWebSearch };
}

/** Transcreate an existing script to Dutch and save it as a new (nl) script. */
export async function translateScriptAction(
  id: string,
): Promise<{ id: string; script: string }> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const src = getScript(ctx.teamId, id);
  if (!src) throw new Error("Script not found");
  const dutch = await translateToDutch(src.body, knowledge(ctx.teamId));
  const saved = saveScript(ctx, {
    topic: src.topic, brief: `Dutch version${src.topic ? ` of: ${src.topic}` : ""}`,
    body: dutch, usedWebSearch: false, language: "nl", format: src.format ?? "video",
  });
  revalidatePath("/content");
  return { id: saved.id, script: dutch };
}

export async function saveKnowledgeAction(text: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  setSetting(ctx, CONTENT_KNOWLEDGE_KEY, { text });
  revalidatePath("/content");
}

export async function setScriptStatusAction(id: string, status: ScriptStatus) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  setScriptStatus(ctx, id, status);
  revalidatePath("/content");
}

export async function updateScriptBodyAction(id: string, body: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  updateScriptBody(ctx, id, body);
  revalidatePath("/content");
}

export async function deleteScriptAction(id: string) {
  const ctx = requireSession();
  if (!can.delete(ctx.role)) throw new Error("Not allowed");
  deleteScript(ctx, id);
  revalidatePath("/content");
}
