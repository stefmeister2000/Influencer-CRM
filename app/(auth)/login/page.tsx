import { login, signup } from "@/app/actions/auth";
import { PasswordField } from "@/components/PasswordField";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-brand-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white font-bold text-xl mb-3">
            O
          </div>
          <h1 className="text-xl font-semibold text-ink-900">O'Learys — Influencer CRM</h1>
          <p className="text-sm text-ink-500">Creator discovery &amp; outreach — Ghent · Hasselt · NL</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
            {searchParams.error}
          </div>
        )}
        {searchParams.message && (
          <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm px-3 py-2">
            {searchParams.message}
          </div>
        )}

        <form className="card p-5 space-y-3">
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input"
              placeholder="you@company.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <PasswordField />
          </div>
          <button formAction={login} className="btn-primary w-full">Sign in</button>
          <button formAction={signup} className="btn-ghost w-full">Create account</button>
        </form>

        <p className="text-center text-xs text-ink-500 mt-4">
          New accounts become the admin of a fresh team. Set roles in Settings.
        </p>
      </div>
    </div>
  );
}
