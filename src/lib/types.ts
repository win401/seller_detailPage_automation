/**
 * Shared domain types for Seller Detail Page Automation.
 * Mirrors the data model draft in docs/MVP_PLAN.md and the section/AI
 * contracts defined in docs/PROMPTS.md. Keep these two docs and this file
 * in sync when the schema changes.
 */

// ---------- enums / option sets ----------

export type Platform = "coupang" | "smartstore" | "ably" | "zigzag";

export const PLATFORM_LABELS: Record<Platform, string> = {
  coupang: "쿠팡",
  smartstore: "스마트스토어",
  ably: "에이블리",
  zigzag: "지그재그",
};

/** Export width in px per platform (docs/MVP_PLAN.md §15). */
export const PLATFORM_EXPORT_WIDTH: Record<Platform, number> = {
  ably: 860,
  zigzag: 1000,
  smartstore: 860,
  coupang: 860,
};

export type Tone = "practical" | "trust" | "premium" | "warm";

export const TONE_LABELS: Record<Tone, string> = {
  practical: "실용적",
  trust: "신뢰감",
  premium: "프리미엄",
  warm: "감성적",
};

export type DesignMood = "minimal" | "natural" | "premium" | "colorful";

export const MOOD_LABELS: Record<DesignMood, string> = {
  minimal: "미니멀",
  natural: "내추럴",
  premium: "프리미엄",
  colorful: "컬러풀",
};

export type ThemeMode = "light" | "dark" | "system";

// ---------- section/style-set layout presets ----------
// Preset-based (not free-position) section layout controls. Keeps the editor
// block-based rather than free Figma-style placement, while still giving
// real editing range on image crop/position and section density.

export type ImagePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export const IMAGE_POSITION_CSS: Record<ImagePosition, string> = {
  "top-left": "left top",
  top: "center top",
  "top-right": "right top",
  left: "left center",
  center: "center center",
  right: "right center",
  "bottom-left": "left bottom",
  bottom: "center bottom",
  "bottom-right": "right bottom",
};

export type ImageFit = "cover" | "contain";

export const IMAGE_FIT_LABELS: Record<ImageFit, string> = {
  cover: "채우기",
  contain: "전체 보기",
};

export type ImageHeight = "compact" | "default" | "tall";

export const IMAGE_HEIGHT_LABELS: Record<ImageHeight, string> = {
  compact: "낮게",
  default: "기본",
  tall: "높게",
};

export type FontFamily = "system" | "pretendard" | "gmarket-sans" | "s-core-dream";

export const FONT_FAMILY_LABELS: Record<FontFamily, string> = {
  system: "기본",
  pretendard: "Pretendard",
  "gmarket-sans": "Gmarket Sans",
  "s-core-dream": "에스코어드림",
};

/** Layout preset fields shared by both a single section's override and a
 * style set's project-wide defaults. `spacing`/`textScale`/`letterSpacing`/
 * `lineHeight` are continuous px values (not presets) — see
 * layout-presets.ts's *_RANGE/*_DEFAULT constants and getSpacingStyle/
 * getHeadlineFontSizePx/getBodyFontSizePx/getLetterSpacingPx/getLineHeightPx
 * for how each is applied. Older saved drafts may still hold the retired
 * preset strings ("compact"/"default"/etc.) — every reader guards with
 * `typeof x === "number"`, so a legacy string is silently treated as unset
 * rather than crashing. */
export interface SectionLayoutPreset {
  imagePosition?: ImagePosition;
  imageFit?: ImageFit;
  imageHeight?: ImageHeight;
  /** Section padding, all sides, px. */
  spacing?: number;
  /** Body text font size, px — headline size is derived from this (see
   * getHeadlineFontSizePx). */
  textScale?: number;
  fontFamily?: FontFamily;
  /** Letter spacing, px. */
  letterSpacing?: number;
  /** Line height, absolute px (not a unitless multiplier). */
  lineHeight?: number;
}

// ---------- inline rich text (headline/body spans) ----------
// Real per-run styling (not string markers) so the editor can show bold/
// highlight live while typing. Scoped to exactly what the editor exposes
// today — extend only when a concrete need for more run-level properties
// shows up (docs/TASKS.md 우선순위 4, span 마이그레이션).

export interface TextRun {
  text: string;
  bold?: boolean;
  highlight?: boolean;
  fontFamily?: FontFamily;
}

export type RichText = TextRun[];

// ---------- section model (13-section detail page) ----------

