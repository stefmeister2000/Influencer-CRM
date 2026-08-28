import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL, aiConfigured } from "./anthropic";

/** Output format: short spoken video, or a written LinkedIn post. */
export type ScriptFormat = "video" | "linkedin";

export const SCRIPT_FORMATS: { value: ScriptFormat; label: string }[] = [
  { value: "video", label: "Video (TikTok / Reels)" },
  { value: "linkedin", label: "LinkedIn post" },
];

// --- Persona (topic-agnostic) ---
const PERSONA = `You are an elite short-form content scriptwriter. You write
viral-grade content on whatever topic you're given. You know what makes people
stop scrolling, keep watching, and act. You adapt tone and voice to the topic and
audience described in the brief.`;

// --- Format blocks (structure) ---
const VIDEO_FORMAT = `FORMAT: a spoken short-form VIDEO script for TikTok / Instagram
Reels (15-45 seconds).
- Open with a SCROLL-STOPPING HOOK on the first line (first 1-2 seconds decide
  everything) — pattern-interrupting, specific, emotionally charged.
- Short punchy spoken lines, open loops, clear payoff. Native to the platform, not
  an ad. Confident and human.
- End with one natural call to action.`;

const LINKEDIN_FORMAT = `FORMAT: a written LINKEDIN POST.
- First line is the hook — LinkedIn truncates after ~2 lines, so it must earn the
  "see more" click. Specific, bold, curiosity-driving.
- Use short lines and white space (1-2 sentences per line). Tell a story or deliver
  a sharp insight, then concrete takeaways/value.
- Professional but human and opinionated. Light emoji ok (sparingly). End with a
  soft CTA and optionally 2-4 relevant hashtags on the last line.
- ~80-220 words.`;

const COMPLIANCE = `RESPONSIBLE CONTENT:
- No false claims, fake statistics, fabricated testimonials, or guarantees.
- For health, finance, legal or other sensitive topics: be educational and honest,
  not hype or miracle claims. Keep a credible tone.`;

const OUTPUT = `OUTPUT — Output ONLY the post/script text. No preamble, no "Here's
your script", no analysis, no citations. Just the content, with line breaks.`;

function buildSystem(format: ScriptFormat, withSearch: boolean): string {
  const fmt = format === "linkedin" ? LINKEDIN_FORMAT : VIDEO_FORMAT;
  const process = withSearch
    ? `PROCESS: Do a QUICK web search (1-2 searches, don't over-research) for what is
currently going viral / trending around this topic — hooks, formats, angles, pain
points, debates. Pick the single strongest angle, then write ONE piece.`
    : `PROCESS: Use your knowledge of what goes viral around this topic (hooks,
formats, pain points, debates) to pick the strongest angle, then write ONE piece.`;
  return [PERSONA, process, fmt, COMPLIANCE, OUTPUT].join("\n\n");
}

export interface ScriptResult {
  script: string;
  usedWebSearch: boolean;
}

/**
 * Generate viral content for a topic + format + user brief. Uses Anthropic's web
 * search tool to ground it in what's currently trending; falls back to a no-tools
 * generation if web search is unavailable, and to a template if no key.
 */
export async function generateScript(args: {
  topic: string;
  brief: string;
  knowledge?: string;
  avoid?: string[];
  format?: ScriptFormat;
}): Promise<ScriptResult> {
  const topic = args.topic.trim() || "(general)";
  const format: ScriptFormat = args.format ?? "video";
  const pieceWord = format === "linkedin" ? "LinkedIn post" : "video script";

  if (!aiConfigured()) {
    return { script: fallbackScript(topic, args.brief, format), usedWebSearch: false };
  }

  const knowledgeBlock = args.knowledge?.trim()
    ? `\nCONTEXT / KNOWLEDGE — use this to focus the content (who it's for, positioning, offers, links, tone):\n${args.knowledge.trim()}\n`
    : "";

  const avoidBlock = args.avoid?.length
    ? `\nDO NOT REPEAT past content. We've already made these — use a DIFFERENT hook, angle and structure:\n` +
      args.avoid.map((a, i) => `${i + 1}. ${a.replace(/\s+/g, " ").slice(0, 160)}`).join("\n") +
      `\n`
    : "";

  const userPrompt =
    `Topic: ${topic}\n` +
    `Output format: ${pieceWord}\n` +
    knowledgeBlock +
    avoidBlock +
    `\nWhat we want:\n${args.brief.trim() || "(no extra notes — use your best judgment for a high-performing piece)"}\n\n` +
    `Find what's going viral around this right now, then write the single best ${pieceWord}. Make it clearly distinct from any past content listed above. Output only the ${pieceWord}.`;

  // Attempt with the web search tool first.
  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1800,
      system: buildSystem(format, true),
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 } as any],
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = extractText(res);
    if (text) return { script: clean(text), usedWebSearch: true };
  } catch {
    // web search may be disabled — fall through to plain generation
  }

  // Fallback: no tools, rely on model knowledge of viral patterns.
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 1600,
    system: buildSystem(format, false),
    messages: [{ role: "user", content: userPrompt }],
  });
  return { script: clean(extractText(res)), usedWebSearch: false };
}

