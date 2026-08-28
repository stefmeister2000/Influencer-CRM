import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { sendQueue, SENT_STATES } from "@/lib/services/messages";
import { getBusinessProfile } from "@/lib/services/business";
import { PageHeader, EmptyState } from "@/components/ui";
import { OutreachCard } from "@/components/OutreachCard";

export default function SendQueuePage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const ctx = requireSession();
  const businessName = getBusinessProfile(ctx.teamId).name?.trim() || "";
  const tab = searchParams.tab === "sent" ? "sent" : "to_send";
  const items = tab === "sent"
    ? sendQueue(ctx.teamId, SENT_STATES)
    : sendQueue(ctx.teamId);

  const TABS = [
    { value: "to_send", label: "To send" },
    { value: "sent", label: "Sent" },
  ];

  return (
    <div>
      <PageHeader title="Send & outreach"
        subtitle="Approved messages ready to send, plus everything you've already sent." />

      <div className="flex gap-1 mb-3">
        {TABS.map((t) => (
          <Link key={t.value} href={`/send-queue?tab=${t.value}`}
            className={"text-sm px-3.5 py-1.5 rounded-lg border transition " +
              (tab === t.value
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-ink-600 border-slate-200 hover:bg-slate-50")}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "to_send" && (
        <div className="card p-3 mb-3 text-sm text-ink-600 bg-brand-50 border-brand-100">
          Edit or <b>Tune ✦</b> a message, then send: <b>DM on Instagram</b> (copies + opens the DM),
          or <b>WhatsApp/Email</b> pre-filled. Then <b>Mark sent</b>.
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title={tab === "sent" ? "Nothing sent yet" : "Send queue empty"}
          hint={tab === "sent"
            ? "Messages you mark as sent show up here."
            : "Approve an influencer — it instantly generates a ready-to-send message here."} />
      ) : (
        <div className="space-y-3">
          {items.map((m: any) => (
            <OutreachCard key={m.id} item={m} role={ctx.role} businessName={businessName} />
          ))}
        </div>
      )}
    </div>
  );
}
