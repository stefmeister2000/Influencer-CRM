import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listTemplates } from "@/lib/services/lookups";
import { getBusinessProfile, isBusinessConfigured } from "@/lib/services/business";
import { PageHeader, EmptyState } from "@/components/ui";
import { GeneratePromptLibrary } from "@/components/PromptLibraryActions";
import { titleCase } from "@/lib/utils";

export default function TemplatesPage() {
  const ctx = requireSession();
  const templates = listTemplates(ctx.teamId);
  const businessConfigured = isBusinessConfigured(ctx.teamId);
  const businessName = getBusinessProfile(ctx.teamId).name?.trim();

  return (
    <div>
      <PageHeader
        title="Prompt library"
        subtitle={
          businessName
            ? `Reusable discovery prompts, tailored to ${businessName}.`
            : "Reusable discovery prompts, built from your business profile."
        }
        action={
          <GeneratePromptLibrary
            hasLibrary={templates.length > 0}
            businessConfigured={businessConfigured}
          />
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          title={businessConfigured ? "No prompts yet" : "Set up your business first"}
          hint={
            businessConfigured
              ? 'Click "Generate from my business" — the AI builds a starter set of discovery prompts around who you sell to.'
              : "Add your business profile in Settings, then generate a prompt library focused on it."
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {templates.map((t: any) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-ink-900">{t.name}</h3>
                {t.default_product && (
                  <span className="badge bg-brand-50 text-brand-700 shrink-0">{titleCase(t.default_product)}</span>
                )}
              </div>
              <p className="text-sm text-ink-600 mt-2">{t.prompt}</p>
              {t.default_message_angle && (
                <p className="text-xs text-ink-500 mt-2">Angle: {t.default_message_angle}</p>
              )}
              <Link href="/discovery" className="text-xs text-brand-700 hover:underline mt-2 inline-block">
                Use in discovery →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
