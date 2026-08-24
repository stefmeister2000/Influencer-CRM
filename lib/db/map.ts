import type { Campaign, Influencer, Message } from "../types";

const json = (v: unknown) => {
  if (v == null) return null;
  try { return JSON.parse(String(v)); } catch { return null; }
};
const bool = (v: unknown) => (v == null ? null : Boolean(v));

export function mapCampaign(r: any): Campaign {
  if (!r) return r;
  return { ...r, parsed_filters: json(r.parsed_filters) };
}

export function mapInfluencer(r: any): Influencer {
  return r as Influencer; // columns already match the type
}

export function mapMessage(r: any): Message {
  if (!r) return r;
  return {
    ...r,
    compliance_passed: bool(r.compliance_passed),
    edited_by_human: Boolean(r.edited_by_human),
  } as Message;
}
