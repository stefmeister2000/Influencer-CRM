import { getInviteByToken, inviteStatus } from "@/lib/auth";
import { acceptInviteAction } from "@/app/actions/auth";
import { PasswordField } from "@/components/PasswordField";
import { ROLE_LABELS } from "@/lib/constants";

export default function InvitePage({
  params, searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  const invite = getInviteByToken(params.token);
  const problem = inviteStatus(invite);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white font-bold text-xl mb-3">
            ✦
          </div>
          {problem || !invite ? (
            <>
              <h1 className="text-xl font-semibold text-ink-900">Invite unavailable</h1>
              <p className="text-sm text-ink-500">{problem}</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-ink-900">Join {invite.team_name}</h1>
              <p className="text-sm text-ink-500">You've been invited as {ROLE_LABELS[invite.role]}</p>
            </>
          )}
        </div>

        {problem || !invite ? (
          <p className="text-center text-sm text-ink-500">
            Ask whoever invited you for a fresh link, or{" "}
            <a href="/login" className="text-brand-700 hover:underline">sign in</a> if you already have an account.
          </p>
        ) : (
          <>
            {searchParams.error && (
              <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
                {searchParams.error}
              </div>
            )}
            <form action={acceptInviteAction} className="card p-5 space-y-3">
              <input type="hidden" name="token" value={params.token} />
              <div>
                <label className="label">Your name</label>
                <input name="full_name" className="input" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="label">Email</label>
                <input name="email" type="email" required className="input"
                  placeholder="you@company.com" defaultValue={invite.email ?? ""} />
              </div>
              <div>
                <label className="label">Password</label>
                <PasswordField />
              </div>
              <button className="btn-primary w-full">Join team</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
