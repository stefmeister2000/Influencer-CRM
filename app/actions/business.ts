"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  saveBusinessProfile, saveKnowledge, getBusinessProfile, getKnowledge, type BusinessProfile,
} from "@/lib/services/business";
import { scanWebsiteForKnowledge } from "@/lib/ai/websiteScan";

const REFRESH_PATHS = ["/settings", "/dashboard", "/discovery"];

export async function saveBusinessProfileAction(formData: FormData) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const p: BusinessProfile = {
    name: str("name"),
    website: str("website"),
    instagram: str("instagram"),
    description: str("description"),
    location: str("location"),
    offer: str("offer"),
    voice: str("voice"),
  };
  saveBusinessProfile(ctx, p);
  for (const path of REFRESH_PATHS) revalidatePath(path);
}

export async function saveKnowledgeAction(text: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  saveKnowledge(ctx, text);
  for (const path of REFRESH_PATHS) revalidatePath(path);
}

/**
 * One-time AI pass over the saved Business profile's website — researches it
 * (plus a little web search for social handles etc.) and appends the result
 * to the knowledge base. Never overwrites existing notes.
 */
export async function scanWebsiteAction(): Promise<{ text: string }> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const profile = getBusinessProfile(ctx.teamId);
  if (!profile.website) throw new Error("Add a website in Business profile above and save it first.");

  const found = await scanWebsiteForKnowledge(profile.website, profile.name);
  const existing = getKnowledge(ctx.teamId);
  const stamp = new Date().toISOString().slice(0, 10);
  const combined = existing
    ? `${existing}\n\n— Website scan (${stamp}) —\n${found}`
    : `— Website scan (${stamp}) —\n${found}`;

  saveKnowledge(ctx, combined);
  for (const path of REFRESH_PATHS) revalidatePath(path);
  return { text: combined };
}
