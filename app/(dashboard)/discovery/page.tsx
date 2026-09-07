import { PageHeader } from "@/components/ui";
import { DiscoveryWizard } from "@/components/DiscoveryWizard";
import { SectionTabs } from "@/components/SectionTabs";
import { requireSession } from "@/lib/auth";
import { listLocations, listCategories } from "@/lib/services/discoveryTags";

export default function DiscoveryPage() {
  const ctx = requireSession();
  const locations = listLocations(ctx.teamId);
  const categories = listCategories(ctx.teamId);

  return (
    <div>
      <SectionTabs />
      <PageHeader
        title="Discovery"
        subtitle="Describe who you're looking for. AI converts it into structured filters and a campaign."
      />
      <DiscoveryWizard locations={locations} categories={categories} />
    </div>
  );
}
