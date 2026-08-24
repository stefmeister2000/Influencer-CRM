import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL, aiConfigured } from "./anthropic";

export type ScriptCategory = "weight_loss" | "hair_loss" | "mens_health" | "womens_hair" | "peptides" | "founder";

/** Output format: short spoken video, or a written LinkedIn post. */
export type ScriptFormat = "video" | "linkedin";

export const SCRIPT_FORMATS: { value: ScriptFormat; label: string }[] = [
  { value: "video", label: "Video (TikTok / Reels)" },
  { value: "linkedin", label: "LinkedIn post" },
];

/** For the Founder category: who the piece is targeting (drives tone + CTA). */
export type FounderAngle = "course" | "saas" | "clinic";

export const FOUNDER_ANGLES: { value: FounderAngle; label: string; guidance: string }[] = [
  {
    value: "course",
    label: "Sell the course",
    guidance:
      "TARGET: aspiring entrepreneurs / ecommerce operators who want to BUILD their own telehealth + ecommerce business. TONE: aspirational but proof-driven, contrarian, opportunity-focused — show there's a repeatable system to learn. CTA: join the course / waitlist or DM a keyword. Sell the transformation (you can start this model yourself), not features.",
  },
  {
    value: "saas",
    label: "Ecommerce / SaaS (white-label)",
    guidance:
      "TARGET: founders and operators who want the white-label telehealth SOFTWARE to launch fast. TONE: product-led, ROI and speed-to-market, scalable-business angle. CTA: get a demo / DM for access. Emphasize launching your own branded telehealth platform without building from scratch.",
  },
  {
    value: "clinic",
    label: "Clinics & pharma",
    guidance:
      "TARGET: clinic owners, medical practices and pharma decision-makers. TONE: credible, professional, industry-shift and partnership/authority — more B2B. CTA: book a call / partner with us. Frame telehealth + white-label as how clinics and pharma add a modern revenue stream and avoid being left behind.",
  },
];

export const SCRIPT_CATEGORIES: { value: ScriptCategory; label: string; context: string }[] = [
  {
    value: "weight_loss",
    label: "Weight loss",
    context:
      "ORVION's doctor-reviewed online weight loss / medical weight management program (UAE). Audience: people frustrated with diets, wanting a modern medical-backed approach.",
  },
  {
    value: "hair_loss",
    label: "Hair loss (men)",
    context:
      "ORVION's discreet doctor-reviewed online hair loss treatment for men (UAE). Audience: men noticing thinning/receding hair, self-conscious, want a private modern solution.",
  },
  {
    value: "mens_health",
    label: "Men's health",
    context:
      "ORVION's discreet doctor-reviewed online men's health care (UAE) — energy, performance, libido/ED, testosterone & hormone health, confidence. See orvionresearch.com/mens-health. Audience: men who want private, modern, expert help with energy, performance and confidence without an awkward clinic visit.",
  },
  {
    value: "womens_hair",
    label: "Women's hair",
    context:
      "ORVION's doctor-reviewed treatment for women's hair loss / thinning / shedding (UAE). Audience: women dealing with thinning, postpartum shedding, or breakage who want expert help.",
  },
  {
    value: "peptides",
    label: "Peptides",
    context:
      "ORVION's peptides for wellness, recovery, performance and longevity (UAE, doctor-reviewed). Audience: health-optimizers, gym-goers, biohackers curious about peptides.",
  },
  {
    value: "founder",
    label: "Founder",
    context:
      "The FOUNDER's personal brand. A biohacking + ecommerce entrepreneur building ORVION — a telehealth brand AND a white-label telehealth software other clinics/pharma/entrepreneurs can run their own version of. Content goals: (1) go viral and build authority, (2) attract clinics, pharma and entrepreneurs to launch their own telehealth business on the white-label software, (3) sell high-ticket ecommerce / telehealth courses, (4) mix in biohacking, peptides and health-optimization insight, (5) B2B thought-leadership. Positioning: the biohacking ecommerce guru who turned telehealth into a scalable business. CTA varies by post: DM a keyword, link in bio, book a call, join the course/waitlist, or get a software demo — pick what fits the angle.",
  },
];

// --- Persona blocks (topic + goals + voice) ---
const PRODUCT_PERSONA = `You are ORVION's elite short-form content scriptwriter for
a premium UAE-based, doctor-reviewed online health platform. You write viral-grade
content that speaks to patients/consumers and drives them to ORVION's care.`;

const FOUNDER_PERSONA = `You are the ghostwriter for the FOUNDER of ORVION — a
biohacking + ecommerce entrepreneur. You write viral, high-status, story-driven
content that builds the founder's personal brand and generates B2B + course leads.
You can be bold, contrarian and opinionated. Speak founder-to-audience ("I/we"),
not brand-to-customer. Blend ecommerce/business lessons, telehealth/white-label
software, and biohacking/peptides insight. The goal is reach + authority + leads
(clinics/pharma/entrepreneurs wanting their own telehealth business, and course
buyers).`;

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

const COMPLIANCE = `COMPLIANCE (non-negotiable):
- No medical guarantees, no "cure", no "guaranteed results", no fake success
  percentages, no naming prescription medications.
- Be responsible with peptides/biohacking — educational and honest, not hype or
  miracle claims. Premium, credible tone.`;

const OUTPUT = `OUTPUT — Output ONLY the post/script text. No preamble, no "Here's
your script", no analysis, no citations. Just the content, with line breaks.`;