const DUTCH_SYSTEM = `You are an elite Dutch short-form scriptwriter for Instagram
Reels and TikTok in the Belgian/Dutch market. You TRANSCREATE — never translate
literally. You take an English script and rewrite it as a natural, punchy,
native-sounding Dutch script that would actually go viral with a Flemish/Dutch
audience.

RULES:
- Use natural, spoken Dutch — the way real creators in Flanders and the
  Netherlands talk, not stiff or formal. Light, current, not cringe.
- Keep the SAME core idea, hook strength, and call to action, but make every line
  feel born in Dutch. Adapt idioms, rhythm and references.
- Open with an equally strong scroll-stopping hook in the first line.
- Keep it responsible: no false claims, no fabricated statistics, credible tone.
- OUTPUT ONLY the Dutch script text. No English, no notes, no preamble.
  Just the Dutch words to say/show, with line breaks.`;

/** Transcreate an English script into a high-quality viral Dutch script. */
export async function translateToDutch(script: string, knowledge?: string): Promise<string> {
  if (!aiConfigured()) return script;
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 1600,
    system: DUTCH_SYSTEM,
    messages: [{
      role: "user",
      content:
        (knowledge?.trim() ? `Context (for reference):\n${knowledge.trim()}\n\n` : "") +
        `Transcreate this into a viral Dutch Reels/TikTok script:\n\n${script}`,
    }],
  });
  return clean(extractText(res));
}

function extractText(res: Anthropic.Message): string {
  // The model may emit a "let me research…" text block BEFORE calling the web
  // search tool, then the actual script AFTER. Keep only text that comes after
  // the last tool-related block so preamble never leaks into the script.
  let lastToolIdx = -1;
  res.content.forEach((b, i) => {
    const t = b.type as string;
    if (t === "server_tool_use" || t === "web_search_tool_result" || t === "tool_use") {
      lastToolIdx = i;
    }
  });
  const relevant = lastToolIdx >= 0 ? res.content.slice(lastToolIdx + 1) : res.content;
  const text = relevant
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  // Fallback: if nothing after the tool block, use all text blocks.
  if (text) return text;
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function clean(text: string): string {
  let t = text
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();

  // The model sometimes writes a short meta/explanation, then a "---" separator,
  // then the real piece. If a horizontal rule appears in the first ~400 chars,
  // drop everything up to and including it.
  const hr = t.match(/\n\s*-{3,}\s*\n/);
  if (hr && (hr.index ?? 0) < 400) {
    t = t.slice((hr.index ?? 0) + hr[0].length).trim();
  }

  // Drop any leading meta/preamble lines the model sometimes adds.
  const preamble = /^(here'?s|here is|i'?ll|i will|let me|sure|okay|ok\b|first,|now,|based on|that'?s the|this is the)\b.*?(:|\.|\n)/i;
  while (preamble.test(t)) {
    const nl = t.indexOf("\n");
    if (nl === -1) break;
    t = t.slice(nl + 1).trim();
  }
  return t.trim();
}

function fallbackScript(topic: string, brief: string, format: ScriptFormat): string {
  const t = topic.toLowerCase();
  if (format === "linkedin") {
    return `Most people get ${t} completely backwards.

They focus on the tactic. They ignore the fundamentals.

Here's what actually moves the needle: a clear plan, consistent execution, and honest feedback loops.

${brief ? brief : ""}

If this resonates, follow for more.`.trim();
  }
  return `Nobody tells you this about ${t}…

If you've tried everything and nothing's working, it's probably not you — it's the approach.

Most people just copy random advice online and hope.

The difference is having a real plan and sticking to it.

${brief ? brief : ""}

If you're ready to stop guessing, the link's in bio.`.trim();
}
