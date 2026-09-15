"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCampaignAction } from "@/app/actions/campaigns";
import type { Campaign, CreatorPlatform, DiscoveryFilters } from "@/lib/types";

const PLATFORMS: { value: CreatorPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
];

const toList = (v?: string[]) => (v?.length ? v.join(", ") : "");
const fromList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

/**
 * Edit a campaign's brief + parsed search filters after the fact — catches a
 * wrong follower range, missed platform, etc. before (or after) running
 * discovery. Read-only summary by default; "Edit" swaps in a form.
 */
export function CampaignEditor({ campaign, filters }: { campaign: Campaign; filters: DiscoveryFilters | null }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [name, setName] = useState(campaign.name);
  const [searchPrompt, setSearchPrompt] = useState(campaign.search_prompt ?? "");
  const [productFocus, setProductFocus] = useState(campaign.product_focus ?? "");
  const [country, setCountry] = useState(campaign.country ?? "");
  const [city, setCity] = useState(campaign.city ?? "");
  const [platforms, setPlatforms] = useState<CreatorPlatform[]>(filters?.platforms?.length ? filters.platforms : ["instagram", "tiktok"]);
  const [followerMin, setFollowerMin] = useState(filters?.follower_min ?? 0);
  const [followerMax, setFollowerMax] = useState(filters?.follower_max ?? 0);
  const [categories, setCategories] = useState(toList(filters?.categories));
  const [regions, setRegions] = useState(toList(filters?.regions?.length ? filters.regions : filters?.cities));
  const [languages, setLanguages] = useState(toList(filters?.languages));
  const [exclude, setExclude] = useState(toList(filters?.exclude ?? filters?.excluded_niches));
  const [messageAngle, setMessageAngle] = useState(filters?.message_angle ?? "");

  const togglePlatform = (p: CreatorPlatform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  function save() {
    setError(null);
    if (!platforms.length) { setError("Pick at least one platform."); return; }
    start(async () => {
      try {
        const newFilters: DiscoveryFilters = {
          ...(filters ?? { country: "", cities: [], categories: [], product_focus: "", follower_min: 0, follower_max: 0, languages: [] }),
          platforms,
          follower_min: followerMin,
          follower_max: followerMax,
          categories: fromList(categories),
          regions: fromList(regions),
          languages: fromList(languages),
          exclude: fromList(exclude),
          message_angle: messageAngle.trim(),
        };
        await updateCampaignAction(campaign.id, {
          name, search_prompt: searchPrompt || null, product_focus: productFocus || null,
          country: country || null, city: city || null, parsed_filters: newFilters,
        });
        setEditing(false);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to save changes");
      }
    });
  }

  function cancel() {
    setName(campaign.name);
    setSearchPrompt(campaign.search_prompt ?? "");
    setProductFocus(campaign.product_focus ?? "");
    setCountry(campaign.country ?? "");
    setCity(campaign.city ?? "");
    setPlatforms(filters?.platforms?.length ? filters.platforms : ["instagram", "tiktok"]);
    setFollowerMin(filters?.follower_min ?? 0);
    setFollowerMax(filters?.follower_max ?? 0);
    setCategories(toList(filters?.categories));
    setRegions(toList(filters?.regions?.length ? filters.regions : filters?.cities));
    setLanguages(toList(filters?.languages));
    setExclude(toList(filters?.exclude ?? filters?.excluded_niches));
    setMessageAngle(filters?.message_angle ?? "");
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Search prompt</h2>
            <button className="btn-ghost py-1 text-xs" onClick={() => setEditing(true)}>Edit</button>
          </div>
          <p className="text-sm text-ink-700 whitespace-pre-wrap">{campaign.search_prompt || "—"}</p>
          {campaign.brand_voice && (
            <>
              <h3 className="font-medium mt-4 mb-1 text-sm">Brand voice</h3>
              <p className="text-sm text-ink-700">{campaign.brand_voice}</p>
            </>
          )}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-2">Parsed filters</h2>
          {filters ? (
            <dl className="text-sm space-y-1">
              <Row k="Platforms" v={(filters.platforms ?? []).map(platformLabel).join(", ")} />
              <Row k="Locations" v={(filters.regions?.length ? filters.regions : filters.cities)?.join(", ")} />
              <Row k="Categories" v={filters.categories?.join(", ")} />
              <Row k="Followers" v={`${filters.follower_min}–${filters.follower_max}`} />
              <Row k="Languages" v={filters.languages?.join(", ")} />
              <Row k="Exclude" v={(filters.exclude ?? filters.excluded_niches)?.join(", ")} />
              <Row k="Message angle" v={filters.message_angle} />
            </dl>
          ) : <p className="text-sm text-ink-500">No parsed filters.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Edit campaign</h2>
        <p className="text-xs text-ink-500">Only affects future discovery runs — influencers already found don't change.</p>
      </div>

      <div>
        <label className="label">Campaign name *</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="label">Search prompt</label>
        <textarea className="input min-h-[90px]" value={searchPrompt} onChange={(e) => setSearchPrompt(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="label">Product focus</label>
          <input className="input" value={productFocus} onChange={(e) => setProductFocus(e.target.value)} />
        </div>
        <div>
          <label className="label">Country</label>
          <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button key={p.value} type="button" onClick={() => togglePlatform(p.value)}
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

      <div>
        <label className="label">Follower range</label>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min={0} step={100} className="input" placeholder="Min"
            value={followerMin} onChange={(e) => setFollowerMin(Number(e.target.value) || 0)} />
          <input type="number" min={0} step={100} className="input" placeholder="Max"
            value={followerMax} onChange={(e) => setFollowerMax(Number(e.target.value) || 0)} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <TextListField label="Locations" value={regions} onChange={setRegions} placeholder="e.g. Ghent, Hasselt" />
        <TextListField label="Categories" value={categories} onChange={setCategories} placeholder="e.g. Food, Lifestyle" />
        <TextListField label="Languages" value={languages} onChange={setLanguages} placeholder="e.g. Dutch, English" />
        <TextListField label="Exclude" value={exclude} onChange={setExclude} placeholder="e.g. celebrities, fake engagement" />
      </div>

      <div>
        <label className="label">Message angle</label>
        <input className="input" value={messageAngle} onChange={(e) => setMessageAngle(e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button className="btn-primary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button className="btn-ghost" disabled={pending} onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}

function TextListField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label} <span className="text-ink-400 font-normal">(comma-separated)</span></label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function platformLabel(p: string): string {
  return p === "tiktok" ? "TikTok" : p === "youtube" ? "YouTube" : "Instagram";
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-ink-500 w-28 shrink-0">{k}</dt>
      <dd className="text-ink-800">{v || "—"}</dd>
    </div>
  );
}
