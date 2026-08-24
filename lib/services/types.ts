export type EventType =
  | "profile_added" | "message_generated" | "message_edited"
  | "approved_for_outreach" | "marked_sent" | "reply_received"
  | "note_added" | "status_changed" | "affiliate_link_sent"
  | "onboarded" | "rejected" | "deleted" | "restored" | "imported" | "scored";

export interface EventInsert {
  teamId: string;
  influencerId: string;
  type: EventType;
  detail?: string;
  metadata?: Record<string, unknown>;
  actorId?: string;
}
