"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  getBusinessProfile, getBusinessContext, isBusinessConfigured,
} from "@/lib/services/business";
import { generatePromptLibrary } from "@/lib/ai/promptLibrary";
import { replacePromptLibrary } from "@/lib/services/lookups";

/**
 * Build (or rebuild) the prompt library from the team's business profile.
 * Replaces the existing library.
 */
export async function regeneratePromptLibraryAction(): Promise<{ count: number }> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  if (!isBusinessConfigured(ctx.teamId)) {
    throw new Error("Add your business profile in Settings first — the prompt library is built from it.");
  }

  const seeds = await generatePromptLibrary(
    getBusinessProfile(ctx.teamId),
    getBusinessContext(ctx.teamId),
  );
  replacePromptLibrary(ctx, seeds);

  revalidatePath("/templates");
  revalidatePath("/discovery");
  return { count: seeds.length };
}
