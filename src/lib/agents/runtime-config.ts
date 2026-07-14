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
