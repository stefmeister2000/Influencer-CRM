"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { generateScript, translateToArabic, type ScriptCategory, type ScriptFormat, type FounderAngle } from "@/lib/ai/scriptWriter";
import {
  saveScript, getScript, setScriptStatus, updateScriptBody, deleteScript,
  recentScriptsForCategory, type ScriptStatus,
} from "@/lib/services/scripts";
import { getSetting, setSetting, CONTENT_KNOWLEDGE_KEY } from "@/lib/services/settings";

function knowledge(teamId: string): string {
  return getSetting<{ text: string }>(teamId, CONTENT_KNOWLEDGE_KEY)?.text ?? "";
}

/** Generate a script (aware of brand knowledge + past scripts) and save as draft. */
export async function generateScriptAction(
  category: ScriptCategory, brief: string, format: ScriptFormat = "video",
  founderAngle?: FounderAngle,
): Promise<{ id: string; script: string; usedWebSearch: boolean }> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");

  const past = recentScriptsForCategory(ctx.teamId, category, 8).map((s) => s.body);
  const result = await generateScript({
    category, brief, format, founderAngle, knowledge: knowledge(ctx.teamId), avoid: past,
  });
  const saved = saveScript(ctx, {
    category, brief, body: result.script, usedWebSearch: result.usedWebSearch,
    language: "en", format,
  });
  revalidatePath("/content");
  return { id: saved.id, script: result.script, usedWebSearch: result.usedWebSearch };
}

/** Transcreate an existing script to Arabic and save it as a new (ar) script. */
export async function translateScriptAction(
  id: string,
): Promise<{ id: string; script: string }> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const src = getScript(ctx.teamId, id);
  if (!src) throw new Error("Script not found");
  const arabic = await translateToArabic(src.body, knowledge(ctx.teamId));
  const saved = saveScript(ctx, {
    category: src.category, brief: `Arabic version of a ${src.category} script`,
    body: arabic, usedWebSearch: false, language: "ar", format: src.format ?? "video",
  });
  revalidatePath("/content");
  return { id: saved.id, script: arabic };
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
