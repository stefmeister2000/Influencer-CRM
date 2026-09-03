"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { saveBusinessProfile, saveKnowledge, type BusinessProfile } from "@/lib/services/business";

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
