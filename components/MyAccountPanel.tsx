"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/team";
import { PasswordField } from "@/components/PasswordField";

/** Any signed-in user (invited or original) can update their own display name and password. */
export function MyAccountPanel({ email, fullName }: { email: string; fullName: string | null }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card p-4">
      <h3 className="font-medium text-ink-900 text-sm mb-1">My account</h3>
      <form
        action={(fd) => start(async () => {
          setError(null);
          try {
            await updateProfileAction(fd);
            setSaved(true);
            router.refresh();
          } catch (e: any) {
            setError(e?.message ?? "Failed to save changes");
          }
        })}
        className="space-y-3 max-w-sm"
      >
        <div>
          <label className="label">Your name</label>
          <input name="full_name" className="input" defaultValue={fullName ?? ""} onChange={() => setSaved(false)} />
        </div>
        <div>
          <label className="label">Email (also your login)</label>
          <input name="email" type="email" className="input" defaultValue={email} required onChange={() => setSaved(false)} />
        </div>
        <div>
          <label className="label">New password (leave blank to keep current)</label>
          <PasswordField name="new_password" required={false} placeholder="••••••••" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
          {saved && !error && <span className="text-sm text-emerald-700">Saved ✓</span>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
