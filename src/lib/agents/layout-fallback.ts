import { DetailBlockLayoutType, DetailBlockRole, DetailBlockSlots } from "@/lib/types";

/**
 * layoutType -> blockRole is a stable 1:1 mapping across every template
 * family in detail-page-templates.ts (living/functional/wellness) — no
 * layoutType is ever paired with more than one role there. Deriving it here
 * instead of asking the production agent to pick both removes a whole class
 * of "layout and role don't match" AI failures for free.
 *
 * `review_summary` has no render branch in section-canvas.tsx's
 * StructuredSectionBlock (dead layoutType, excluded from
 * APPROVED_DETAIL_BLOCK_LAYOUT_TYPES in schemas.ts) — included here only for
 * type completeness, this branch is unreachable in practice.
 */
export const BLOCK_ROLE_BY_LAYOUT_TYPE: Record<DetailBlockLayoutType, DetailBlockRole> = {
  top_notice_banner: "notice",
  brand_mood_story: "intro",
  problem_hook: "problem",
  big_claim_band: "claim",
  material_closeup: "material",
  before_after_compare: "feature",
  feature_blue_panel: "feature",
  color_lineup: "option",
  option_grid: "option",
  evidence_card: "trust",
  step_guide: "guide",
  comparison_table: "trust",
  care_guide: "guide",
  check_point_cards: "trust",
  certification_stack: "trust",
  product_info_table: "spec",
  qa_list: "faq",
  policy_notice: "policy",
  review_summary: "trust",
};

/**
 * Which DetailBlockSlots keys each layoutType's JSX branch (section-canvas.tsx)
 * actually reads for its core content — not every slot field a layout touches,
 * only the ones that make the block look empty/broken if missing. Layouts
 * that already have a hardcoded JSX fallback (material_closeup's badges,
 * before/afterLabel, policy_notice's noticeItems) or that render from
 * `section.bullets` instead of slots are intentionally left as `[]`.
 */
export const REQUIRED_SLOT_KEYS_BY_LAYOUT_TYPE: Record<DetailBlockLayoutType, (keyof DetailBlockSlots)[]> = {
  top_notice_banner: ["badges"],
  brand_mood_story: [],
  big_claim_band: [],
  problem_hook: [],
  material_closeup: [],
  before_after_compare: ["comparisonRows"],
  feature_blue_panel: [],
  color_lineup: ["optionItems"],
  option_grid: ["optionItems"],
  evidence_card: ["proofItems"],
  step_guide: ["steps"],
  comparison_table: ["comparisonRows"],
  care_guide: ["guideItems"],
  check_point_cards: ["cards"],
  certification_stack: ["proofItems"],
  product_info_table: ["specRows"],
  qa_list: ["faqItems"],
  policy_notice: [],
  review_summary: [],
};

export function deriveBlockRole(layoutType: DetailBlockLayoutType): DetailBlockRole {
  return BLOCK_ROLE_BY_LAYOUT_TYPE[layoutType];
}

/**
 * detailBlockSlotsSchema (schemas.ts) uses .nullable() instead of .optional()
 * on every field — required by OpenAI's strict structured-output mode, which
 * rejects any schema property missing from `required` (confirmed by a live
 * 400 invalid_json_schema error when this used .optional()). That means the
 * parsed AI output has `string | null` / `T[] | null` where DetailBlockSlots
 * (types.ts) expects `| undefined`. This recursively converts null -> undefined
 * so the result is assignable to DetailBlockSlots and so isEmptyValue's
 * undefined/empty-array checks in backfillSectionSlots behave the same way
 * regardless of which one the model actually produced.
 */
export function stripNullSlotValues(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(stripNullSlotValues);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, v]) => [key, stripNullSlotValues(v)])
    );
  }
  return value;
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Generic over a single key so `target[key] = source[key]` stays type-safe
 * (a plain for-of loop over `keyof DetailBlockSlots` would widen to the
 * whole union and TS would reject the assignment). */
function backfillKey<K extends keyof DetailBlockSlots>(
  target: DetailBlockSlots,
  source: DetailBlockSlots,
  key: K
): void {
  if (isEmptyValue(target[key]) && source[key] !== undefined) {
    target[key] = source[key];
  }
}

/**
 * Soft-failure recovery: the model picked a valid (enum-approved) layoutType
 * but left one of its required slot keys empty (e.g. `qa_list` with
 * `faqItems: []`). Only those specific missing keys are backfilled from the
 * matching mock template section — every other AI-provided slot key, and
 * every other section in the draft, is left untouched. Hard failures (the
 * whole generateText call throwing) are handled separately in production.ts
 * by falling back to the entire mock draft, unchanged by this function.
 */
export function backfillSectionSlots(
  layoutType: DetailBlockLayoutType,
  aiSlots: DetailBlockSlots,
  templateSlots: DetailBlockSlots
): DetailBlockSlots {
  const result: DetailBlockSlots = { ...aiSlots };
  for (const key of REQUIRED_SLOT_KEYS_BY_LAYOUT_TYPE[layoutType]) {
    backfillKey(result, templateSlots, key);
  }
  return result;
}
