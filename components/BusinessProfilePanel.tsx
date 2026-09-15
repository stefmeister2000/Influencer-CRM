"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessProfileAction, scanWebsiteAction } from "@/app/actions/business";
import type { BusinessProfile } from "@/lib/services/business";

export function BusinessProfilePanel({ initial }: { initial: BusinessProfile }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card p-5">
      <div className="mb-3">
        <h2 className="font-semibold text-ink-900">Business profile</h2>
        <p className="text-sm text-ink-500">
          This is the business you're doing outreach for. The AI uses it to find the right creators,
          score fit, and write messages. Fill it in once — it drives everything.
        </p>
      </div>

      <form
        action={(fd) => start(async () => {
          await saveBusinessProfileAction(fd);
          setSaved(true);
          router.refresh();
        })}
        className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Field name="name" label="Business name *" value={initial.name} placeholder="e.g. Acme Skincare" required />
          <div>
            <Field name="website" label="Website" value={initial.website} placeholder="https://…" />
            <ScanWebsiteButton website={initial.website} />
          </div>
          <Field name="instagram" label="Instagram" value={initial.instagram} placeholder="@yourbrand" />
          <Field name="location" label="Target market / location" value={initial.location} placeholder="e.g. UAE, or Global / US" />
        </div>
        <Area name="description" label="What you do — product, service, target customer *"
          value={initial.description}
          placeholder="e.g. We sell a subscription skincare line for men aged 25-40. Clean, science-led, premium. Customers care about simple routines and results." />
        <div className="grid md:grid-cols-2 gap-3">
          <Field name="offer" label="Partnership / affiliate offer" value={initial.offer}
            placeholder="e.g. 20% commission, or $30 per sale, tracked link" />
          <Field name="voice" label="Voice / tone (optional)" value={initial.voice}
            placeholder="e.g. premium, direct, friendly, no hype" />
        </div>

        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={pending} onClick={() => setSaved(false)}>
            {pending ? "Saving…" : "Save business profile"}
          </button>
          {saved && <span className="text-sm text-emerald-700">Saved ✓ — discovery, scoring and messages now target this business.</span>}
        </div>
      </form>
    </div>
  );
}

/**
 * One-time AI research pass over the SAVED website (not whatever's currently
 * typed but unsaved above) — appends findings to the knowledge base below.
 */
function ScanWebsiteButton({ website }: { website: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function scan() {
    setError(null);
    setDone(false);
    start(async () => {
      try {
        await scanWebsiteAction();
        setDone(true);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to scan website");
      }
    });
  }

  return (
    <div className="mt-1.5">
      <button type="button" className="btn-ghost py-1 text-xs" disabled={pending || !website.trim()} onClick={scan}>
        {pending ? "Scanning…" : "Scan website → add to knowledge base"}
      </button>
      {!website.trim() && <p className="text-xs text-ink-400 mt-1">Save a website above first.</p>}
      {done && <p className="text-xs text-emerald-700 mt-1">Added to knowledge base below ✓</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Field({ name, label, value, ...rest }: {
  name: string; label: string; value: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} defaultValue={value} className="input" {...rest} />
    </div>
  );
}
function Area({ name, label, value, placeholder }: {
  name: string; label: string; value: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea name={name} defaultValue={value} placeholder={placeholder} className="input min-h-[90px]" />
    </div>
  );
}
