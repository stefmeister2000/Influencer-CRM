import { PageHeader } from "@/components/ui";
import { DiscoveryWizard } from "@/components/DiscoveryWizard";
import { SectionTabs } from "@/components/SectionTabs";
import { requireSession } from "@/lib/auth";

export default function DiscoveryPage() {
  requireSession();

  return (
    <div>
      <SectionTabs />
      <PageHeader
        title="Discovery"
        subtitle="Describe who you're looking for. AI converts it into structured filters and a campaign."
      />
      <DiscoveryWizard />
    </div>
  );
}
