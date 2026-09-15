import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL, aiConfigured } from "./anthropic";

/**
 * One-shot AI research pass over a business's own website (plus a little web
 * search for anything not on-site, like social handles) to produce a solid
 * starting knowledge-base entry. Meant to be triggered once from Settings
 * when a company sets up its Business profile — the result is appended to
 * the knowledge base for a human to review/edit like any other note, never
 * auto-applied anywhere else.
 */
export async function scanWebsiteForKnowledge(websiteUrl: string, businessName?: string): Promise<string> {
  if (!aiConfigured()) throw new Error("AI is not configured (ANTHROPIC_API_KEY missing).");

  const system = `You are researching a business to brief an influencer-outreach team.
Visit and read ${websiteUrl}${businessName ? ` (business name: "${businessName}")` : ""} using the
web search tool, and look at a few of its key pages (about, products/services, locations,
FAQ, activities) if linked from it. Also check whether its Instagram/TikTok handles are
mentioned anywhere.

You have a TIGHT token budget — do at most 2-3 searches total, do not narrate what
you're about to search for or comment between searches, and do not explain your
process. As soon as you have enough to write something useful, stop searching and go
straight to your final answer.

Your final answer is a compact, factual knowledge-base entry for internal use — what
they sell/do, locations, notable specifics (pricing, activities, ingredients, unique
selling points), any existing creator/affiliate program terms if mentioned, and social
handles. Short bullet points, no fluff, no invented details — only what you actually
found. If you can't access the site or find much, say so plainly instead of guessing.

Wrap ONLY that final entry between <entry> and </entry> tags, like:
<entry>
- ...
- ...
</entry>
This must be the LAST thing you write, and must appear even if your research was
limited. Nothing outside the tags is kept.`;

  const res = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 4000,
    system,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 } as any],
    messages: [{ role: "user", content: `Research ${websiteUrl} and summarize it as described.` }],
  });

  const full = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const match = full.match(/<entry>([\s\S]*?)<\/entry>/i);
  const text = match?.[1]?.trim();

  // Only trust text inside the <entry> tags — anything else is search
  // narration, not a real answer. Fail loudly instead of saving it.
  if (!text) throw new Error("The AI didn't finish its research in time — try again.");
  return text;
}
