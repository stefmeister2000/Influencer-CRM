import { PageHeader } from "@/components/ui";
import { DiscoveryWizard } from "@/components/DiscoveryWizard";
import { SectionTabs } from "@/components/SectionTabs";
import { requireSession } from "@/lib/auth";
import { listTemplates } from "@/lib/services/lookups";

export default function DiscoveryPage() {
  const ctx = requireSession();
  const templates = listTemplates(ctx.teamId);

  return (
    <div>
      <SectionTabs />
      <PageHeader
        title="Discovery"
        subtitle="Describe who you're looking for. AI converts it into structured filters and a campaign."
      />
      <DiscoveryWizard templates={templates as any} />
    </div>
  );
}
