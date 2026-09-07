import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { getBusinessProfile, getThemeColor } from "@/lib/services/business";
import { brandCssVars } from "@/lib/theme";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = requireSession();
  const businessName = getBusinessProfile(session.teamId).name?.trim() || "Influencer CRM";
  const themeColor = getThemeColor(session.teamId);

  return (
    <div className="flex">
      {/* Per-team brand color override — only rendered when a team has set one,
          so every other team keeps the app's default palette untouched. */}
      {themeColor && <style dangerouslySetInnerHTML={{ __html: `:root{${brandCssVars(themeColor)}}` }} />}
      <Sidebar businessName={businessName} />
      <div className="flex-1 min-w-0">
        <Topbar session={session} businessName={businessName} />
        <main className="p-5 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
