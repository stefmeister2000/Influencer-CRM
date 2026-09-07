"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/team";
import { PasswordField } from "@/components/PasswordField";

/** Any signed-in user (invited or original) can update their own display name and password. */
export function MyAccountPanel({ email, fullName }: { email: string; fullName: string | null }) {
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card p-4">
      <h3 className="font-medium text-ink-900 text-sm mb-1">My account</h3>
      <p className="text-xs text-ink-500 mb-3">{email}</p>
      <form
        action={(fd) => start(async () => {
          await updateProfileAction(fd);
          setSaved(true);
          router.refresh();
        })}
        className="space-y-3 max-w-sm"
      >
        <div>
          <label className="label">Your name</label>
          <input name="full_name" className="input" defaultValue={fullName ?? ""} onChange={() => setSaved(false)} />
        </div>
        <div>
          <label className="label">New password (leave blank to keep current)</label>
          <PasswordField name="new_password" required={false} placeholder="••••••••" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-emerald-700">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}
