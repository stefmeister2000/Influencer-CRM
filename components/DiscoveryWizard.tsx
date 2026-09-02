"use client";

import { useState, useTransition } from "react";
import { parsePromptAction, createCampaignAction } from "@/app/actions/campaigns";
import type { CreatorPlatform, DiscoveryFilters } from "@/lib/types";

type Template = { id: string; name: string; prompt: string; default_product: string | null };

const LOCATIONS = [
  { value: "Ghent", label: "Ghent" },
  { value: "Hasselt", label: "Hasselt" },
  { value: "Netherlands", label: "Netherlands" },
];
const PLATFORMS: { value: CreatorPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
];

export function DiscoveryWizard({ templates }: { templates: Template[] }) {
  const [prompt, setPrompt] = useState("");
  const [locations, setLocations] = useState<string[]>(["Ghent"]);
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>(["instagram", "tiktok"]);
  const [filters, setFilters] = useState<DiscoveryFilters | null>(null);
  const [name, setName] = useState("");
  const [payout, setPayout] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(list: T[], v: T, set: (x: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function parse() {
    setError(null);
    if (!platforms.length) { setError("Pick at least one platform."); return; }
    start(async () => {
      try {
        const f = await parsePromptAction(prompt, { regions: locations, platforms });
        setFilters(f);
        if (!name) setName(suggestName(f, locations, platforms));
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
        <div>
          <label className="label">Find creators in</label>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map((l) => (
              <button key={l.value} type="button"
                onClick={() => toggle(locations, l.value, setLocations)}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition " +
                  (locations.includes(l.value)
                    ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                    : "border-slate-200 text-ink-700 hover:bg-slate-50")
                }>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button key={p.value} type="button"
                onClick={() => toggle(platforms, p.value, setPlatforms)}
                className={
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition " +
                  (platforms.includes(p.value)
                    ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                    : "border-slate-200 text-ink-700 hover:bg-slate-50")
                }>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="label">Discovery prompt</label>
        <textarea
          className="input min-h-[140px]"
          placeholder="Describe who you want, e.g.: food and going-out creators, students, sports fans, 2k–60k followers, authentic local engagement, avoid celebrities. (The AI already knows O'Learys and the locations/platforms above.)"
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
              <ReadOnly label="Locations" value={(filters.regions?.length ? filters.regions : filters.cities)?.join(", ")} />
              <ReadOnly label="Platforms" value={(filters.platforms ?? []).map((p) => p === "tiktok" ? "TikTok" : "Instagram").join(", ")} />
            </div>
            <ReadOnly label="Languages" value={filters.languages?.join(", ")} />
            <div>
              <label className="label">Follower range</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min={0} step={100} className="input" placeholder="Min"
                  value={filters.follower_min}
                  onChange={(e) => setFilters({ ...filters, follower_min: Number(e.target.value) || 0 })} />
                <input type="number" min={0} step={100} className="input" placeholder="Max"
                  value={filters.follower_max}
                  onChange={(e) => setFilters({ ...filters, follower_max: Number(e.target.value) || 0 })} />
              </div>
              <p className="text-xs text-ink-500 mt-1">How many followers creators should have — this drives who discovery actually finds.</p>
            </div>
            <ReadOnly label="Categories" value={filters.categories?.join(", ")} />
            <ReadOnly label="Exclude" value={(filters.exclude ?? filters.excluded_niches)?.join(", ")} />
            <ReadOnly label="Message angle" value={filters.message_angle} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Payout per booking (EUR, optional)</label>
                <input name="affiliate_payout" type="number" className="input"
                  value={payout} onChange={(e) => setPayout(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Outreach goal</label>
                <input name="outreach_goal" className="input" defaultValue="creator partnership / hosted visit" />
              </div>
            </div>

            {/* hidden carriers */}
            <input type="hidden" name="search_prompt" value={prompt} />
            <input type="hidden" name="city" value={(filters.regions?.[0] ?? filters.cities?.[0]) ?? ""} />
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
    <div className="min-w-0">
      <label className="label">{label}</label>
      <div className="text-sm text-ink-700 bg-slate-50 rounded-lg px-3 py-2 min-h-[38px] break-words">
        {value || "—"}
      </div>
    </div>
  );
}

function suggestName(f: DiscoveryFilters, locations: string[], platforms: CreatorPlatform[]): string {
  const loc = locations.length ? locations.join("/") : f.country;
  const plat = platforms.length === 1
    ? (platforms[0] === "tiktok" ? "TikTok" : "Instagram")
    : "IG+TikTok";
  return [loc, f.categories?.[0] ?? "creators", plat]
    .filter(Boolean).join(" · ") || "New campaign";
}
