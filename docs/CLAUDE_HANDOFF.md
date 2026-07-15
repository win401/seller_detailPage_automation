# Claude Handoff

> Last updated: 2026-07-15
> Branch: `main`
> Latest baseline commit: `58f322c docs: refresh task roadmap`

## Project

- Name: Seller Detail Page Automation
- Repository: `https://github.com/win401/seller_detailPage_automation.git`
- Product: a desktop-first tool that helps Coupang and Smart Store sellers create a structured long-form detail-page draft from product information and photos.

The seller works on desktop. The center editor canvas previews a narrow mobile-style detail page, which is then exported as platform-width image slices in a ZIP file.

Do not mix this work with unrelated market-review, tourism, hackathon, sourcing-automation, payment, or direct marketplace-upload projects.

## Current Product State

The end-to-end MVP is implemented:

1. Supabase Auth login/signup/logout and project dashboard
2. New-project form with product input, product/reference images, and competitor URL/memo
3. Client-side image optimization (1200px resize, WebP/JPEG compression)
4. Analysis → planning → production → review agent workflow
5. Structured 13-section detail-page draft
6. Desktop editor with copy editing, image replacement, hide/restore, DnD reorder, undo/redo, zoom, Space-drag pan, and planner-agent revision requests
7. Supabase draft persistence with localStorage fallback
8. ZIP export with platform-width rendering and 2000px vertical slicing

### Generation Mode

- Mock generation is the default. It is instant, deterministic, and cost-free.
- Live AI runs only when `ENABLE_LIVE_AI=true`.
- The default live model is `gpt-4.1-mini` through Vercel AI SDK.
- Keep mock fallback. Do not turn live AI on by default or remove the fallback without an explicit request.

### Detail-page Rendering

The current renderer is block-based. AI must not generate arbitrary HTML/CSS.

- Three template families: `living`, `functional`, `wellness`
- Draft structure: `blockRole + layoutType + slots`
- Canvas and ZIP export use the same React block renderer.
- Implemented layouts include hero/story, problem hook, benefit band, material detail, comparison, feature panel, option/color lineup, evidence, step guide, care guide, checklist, product information table, FAQ, and policy notice.
- The old gradient-only visual blocks were replaced with photo-like mock visuals.
- Legacy drafts are normalized to structured layouts on load.

### Style Sets

- CRUD exists at `/styles`.
- Style sets apply mood, tone, platform, and layout presets to new/existing drafts.
- They are currently local-first (`src/lib/style-sets.ts`); Supabase sync for expanded layout fields is not implemented yet.

### Persistence

- Schema: `docs/supabase/schema.sql`
- Core tables: `profiles`, `style_sets`, `detail_page_projects`, `competitor_references`, `agent_runs`, `draft_versions`, `user_style_signals`, `usage_events`
- RLS baseline exists. Validate the active Supabase project schema before changing persistence logic.
- `competitor_references` currently stores seller-entered URL/memo per project; it is not yet the admin EDA corpus.

## Non-negotiable Product Decisions

- Keep the editor block-based. Do not turn it into a free-positioned Figma clone.
- "Mobile-first" describes the output detail-page canvas, not a mobile seller workspace.
- Horizontal desktop workspace is the preferred working mode. Vertical-monitor-specific UI is deferred.
- No automated crawling in the seller-facing MVP.
- Do not use Pinterest API in the current MVP path.
- Do not add image generation/compositing as a dependency for the next implementation step. Use seller-uploaded images first.
- Keep app light/dark modes separate from the exported detail-page canvas appearance.

## Next Work: Follow `docs/TASKS.md`

The task order has been intentionally reset. Do not skip directly to a large new feature.

1. Verify current local and Vercel end-to-end behavior: auth → mock generation → edit → save/reload → ZIP.
2. Make seller-uploaded images reliably fill structured block image slots and persist through reload/export.
3. Update live AI production output to the existing structured layout contract.
4. Evolve style sets into reusable layout systems with a preview canvas and Supabase persistence.
5. Only then build the admin competitor-image analysis / EDA surface.

## Admin Competitor Image Analysis: Planned, Not Implemented

The planned admin feature accepts manually uploaded long screenshots from other seller detail pages. It does not start with URL crawling.

Target records:

- `competitor_references`: source metadata only
- `competitor_reference_assets`: uploaded screenshot files and order
- `competitor_analysis_runs`: page-level EDA results and model/run history
- `competitor_reference_sections`: one detected section per row, including position, ratios, OCR copy, copy classification, and confidence

EDA covers whitespace, subject/text/image ratio, visual safe areas, section order, OCR, 13-section classification, copy length/tone/pain point/benefit/evidence/CTA signals. Treat typography obtained from screenshots as an estimate with confidence, not original CSS values.

## Important Files

- `docs/TASKS.md` — current roadmap and source of truth for next work
- `docs/supabase/schema.sql` — current schema baseline
- `src/app/(app)/projects/new/page.tsx` — form, generation progress, project creation
- `src/app/(app)/projects/[id]/editor/page.tsx` — editor state, persistence, export, style signals
- `src/components/editor/section-canvas.tsx` — shared block renderer
- `src/lib/detail-page-templates.ts` — structured mock template families
- `src/lib/mock-ai.ts` — deterministic mock generation
- `src/lib/agents/runtime-config.ts` — live/mock toggle
- `src/lib/agents/orchestrator.ts` — agent workflow orchestration
- `src/lib/style-sets.ts` and `src/app/(app)/styles/page.tsx` — current local-first style sets
- `src/components/app-shell/nav-bar.tsx` — future admin reference-analysis entry point

## Verification Commands

Run from the repository root:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Before claiming a feature complete, verify its visible workflow in the running app as well as its build.
