"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addInfluencerAction } from "@/app/actions/influencers";
import { importCsvAction } from "@/app/actions/import-export";
import type { Campaign, UserRole } from "@/lib/types";
import { can } from "@/lib/permissions";

export function AddInfluencer({ campaigns, role }: { campaigns: Campaign[]; role: UserRole }) {
  const [open, setOpen] = useState<"manual" | "csv" | null>(null);
  const router = useRouter();

  if (!can.write(role)) return null;

  return (
    <div className="flex gap-2">
      <button className="btn-ghost" onClick={() => setOpen("csv")}>Import CSV</button>
      <button className="btn-primary" onClick={() => setOpen("manual")}>Add influencer</button>

      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 grid place-items-center p-4"
          onClick={() => setOpen(null)}>
          <div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            {open === "manual" ? (
              <ManualForm campaigns={campaigns} onDone={() => { setOpen(null); router.refresh(); }} />
            ) : (
              <CsvForm campaigns={campaigns} onDone={() => { setOpen(null); router.refresh(); }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualForm({ campaigns, onDone }: { campaigns: Campaign[]; onDone: () => void }) {
  return (
    <form action={async (fd) => { await addInfluencerAction(fd); onDone(); }} className="space-y-3">
      <h2 className="font-semibold text-lg">Add influencer</h2>
      <div className="grid grid-cols-2 gap-3">
        <Input name="instagram_username" label="Instagram username *" required />
        <Input name="full_name" label="Full name" />
        <Input name="profile_url" label="Profile URL" />
        <Input name="follower_count" label="Followers" type="number" />
        <Input name="country" label="Country" defaultValue="UAE" />
        <Input name="city" label="City" />
        <Input name="category" label="Category" />
        <Input name="email" label="Email" />
        <Input name="whatsapp" label="WhatsApp" />
        <div>
          <label className="label">Campaign</label>
          <select name="campaign_id" className="input">
            <option value="">None</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" className="input" rows={2} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary">Add &amp; send to review</button>
      </div>
    </form>
  );
}

function CsvForm({ campaigns, onDone }: { campaigns: Campaign[]; onDone: () => void }) {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) return;
    setBusy(true);
    const text = await file.text();
    const r = await importCsvAction(text, {
      campaignId: (formData.get("campaign_id") as string) || null,
      strategy: (formData.get("strategy") as any) || "skip",
    });
    setBusy(false);
    setResult(`Imported ${r.inserted}, updated ${r.updated}, skipped ${r.skipped}`);
  }

  return (
    <form action={handle} className="space-y-3">
      <h2 className="font-semibold text-lg">Import CSV</h2>
      <p className="text-xs text-ink-500">
        Columns: username, profile_url, full_name, bio, follower_count, following_count,
        post_count, engagement_rate, country, city, email, whatsapp, category, notes
      </p>
      <input name="file" type="file" accept=".csv" required className="input" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Campaign</label>
          <select name="campaign_id" className="input">
            <option value="">None</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">On duplicate</label>
          <select name="strategy" className="input">
            <option value="skip">Skip</option>
            <option value="update">Update existing</option>
            <option value="add_anyway">Add anyway</option>
          </select>
        </div>
      </div>
      {result && <p className="text-sm text-emerald-700">{result}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Close</button>
        <button className="btn-primary" disabled={busy}>{busy ? "Importing…" : "Import"}</button>
      </div>
    </form>
  );
}

function Input({ name, label, ...rest }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} className="input" {...rest} />
    </div>
  );
}
