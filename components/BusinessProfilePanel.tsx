"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessProfileAction } from "@/app/actions/business";
import type { BusinessProfile } from "@/lib/services/business";

export function BusinessProfilePanel({ initial }: { initial: BusinessProfile }) {
  const [status, setStatus] = useState<"idle" | "saved" | "refreshed">("idle");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card p-5">
      <div className="mb-3">
        <h2 className="font-semibold text-ink-900">Business profile</h2>
        <p className="text-sm text-ink-500">
          This is the business you're doing outreach for. Saving it has Claude screen the brand and
          build a discovery prompt library targeting the same niche — it drives finding creators,
          scoring fit, and writing messages.
        </p>
      </div>

      <form
        action={(fd) => start(async () => {
          const r = await saveBusinessProfileAction(fd);
          setStatus(r.promptsRefreshed ? "refreshed" : "saved");
          router.refresh();
        })}
        className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <Field name="name" label="Business name *" value={initial.name} placeholder="e.g. Acme Skincare" required />
          <Field name="website" label="Website" value={initial.website} placeholder="https://…" />
          <Field name="instagram" label="Instagram" value={initial.instagram} placeholder="@yourbrand" />
          <Field name="location" label="Target market / location" value={initial.location} placeholder="e.g. Ghent & Hasselt (Belgium), Netherlands" />
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
          <button className="btn-primary" disabled={pending} onClick={() => setStatus("idle")}>
            {pending ? "Saving & screening with Claude…" : "Save business profile"}
          </button>
          {status === "refreshed" && (
            <span className="text-sm text-emerald-700">
              Saved ✓ — discovery, scoring and messages target this business, and the prompt library was rebuilt for its niche.
            </span>
          )}
          {status === "saved" && (
            <span className="text-sm text-emerald-700">Saved ✓ — discovery, scoring and messages now target this business.</span>
          )}
        </div>
      </form>
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
