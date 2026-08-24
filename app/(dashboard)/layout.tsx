import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = requireSession();
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar session={session} />
        <main className="p-5 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
