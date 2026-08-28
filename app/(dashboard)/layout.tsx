import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { getBusinessProfile } from "@/lib/services/business";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = requireSession();
  const businessName = getBusinessProfile(session.teamId).name?.trim() || "Influencer CRM";
  return (
    <div className="flex">
      <Sidebar businessName={businessName} />
      <div className="flex-1 min-w-0">
        <Topbar session={session} businessName={businessName} />
        <main className="p-5 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
