import { requireSession } from "@/lib/auth";
import { listMembers } from "@/lib/services/lookups";
import { getBusinessProfile } from "@/lib/services/business";
import { PageHeader, StatCard } from "@/components/ui";
import { RoleManager } from "@/components/RoleManager";
import { ExportButton } from "@/components/ExportButton";
import { BusinessProfilePanel } from "@/components/BusinessProfilePanel";
import { can } from "@/lib/permissions";
import { aiConfigured } from "@/lib/ai/anthropic";

export default function SettingsPage() {
  const ctx = requireSession();
  const members = listMembers(ctx.teamId);
  const business = getBusinessProfile(ctx.teamId);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Your business, team, integrations & exports" />

      <BusinessProfilePanel initial={business} />

      <section>
        <h2 className="font-semibold mb-2">Team members &amp; roles</h2>
        <RoleManager members={members as any} canEdit={can.manageRoles(ctx.role)} />
      </section>

      <section>
        <h2 className="font-semibold mb-2">Integrations</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="AI (Claude)" value={aiConfigured() ? "Connected" : "Not set"}
            hint="ANTHROPIC_API_KEY" />
          <StatCard label="Discovery provider" value={process.env.DISCOVERY_PROVIDER ?? "manual"} />
          <StatCard label="Database" value="Local SQLite" hint="data/orvion.db" />
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Exports</h2>
        <div className="card p-4 flex items-center justify-between">
          <p className="text-sm text-ink-600">Download all influencers as CSV.</p>
          <ExportButton />
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Compliance</h2>
        <div className="card p-4 text-sm text-ink-700 space-y-1">
          <p>This platform enforces human review before any message is marked sent.</p>
          <p>Generated messages are screened for medical claims, guarantees, "cure" language,
            medication names, pressure tactics and emojis before approval.</p>
          <p>Discovery uses official APIs, approved providers, manual add and CSV only.</p>
        </div>
      </section>
    </div>
  );
}
