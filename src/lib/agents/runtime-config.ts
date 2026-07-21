/**
 * AI calls stay opt-in during UI/template development. This keeps new draft
 * creation instant and cost-free until a live quality test is explicitly run.
 */
export function isLiveAiEnabled() {
  return process.env.ENABLE_LIVE_AI === "true";
}

export function getMockReason() {
  return "ENABLE_LIVE_AI가 true가 아니어서 mock 시안을 사용했습니다.";
}

/** Shared generateText() wall-clock timeout for a single leaf-agent call
 * (analysis/planning/review/revision) — the orchestrator's step-count
 * breaker bounds cost, not time, so without this a slow provider response
 * could hang indefinitely instead of falling back to mock. Measured live: a
 * plain small-schema call takes ~2s, but planning's fuller sectionPlan
 * output can take noticeably longer, so this has real headroom above that. */
export const AI_CALL_TIMEOUT_MS = 45_000;

/** Production's own timeout — its schema is far heavier than the other leaf
 * agents (13 sections, each carrying a full layoutType + slots object now
 * that structured layout selection is live, docs/TASKS.md 우선순위 2), and
 * measured live generation took ~59s at maxOutputTokens: 8000. */
export const PRODUCTION_CALL_TIMEOUT_MS = 120_000;

/** The orchestrator's own generateText call wraps a tool-calling loop that
 * can invoke up to 4 leaf agents in sequence (analysis/planning/production/
 * review) plus its own reasoning steps between tool calls — so its outer
 * timeout must cover the sum of those (production alone can take ~1-2min),
 * not match a single leaf call's budget. */
export const ORCHESTRATOR_CALL_TIMEOUT_MS = 280_000;
