import { db } from "../db";

export interface DashboardMetrics {
  total: number; approved: number; messagesGenerated: number; messagesApproved: number;
  messagesSent: number; replies: number; interested: number; onboarded: number;
  conversionRate: number; avgScore: number; bestCategory: string | null; bestCampaign: string | null;
}

const n = (sql: string, ...args: unknown[]) =>
  (db.prepare(sql).get(...args) as any).n as number;

export function getDashboardMetrics(teamId: string): DashboardMetrics {
  const total = n("select count(*) as n from influencers where team_id = ? and deleted_at is null", teamId);
  const approved = n("select count(*) as n from influencers where team_id = ? and deleted_at is null and status = 'approved'", teamId);
  const interested = n("select count(*) as n from influencers where team_id = ? and deleted_at is null and status = 'interested'", teamId);
  const onboarded = n("select count(*) as n from influencers where team_id = ? and deleted_at is null and status = 'onboarded'", teamId);

  const messagesGenerated = n("select count(*) as n from messages where team_id = ? and state = 'generated'", teamId);
  const messagesApproved = n("select count(*) as n from messages where team_id = ? and state = 'approved_to_send'", teamId);
  const messagesSent = n("select count(*) as n from messages where team_id = ? and state = 'sent'", teamId);
  const replies = n("select count(*) as n from messages where team_id = ? and state = 'replied'", teamId);

  const avg = db.prepare(
    "select avg(final_score) as a from influencers where team_id = ? and deleted_at is null and final_score is not null",
  ).get(teamId) as any;
  const avgScore = avg.a ? Math.round(avg.a) : 0;

  const cat = db.prepare(
    `select category, count(*) as c from influencers
     where team_id = ? and deleted_at is null and category is not null
     group by category order by c desc limit 1`,
  ).get(teamId) as any;

  const conversionRate = messagesSent ? Math.round((onboarded / messagesSent) * 100) : 0;

  return {
    total, approved, messagesGenerated, messagesApproved, messagesSent, replies,
    interested, onboarded, conversionRate, avgScore,
    bestCategory: cat?.category ?? null, bestCampaign: null,
  };
}
