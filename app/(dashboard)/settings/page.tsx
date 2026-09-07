import { requireSession, listInvites, getTeamName } from "@/lib/auth";
import { listMembers } from "@/lib/services/lookups";
import { getBusinessProfile, getKnowledge, getThemeColor } from "@/lib/services/business";
import { PageHeader, StatCard } from "@/components/ui";
import { RoleManager } from "@/components/RoleManager";
import { ExportButton } from "@/components/ExportButton";
import { BusinessProfilePanel } from "@/components/BusinessProfilePanel";
import { DiscoveryKnowledgePanel } from "@/components/DiscoveryKnowledgePanel";
import { MyAccountPanel } from "@/components/MyAccountPanel";
import { TeamNameForm } from "@/components/TeamNameForm";
import { BrandColorForm } from "@/components/BrandColorForm";
import { InviteManager } from "@/components/InviteManager";
import { DangerZone } from "@/components/DangerZone";
import { can } from "@/lib/permissions";
import { aiConfigured } from "@/lib/ai/anthropic";

export default function SettingsPage() {
  const ctx = requireSession();
  const members = listMembers(ctx.teamId);
  const business = getBusinessProfile(ctx.teamId);
  const knowledge = getKnowledge(ctx.teamId);
  const isAdmin = can.manageTeam(ctx.role);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Your business, team, integrations & exports" />

      <MyAccountPanel email={ctx.email} fullName={ctx.fullName} />

      <BusinessProfilePanel initial={business} />
      <DiscoveryKnowledgePanel initial={knowledge} />

      <section>
        <h2 className="font-semibold mb-2">Team &amp; access</h2>
        <div className="space-y-3">
          {isAdmin && (
            <div className="grid md:grid-cols-2 gap-3">
              <TeamNameForm initial={getTeamName(ctx.teamId)} />
              <BrandColorForm initial={getThemeColor(ctx.teamId)} />
            </div>
          )}
          <RoleManager members={members as any} canEdit={can.manageRoles(ctx.role)} />
          {isAdmin && <InviteManager invites={listInvites(ctx.teamId)} />}
        </div>
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

      {isAdmin && (
        <section>
          <h2 className="font-semibold mb-2">Danger zone</h2>
          <DangerZone />
        </section>
      )}
    </div>
  );
}
