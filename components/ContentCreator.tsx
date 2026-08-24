"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateScriptAction, translateScriptAction } from "@/app/actions/content";
import { SCRIPT_CATEGORIES, SCRIPT_FORMATS, FOUNDER_ANGLES, type ScriptCategory, type ScriptFormat, type FounderAngle } from "@/lib/ai/scriptWriter";

export function ContentCreator() {
  const [category, setCategory] = useState<ScriptCategory>("weight_loss");
  const [format, setFormat] = useState<ScriptFormat>("video");
  const [founderAngle, setFounderAngle] = useState<FounderAngle>("course");
  const [brief, setBrief] = useState("");
  const [script, setScript] = useState("");
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [isArabic, setIsArabic] = useState(false);
  const [meta, setMeta] = useState<{ usedWebSearch: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function run() {
    setError(null);
    setCopied(false);
    setIsArabic(false);
    start(async () => {
      try {
        const r = await generateScriptAction(
          category, brief, format, category === "founder" ? founderAngle : undefined,
        );
        setScript(r.script);
        setScriptId(r.id);
        setMeta({ usedWebSearch: r.usedWebSearch });
        router.refresh(); // refresh the saved-scripts list below
      } catch (e: any) {
        setError(e?.message ?? "Failed to generate script");
      }
    });
  }

  function translate() {
    if (!scriptId) return;
    setError(null);
    setCopied(false);
    start(async () => {
      try {
        const r = await translateScriptAction(scriptId);
        setScript(r.script);
        setIsArabic(true);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? "Failed to translate");
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Inputs */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {SCRIPT_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={
                  "rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition " +
                  (category === c.value
                    ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                    : "border-slate-200 text-ink-700 hover:bg-slate-50")
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Format</label>
          <div className="grid grid-cols-2 gap-2">
            {SCRIPT_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={
                  "rounded-lg border px-3 py-2.5 text-sm font-medium transition " +
                  (format === f.value
                    ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                    : "border-slate-200 text-ink-700 hover:bg-slate-50")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {category === "founder" && (
          <div>
            <label className="label">Who is this targeting? (tone)</label>
            <div className="grid grid-cols-1 gap-2">
              {FOUNDER_ANGLES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setFounderAngle(a.value)}
                  className={
                    "rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition " +
                    (founderAngle === a.value
                      ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                      : "border-slate-200 text-ink-700 hover:bg-slate-50")
                  }
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">
            What do you want for this {format === "linkedin" ? "post" : "video"}?
          </label>
          <textarea
            className="input min-h-[150px]"
            placeholder={
              category === "founder"
                ? "e.g. A contrarian take on why most clinics will lose to telehealth in 2 years — tie it to our white-label software. Bold, founder voice, end with 'DM me TELEHEALTH'."
                : "e.g. A myth-busting Reel about why crash diets fail, aimed at women 30-45 in Dubai. Confident, slightly contrarian. Mention it's doctor-reviewed and fully online."
            }
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <p className="text-xs text-ink-500 mt-1">
            Tone, audience, angle, CTA — anything helps. Leave blank to let the AI decide.
          </p>
        </div>

        <button onClick={run} disabled={pending} className="btn-primary w-full">
          {pending ? "Finding what's viral & writing…" : `Generate ${format === "linkedin" ? "post" : "script"}`}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Output */}
      <div className="card p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Script</h2>
          {script && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isArabic ? (
                <span className="badge bg-emerald-50 text-emerald-700">Arabic</span>
              ) : meta && (
                <span className="badge bg-slate-100 text-slate-600">
                  {meta.usedWebSearch ? "trend-researched" : "from knowledge"}
                </span>
              )}
              {!isArabic && (
                <button className="btn-ghost py-1 text-xs" disabled={pending} onClick={translate}>
                  {pending ? "Translating…" : "Translate to Arabic"}
                </button>
              )}
              <button
                className="btn-ghost py-1 text-xs"
                onClick={() => { navigator.clipboard.writeText(script); setCopied(true); }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button className="btn-ghost py-1 text-xs" disabled={pending} onClick={run}>
                Regenerate
              </button>
            </div>
          )}
        </div>

        {!script ? (
          <div className="flex-1 grid place-items-center text-center text-sm text-ink-500 py-16">
            {pending
              ? "Scanning what's going viral, then writing your hook…"
              : "Your Reels/TikTok script will appear here."}
          </div>
        ) : (
          <textarea
            dir={isArabic ? "rtl" : "ltr"}
            className="input flex-1 min-h-[320px] font-mono text-[13px] leading-relaxed"
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        )}
        {isArabic && (
          <p className="text-xs text-ink-500 mt-2">Arabic version saved to your scripts below.</p>
        )}
      </div>
    </div>
  );
}