export type SectionKind =
  | "intro"
  | "one_line"
  | "problem"
  | "solution"
  | "benefit_1"
  | "benefit_2"
  | "benefit_3"
  | "detail"
  | "use_scene"
  | "recommended_for"
  | "trust"
  | "faq"
  | "cta";

/** Canonical order + display kicker for the 13 fixed sections (docs/MVP_PLAN.md §6). */
export const SECTION_KIND_ORDER: SectionKind[] = [
  "intro",
  "one_line",
  "problem",
  "solution",
  "benefit_1",
  "benefit_2",
  "benefit_3",
  "detail",
  "use_scene",
  "recommended_for",
  "trust",
  "faq",
  "cta",
];

export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  intro: "Intro",
  one_line: "One Line Selling Point",
  problem: "Problem",
  solution: "Solution",
  benefit_1: "Key Benefit 1",
  benefit_2: "Key Benefit 2",
  benefit_3: "Key Benefit 3",
  detail: "Detail Point",
  use_scene: "Use Scene",
  recommended_for: "Recommended For",
  trust: "Trust Point",
  faq: "FAQ",
  cta: "CTA",
};

export type DetailBlockRole =
  | "notice"
  | "intro"
  | "problem"
  | "claim"
  | "material"
  | "feature"
  | "option"
  | "usage"
  | "guide"
  | "trust"
  | "spec"
  | "faq"
  | "policy"
  | "cta";

export type DetailBlockLayoutType =
  | "top_notice_banner"
  | "problem_hook"
  | "big_claim_band"
  | "material_closeup"
  | "before_after_compare"
  | "feature_blue_panel"
  | "evidence_card"
  | "option_grid"
  | "step_guide"
  | "comparison_table"
  | "review_summary"
  | "product_info_table"
  | "qa_list"
  | "brand_mood_story"
  | "color_lineup"
  | "care_guide"
  | "certification_stack"
  | "check_point_cards"
  | "policy_notice";

export interface DetailOptionItem {
  label: string;
  value?: string;
  description?: string;
  color?: string;
  imageUrl?: string;
}

export interface DetailSpecRow {
  label: string;
  value: string;
}

export interface DetailFaqItem {
  question: string;
  answer: string;
}

export interface DetailGuideItem {
  title: string;
  body: string;
  icon?: string;
}

export interface DetailProofItem {
  label: string;
  value: string;
  description?: string;
}

export interface DetailStepItem {
  title: string;
  body: string;
  imageUrl?: string;
}

export interface DetailComparisonRow {
  label: string;
  left: string;
  right: string;
}

export interface DetailBlockSlots {
  eyebrow?: string;
  subHeadline?: string;
  badges?: string[];
  items?: string[];
  caption?: string;
  brandName?: string;
  palette?: string[];
  swatches?: string[];
  beforeLabel?: string;
  afterLabel?: string;
  beforeImage?: string;
  afterImage?: string;
  image?: string;
  images?: string[];
  optionItems?: DetailOptionItem[];
  specRows?: DetailSpecRow[];
  faqItems?: DetailFaqItem[];
  guideItems?: DetailGuideItem[];
  proofItems?: DetailProofItem[];
  steps?: DetailStepItem[];
  comparisonRows?: DetailComparisonRow[];
  reviewItems?: string[];
  score?: string;
  cards?: DetailGuideItem[];
  noticeItems?: string[];
  emphasis?: string;
}

export interface DetailSection extends SectionLayoutPreset {
  id: string;
  kind: SectionKind;
  blockRole?: DetailBlockRole;
  layoutType?: DetailBlockLayoutType;
  slots?: DetailBlockSlots;
  /** Small label above the headline, e.g. "BENEFIT 01". */
  kicker: string;
  title: string;
  headline: RichText;
  body: RichText;
  bullets: string[];
  /** What role the section's image should play, e.g. "product-on-desk". */
  imageRole: string;
  imageUrl?: string;
  imageLabel?: string;
  imageSource?: "uploaded" | "reference" | "generated" | "mock";
  imageGradient?: string;
  imagePrompt?: string;
  /** Alternative copy candidates the user can swap in (docs/PROMPTS.md). */
  alternatives: string[];
}

// ---------- product input (create-project form) ----------

export interface EmphasisOption {
  key: string;
  label: string;
}

