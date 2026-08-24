// Deterministic compliance guardrails applied to every generated/edited message
// BEFORE it can be approved to send. Cheap, fast, no API needed.

export interface ComplianceResult {
  passed: boolean;
  issues: string[];
}

const BANNED_PATTERNS: { re: RegExp; issue: string }[] = [
  { re: /\b(cure|cures|cured|curing)\b/i, issue: "Uses 'cure' language" },
  { re: /\bguarantee(d|s)?\b/i, issue: "Makes a guarantee" },
  { re: /\b100%\s*(results?|effective|guaranteed)\b/i, issue: "Absolute results claim" },
  { re: /\bbefore\s*(&|and|\/)?\s*after\b/i, issue: "Before/after claim" },
  { re: /\b(finasteride|minoxidil|dutasteride|ozempic|wegovy|semaglutide|tadalafil|sildenafil|viagra)\b/i,
    issue: "Names a medication in cold outreach" },
  { re: /\b(miracle|instant|overnight|permanent fix)\b/i, issue: "Overhyped claim" },
  { re: /\b(act now|limited time|don'?t miss|last chance|hurry)\b/i, issue: "Pressure language" },
  { re: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, issue: "Contains emoji" },
];

export function checkCompliance(text: string): ComplianceResult {
  const issues: string[] = [];
  for (const { re, issue } of BANNED_PATTERNS) {
    if (re.test(text)) issues.push(issue);
  }
  // Length guard: keep DMs concise.
  if (text.length > 900) issues.push("Message too long (>900 chars)");
  return { passed: issues.length === 0, issues };
}
