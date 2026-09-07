"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  addLocation, deleteLocation, addCategory, deleteCategory, type Tag,
} from "@/lib/services/discoveryTags";

export async function addLocationAction(name: string): Promise<Tag> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const tag = addLocation(ctx, name);
  revalidatePath("/discovery");
  return tag;
}

export async function deleteLocationAction(id: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  deleteLocation(ctx, id);
  revalidatePath("/discovery");
}

export async function addCategoryAction(name: string): Promise<Tag> {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  const tag = addCategory(ctx, name);
  revalidatePath("/discovery");
  return tag;
}

export async function deleteCategoryAction(id: string) {
  const ctx = requireSession();
  if (!can.write(ctx.role)) throw new Error("Not allowed");
  deleteCategory(ctx, id);
  revalidatePath("/discovery");
}
