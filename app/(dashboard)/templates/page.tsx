import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listTemplates } from "@/lib/services/lookups";
import { PageHeader, EmptyState } from "@/components/ui";
import { titleCase } from "@/lib/utils";

export default function TemplatesPage() {
  const ctx = requireSession();
  const templates = listTemplates(ctx.teamId);

  return (
    <div>
      <PageHeader title="Prompt library" subtitle="Reusable discovery prompts"
        action={<Link href="/discovery" className="btn-primary">Use in discovery</Link>} />
      {templates.length === 0 ? (
        <EmptyState title="No templates" hint="Defaults are seeded automatically with your account." />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {templates.map((t: any) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-ink-900">{t.name}</h3>
                {t.default_product && <span className="badge bg-brand-50 text-brand-700">{titleCase(t.default_product)}</span>}
              </div>
              <p className="text-sm text-ink-600 mt-2">{t.prompt}</p>
              {t.default_message_angle && (
                <p className="text-xs text-ink-500 mt-2">Angle: {t.default_message_angle}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