export interface ProductInput {
  productName: string;
  category: string;
  price?: string;
  keywords: string[];
  targetCustomer: string;
  emphasisPoints: string[];
  tone: Tone;
  designMood: DesignMood;
  platform: Platform;
  styleSetId?: string;
  imageDescription?: string;
  /** Optional free-text creative direction, e.g. "프리미엄 브랜드몰처럼". */
  additionalInstruction?: string;
}

export type CompetitorReferenceType =
  | "same_product"
  | "similar_product"
  | "design_reference"
  | "copy_reference"
  | "etc";

export interface CompetitorReferenceInput {
  id: string;
  url: string;
  memo: string;
  referenceType: CompetitorReferenceType;
}

export const ADDITIONAL_INSTRUCTION_EXAMPLES = [
  "프리미엄 브랜드몰처럼",
  "공구 느낌은 줄이고 담백하게",
  "첫 화면은 이미지 중심으로",
];

// ---------- style sets ----------

export interface StyleSet extends SectionLayoutPreset {
  id: string;
  userId: string;
  name: string;
  defaultMood: DesignMood;
  defaultTone: Tone;
  primaryColor: string;
  secondaryColor: string;
  defaultPlatform: Platform;
  /** Which section kinds are visible by default. */
  sectionVisibility: Partial<Record<SectionKind, boolean>>;
  brandNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- project ----------

export interface DetailPageProject {
  id: string;
  userId: string;
  styleSetId?: string;
  title: string;
  category: string;
  productInput: ProductInput;
  selectedPlatform: Platform;
  selectedMood: DesignMood;
  selectedTone: Tone;
  /** Section content keyed by section id. */
  sections: Record<string, DetailSection>;
  /** Display order of section ids (drag-to-reorder changes this array). */
  sectionOrder: string[];
  hiddenSectionIds: string[];
  assetPaths: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------- AI generation contract (docs/PROMPTS.md) ----------

export interface GenerateDetailPageInput {
  productName: string;
  category: string;
  keywords: string[];
  targetCustomer: string;
  emphasisPoints: string[];
  tone: Tone;
  designMood: DesignMood;
  platform: Platform;
  imageDescription?: string;
  /** Uploaded product photo as a data URL — used as image-editing reference input
   * for per-section AI image generation (docs/MVP_PLAN.md §5), not sent to the
   * copywriting agents. */
  productImageDataUrl?: string;
  additionalInstruction?: string;
}

export interface GenerateDetailPageOutput {
  sections: DetailSection[];
  source?: "ai" | "mock";
  warnings?: string[];
}

// ---------- agent workflow draft contract (docs/MVP_PLAN.md data model) ----------

export type AgentType =
  | "orchestrator"
  | "analysis"
  | "planning"
  | "production"
  | "review"
  | "revision_planning"
  | "style_signal_summary";

export type AgentRunStatus = "pending" | "running" | "succeeded" | "failed" | "mocked";

export interface AgentRunDraft {
  id: string;
  agentType: AgentType;
  status: AgentRunStatus;
  title: string;
  summary: string;
  output: Record<string, unknown>;
  warnings: string[];
  createdAt: string;
  /** agent_runs.id of the orchestrator run that invoked this run, if any (docs/supabase/schema.sql). */
  parentRunId?: string;
}

export interface AgentWorkflowDraft {
  competitorReferences: CompetitorReferenceInput[];
  /** Always [analysis, planning, production, review] in this order — UI relies on positional access. */
  runs: AgentRunDraft[];
  revisionEnabled: boolean;
  /** The supervising orchestrator's own run, if the real (non-mock) pipeline ran. */
  orchestratorRun?: AgentRunDraft;
}

// ---------- user style signal draft contract (localStorage now, Supabase later) ----------

export type UserStyleSignalKind =
  | "copy_manual_edit"
  | "headline_choice"
  | "section_reorder"
  | "section_visibility"
  | "section_image_choice"
  | "planner_revision_apply";

export interface UserStyleSignalDraft {
  id: string;
  projectId: string;
  sectionId?: string;
  sectionTitle?: string;
  kind: UserStyleSignalKind;
  before?: string;
  after?: string;
  summary: string;
  createdAt: string;
}

// ---------- AI editing assistant contract (docs/PROMPTS.md) ----------

export type AiEditAction =
  | "rewrite_section"
  | "shorten_section"
  | "soften_tone"
  | "premium_tone"
  | "rewrite_faq"
  | "rewrite_cta"
  | "check_exaggeration";

export interface AiQuickAction {
  id: AiEditAction;
  label: string;
}

export const AI_QUICK_ACTIONS: AiQuickAction[] = [
  { id: "shorten_section", label: "짧게 줄이기" },
  { id: "soften_tone", label: "차분한 톤으로" },
  { id: "premium_tone", label: "프리미엄 톤으로" },
  { id: "check_exaggeration", label: "과장 표현 검토" },
  { id: "rewrite_faq", label: "FAQ 다시 쓰기" },
  { id: "rewrite_cta", label: "CTA 다시 쓰기" },
];

export interface AiEditRequest {
  productInput: ProductInput;
  selectedSection: DetailSection;
  action?: AiEditAction;
  freeText?: string;
}

export interface AiEditResponse {
  action: AiEditAction | "";
  summary: string;
  updatedSection: Pick<DetailSection, "id" | "title" | "headline" | "body" | "bullets">;
  warnings: string[];
  alternatives: string[];
}

// ---------- image enhancement/compositing contract (docs/PROMPTS.md, 2차 scope) ----------

export interface ImageEnhancementDirection {
  sectionId: string;
  imagePurpose: string;
  referenceAnalysis: {
    composition: string;
    lighting: string;
    background: string;
    colorPalette: string;
    spacing: string;
  };
  generationPrompt: string;
  negativePrompt: string;
  compositingNotes: string[];
  safetyChecks: string[];
}

export interface UploadedImageDraft {
  dataUrl: string;
  name: string;
  size: number;
  type: string;
  originalSize?: number;
  originalWidth?: number;
  originalHeight?: number;
  optimizedWidth?: number;
  optimizedHeight?: number;
  optimized?: boolean;
}

export interface SectionImageAsset {
  id: string;
  label: string;
  description: string;
  source: "uploaded" | "reference" | "generated" | "mock";
  dataUrl?: string;
  gradient?: string;
  promptHint: string;
  tags: string[];
}

// ---------- seller-uploaded image pool (docs/TASKS.md 우선순위 1) ----------

/** UI labeling taxonomy for "what kind of shot does this slot need" — a
 * display hint only, never enforced. Matches docs/TASKS.md's 7 categories. */
export type ImageSlotCategory =
  | "hero"
  | "product_solo"
  | "material"
  | "usage_scene"
  | "option"
  | "size_spec"
  | "policy";

export const IMAGE_SLOT_CATEGORY_LABELS: Record<ImageSlotCategory, string> = {
  hero: "히어로",
  product_solo: "제품 단독컷",
  material: "소재 디테일",
  usage_scene: "사용 장면",
  option: "옵션",
  size_spec: "사이즈/스펙",
  policy: "정책",
};

/** Best-effort suggested category per section kind, for labeling only —
 * keyed by SectionKind (13, stable) rather than layoutType (19, varies per
 * template family) or imageRole (free text, dozens of values in practice). */
export const SECTION_KIND_SLOT_CATEGORY: Record<SectionKind, ImageSlotCategory> = {
  intro: "hero",
  one_line: "hero",
  problem: "usage_scene",
  solution: "product_solo",
  benefit_1: "material",
  benefit_2: "option",
  benefit_3: "usage_scene",
  detail: "material",
  use_scene: "usage_scene",
  recommended_for: "usage_scene",
  trust: "size_spec",
  faq: "policy",
  cta: "policy",
};

/** Mirrors a project_image_assets row (docs/supabase/schema.sql). */
export interface ProjectImageAsset {
  id: string;
  projectId: string;
  storagePath: string;
  publicUrl: string;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  slotCategory: ImageSlotCategory | null;
  createdAt: string;
}

/** The 8 layoutTypes that actually render a BlockImage today (out of 19) —
 * used to decide which sections the image-manager dialog lists. See
 * section-canvas.tsx's StructuredSectionBlock for the render branches this
 * mirrors; keep in sync if a layoutType's image usage changes. */
export const BLOCK_IMAGE_LAYOUT_TYPES: DetailBlockLayoutType[] = [
  "brand_mood_story",
  "big_claim_band",
  "problem_hook",
  "material_closeup",
  "before_after_compare",
  "feature_blue_panel",
  "color_lineup",
  "evidence_card",
];

// ---------- editor UI state ----------

export type EditorLayout = "horizontal" | "vertical";
export type EditorTab = "sections" | "edit" | "agents" | "ai";

// ---------- dashboard summary ----------

export interface ProjectSummary {
  id: string;
  name: string;
  category: string;
  platform: Platform;
  updatedAtLabel: string;
}