function buildSystem(category: ScriptCategory, format: ScriptFormat, withSearch: boolean): string {
  const persona = category === "founder" ? FOUNDER_PERSONA : PRODUCT_PERSONA;
  const fmt = format === "linkedin" ? LINKEDIN_FORMAT : VIDEO_FORMAT;
  const process = withSearch
    ? `PROCESS: Do a QUICK web search (1-2 searches, don't over-research) for what is
currently going viral / trending around this topic — hooks, formats, angles, pain
points, debates. Pick the single strongest angle, then write ONE piece.`
    : `PROCESS: Use your knowledge of what goes viral around this topic (hooks,
formats, pain points, debates) to pick the strongest angle, then write ONE piece.`;
  return [persona, process, fmt, COMPLIANCE, OUTPUT].join("\n\n");
}

export interface ScriptResult {
  script: string;
  usedWebSearch: boolean;
}

/**
 * Generate viral content for a category + format + user brief. Uses Anthropic's web
 * search tool to ground it in what's currently trending; falls back to a no-tools
 * generation if web search is unavailable, and to a template if no key.
 */
export async function generateScript(args: {
  category: ScriptCategory;
  brief: string;
  knowledge?: string;
  avoid?: string[];
  format?: ScriptFormat;
  founderAngle?: FounderAngle;
}): Promise<ScriptResult> {
  const cat = SCRIPT_CATEGORIES.find((c) => c.value === args.category) ?? SCRIPT_CATEGORIES[0];
  const format: ScriptFormat = args.format ?? "video";
  const pieceWord = format === "linkedin" ? "LinkedIn post" : "video script";

  if (!aiConfigured()) {
    return { script: fallbackScript(cat.label, args.brief, format), usedWebSearch: false };
  }

  const angleBlock =
    args.category === "founder"
      ? `\nFOUNDER ANGLE — ${
          (FOUNDER_ANGLES.find((a) => a.value === (args.founderAngle ?? "course")) ?? FOUNDER_ANGLES[0]).guidance
        }\n`
      : "";

  const knowledgeBlock = args.knowledge?.trim()
    ? `\nIMPORTANT BRAND KNOWLEDGE — use this to focus the content (pages, offers, positioning, audience):\n${args.knowledge.trim()}\n`
    : "";

  const avoidBlock = args.avoid?.length
    ? `\nDO NOT REPEAT past content. We've already made these — use a DIFFERENT hook, angle and structure:\n` +
      args.avoid.map((a, i) => `${i + 1}. ${a.replace(/\s+/g, " ").slice(0, 160)}`).join("\n") +
      `\n`
    : "";

  const userPrompt =
    `Category: ${cat.label}\n` +
    `Context: ${cat.context}\n` +
    `Output format: ${pieceWord}\n` +
    angleBlock +
    knowledgeBlock +
    avoidBlock +
    `\nWhat we want:\n${args.brief.trim() || "(no extra notes — use your best judgment for a high-performing piece)"}\n\n` +
    `Find what's going viral around this right now, then write the single best ${pieceWord}. Make it clearly distinct from any past content listed above. Output only the ${pieceWord}.`;

  // Attempt with the web search tool first.
  try {
    const res = await anthropic().messages.create({
      model: MODEL,
      max_tokens: 1800,
      system: buildSystem(args.category, format, true),
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
    system: buildSystem(args.category, format, false),
    messages: [{ role: "user", content: userPrompt }],
  });
  return { script: clean(extractText(res)), usedWebSearch: false };
}

const ARABIC_SYSTEM = `You are an elite Arabic short-form scriptwriter for Instagram
Reels and TikTok in the Gulf/UAE market. You TRANSCREATE — never translate
literally. You take an English health-brand script and rewrite it as a natural,
punchy, native-sounding Arabic script that would actually go viral with a UAE/Gulf
audience.

RULES:
- Use clear Modern Standard Arabic with a light, natural Gulf flavor — the way
  real creators speak, not stiff formal Arabic and not heavy slang.
- Keep the SAME core idea, hook strength, and call to action, but make every line
  feel born in Arabic. Adapt idioms, rhythm and cultural references.
- Open with an equally strong scroll-stopping hook in the first line.
- Same compliance rules: no medical guarantees, no "cure", no naming prescription
  medications, responsible and premium tone.
- OUTPUT ONLY the Arabic script text. No transliteration, no English, no notes,
  no preamble. Just the Arabic words to say/show, with line breaks.`;

/** Transcreate an English script into a high-quality viral Arabic script. */
export async function translateToArabic(script: string, knowledge?: string): Promise<string> {
  if (!aiConfigured()) return script;
  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 1600,
    system: ARABIC_SYSTEM,
    messages: [{
      role: "user",
      content:
        (knowledge?.trim() ? `Brand knowledge (for context):\n${knowledge.trim()}\n\n` : "") +
        `Transcreate this into a viral Arabic Reels/TikTok script:\n\n${script}`,
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

function fallbackScript(category: string, brief: string, format: ScriptFormat): string {
  if (format === "linkedin") {
    return `Most people think ${category.toLowerCase()} is a product problem.

It's not. It's a trust problem.

We built ORVION around one idea: make expert, doctor-reviewed care feel modern, private and effortless — and make that same engine available to other operators as white-label software.

The lesson for founders: don't sell the thing. Sell the new standard.

${brief ? brief : ""}

If you're building in telehealth or ecommerce, let's talk.`.trim();
  }
  return `Nobody tells you this about ${category.toLowerCase()}…

If you've tried everything and nothing's working, it's probably not your fault — it's the approach.

Most people guess. They copy random advice online and hope.

The difference: a real plan, reviewed by actual experts, built around you.

${brief ? brief : ""}

If you're ready to stop guessing, the link's in bio.`.trim();
}
