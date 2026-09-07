import { redirect } from "next/navigation";
import { requireSession, listAllCompanies } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CompanyList } from "@/components/CompanyList";

export default function CompaniesPage() {
  const ctx = requireSession();
  if (!ctx.isPlatformAdmin) redirect("/dashboard");

  const companies = listAllCompanies();

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Every company running on this software. Create a new one, or switch into an existing one to manage it."
      />
      <CompanyList companies={companies} currentTeamId={ctx.teamId} />
    </div>
  );
}
