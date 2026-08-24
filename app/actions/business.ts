"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { saveBusinessProfile, type BusinessProfile } from "@/lib/services/business";

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
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/discovery");
}
