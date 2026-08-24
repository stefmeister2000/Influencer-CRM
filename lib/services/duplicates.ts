import { db } from "../db";
import type { Influencer } from "../types";
import type { NormalizedProfile } from "../providers/types";

export interface DuplicateMatch {
  existing: Pick<Influencer, "id" | "instagram_username" | "full_name" | "email" | "whatsapp" | "profile_url">;
  matchedOn: ("username" | "profile_url" | "email" | "whatsapp")[];
}

export type DuplicateStrategy = "skip" | "update" | "add_anyway" | "merge";

/**
 * Detect an existing influencer colliding by username/url/email/phone.
 * Pass includeDeleted=true to also match soft-deleted rows — used by discovery so
 * a creator you already saw (even declined or deleted) is never resurfaced.
 */
export function findDuplicate(
  teamId: string, candidate: NormalizedProfile, includeDeleted = false,
): DuplicateMatch | null {
  const deletedClause = includeDeleted ? "" : "and deleted_at is null";
  const row = db.prepare(
    `select id, instagram_username, full_name, email, whatsapp, profile_url
     from influencers
     where team_id = ? ${deletedClause}
       and (lower(instagram_username) = lower(?)
         or (? is not null and profile_url = ?)
         or (? is not null and lower(email) = lower(?))
         or (? is not null and whatsapp = ?))
     limit 1`,
  ).get(
    teamId,
    candidate.instagram_username,
    candidate.profile_url ?? null, candidate.profile_url ?? null,
    candidate.email ?? null, candidate.email ?? null,
    candidate.whatsapp ?? null, candidate.whatsapp ?? null,
  ) as any;

  if (!row) return null;

  const matchedOn: DuplicateMatch["matchedOn"] = [];
  if (row.instagram_username?.toLowerCase() === candidate.instagram_username.toLowerCase())
    matchedOn.push("username");
  if (candidate.profile_url && row.profile_url === candidate.profile_url) matchedOn.push("profile_url");
  if (candidate.email && row.email?.toLowerCase() === candidate.email.toLowerCase()) matchedOn.push("email");
  if (candidate.whatsapp && row.whatsapp === candidate.whatsapp) matchedOn.push("whatsapp");

  return { existing: row, matchedOn };
}
