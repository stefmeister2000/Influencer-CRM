"use client";

import { useState, useTransition } from "react";
import { parsePromptAction, createCampaignAction } from "@/app/actions/campaigns";
import type { DiscoveryFilters } from "@/lib/types";

type Template = { id: string; name: string; prompt: string; default_product: string | null };

export function DiscoveryWizard({ templates }: { templates: Template[] }) {
  const [prompt, setPrompt] = useState("");
  const [filters, setFilters] = useState<DiscoveryFilters | null>(null);
  const [name, setName] = useState("");
  const [payout, setPayout] = useState(200);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function parse() {
    setError(null);
    start(async () => {
      try {
        const f = await parsePromptAction(prompt);
        setFilters(f);
        if (!name) setName(suggestName(f));
      } catch (e: any) {
        setError(e.message ?? "Failed to parse prompt");
      }
    });
  }

  return (
    <div>
      {/* Quick-pick categories / templates — one merged list */}
      {templates.length > 0 && (
        <div className="card p-3 mb-4">
          <label className="label">Quick categories &amp; templates — click to fill the prompt</label>
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setPrompt(t.prompt); setFilters(null); }}
                className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-ink-700 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

    <div className="grid md:grid-cols-2 gap-4">
      {/* Left: prompt input */}
      <div className="card p-5 space-y-3">
        <label className="label">Discovery prompt</label>
        <textarea
          className="input min-h-[160px]"
          placeholder="Describe who you want, e.g.: Find creators who could promote my business — focus on [niches], in [location], [follower range], good engagement, avoid celebrities. (The AI already knows your business from Settings.)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={parse} disabled={pending || !prompt.trim()} className="btn-primary w-full">
          {pending ? "Analyzing…" : "Analyze prompt → filters"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Right: parsed filters + campaign */}
      <div className="card p-5">
        {!filters ? (
          <div className="text-sm text-ink-500 h-full grid place-items-center text-center">
            Structured filters will appear here after analysis.
          </div>
        ) : (
          <form action={createCampaignAction} className="space-y-3">
            <div>
              <label className="label">Campaign name</label>
              <input name="name" className="input" value={name}
                onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country" name="country" value={filters.country} />
              <Field label="Product focus" name="product_focus" value={filters.product_focus} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ReadOnly label="Cities" value={filters.cities?.join(", ")} />
              <ReadOnly label="Languages" value={filters.languages?.join(", ")} />
            </div>
            <ReadOnly label="Categories" value={filters.categories?.join(", ")} />
            <div className="grid grid-cols-2 gap-3">
              <ReadOnly label="Followers" value={`${filters.follower_min}–${filters.follower_max}`} />
              <ReadOnly label="Exclude" value={(filters.exclude ?? filters.excluded_niches)?.join(", ")} />
            </div>
            <ReadOnly label="Message angle" value={filters.message_angle} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Affiliate payout (AED)</label>
                <input name="affiliate_payout" type="number" className="input"
                  value={payout} onChange={(e) => setPayout(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Outreach goal</label>
                <input name="outreach_goal" className="input" defaultValue="affiliate partnership" />
              </div>
            </div>

            {/* hidden carriers */}
            <input type="hidden" name="search_prompt" value={prompt} />
            <input type="hidden" name="city" value={filters.cities?.[0] ?? ""} />
            <input type="hidden" name="target_category" value={filters.categories?.[0] ?? ""} />
            <input type="hidden" name="parsed_filters" value={JSON.stringify(filters)} />

            <button className="btn-primary w-full">Create campaign</button>
            <p className="text-xs text-ink-500">
              After creating, hit <b>Run discovery</b> on the campaign to find creators —
              they appear in <b>Influencers</b> ready to approve or delete.
            </p>
          </form>
        )}
      </div>
    </div>
    </div>
  );
}

function Field({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} className="input" defaultValue={value} />
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="text-sm text-ink-700 bg-slate-50 rounded-lg px-3 py-2 min-h-[38px]">
        {value || "—"}
      </div>
    </div>
  );
}

function suggestName(f: DiscoveryFilters): string {
  return [f.country, f.product_focus, f.categories?.[0] ?? "creators"]
    .filter(Boolean).join(" · ") || "New campaign";
}
