"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  saveBusinessProfile, saveKnowledge, getBusinessContext, isBusinessConfigured,
  type BusinessProfile,
} from "@/lib/services/business";
import { generatePromptLibrary } from "@/lib/ai/promptLibrary";
import { replacePromptLibrary } from "@/lib/services/lookups";

const REFRESH_PATHS = ["/settings", "/dashboard", "/discovery", "/templates"];

/**
 * Re-screen the business with Claude and rebuild the discovery prompt library
 * around it (niche, location, offer — everything in getBusinessContext).
 * Never throws: a failed refresh should never take down a profile/knowledge save.
 */
async function refreshPromptLibrary(
  ctx: { teamId: string; userId: string }, profile: BusinessProfile,
): Promise<boolean> {
  if (!isBusinessConfigured(ctx.teamId)) return false;
  try {
    const seeds = await generatePromptLibrary(profile, getBusinessContext(ctx.teamId));
    replacePromptLibrary(ctx, seeds);
    return true;
  } catch {
    return false;
  }
}

export async function saveBusinessProfileAction(formData: FormData): Promise<{ promptsRefreshed: boolean }> {
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

  // The moment a brand is added/edited, have Claude screen it and rebuild the
  // discovery prompt library (best prompts, same-niche targeting) around it.
  const promptsRefreshed = await refreshPromptLibrary(ctx, p);

  for (const path of REFRESH_PATHS) revalidatePath(path);
  return { promptsRefreshed };
}

export async function saveKnowledgeAction(text: string): Promise<{ promptsRefreshed: boolean }> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  saveKnowledge(ctx, text);

  const { getBusinessProfile } = await import("@/lib/services/business");
  const promptsRefreshed = await refreshPromptLibrary(ctx, getBusinessProfile(ctx.teamId));

  for (const path of REFRESH_PATHS) revalidatePath(path);
  return { promptsRefreshed };
}
