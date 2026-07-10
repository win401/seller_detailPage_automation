# Claude Handoff

Last updated: 2026-07-09

## Project

- Project name: Seller Detail Page Automation
- Repo: `https://github.com/win401/seller_detailPage_automation.git`
- Local path: `/Users/sungwoo/Desktop/work/class/mini_pj/seller-detail-page-automation`
- Branch: `main`
- Latest pushed commit before this handoff: `965da68 Make editor save failures diagnosable`

This is a mini project for an AI-powered seller detail page creation tool. The current MVP focuses on:

- Product input
- Product image upload and browser-side optimization
- Competitor detail page URL/memo input, without automatic crawling
- AI/mock agent flow: analysis -> planning -> production -> review
- 13-section detail page draft
- Desktop editor with mobile portrait preview canvas
- Manual copy/image/section edits
- User style signal capture
- Supabase Auth and project persistence
- Platform-width ZIP export with 2000px vertical image slicing

Do not mix this project with other topics such as traditional market review analysis, tourism, or hackathon ideas.

## Current Status

The MVP end-to-end flow is implemented locally:

- product input
- image upload/optimization
- competitor URL/memo input without crawling
- agent workflow UI with mock fallback
- 13-section editor canvas
- manual editing and style signal capture
- planner revision request API route with mock fallback
- Supabase/localStorage save structure
- platform-width ZIP export

Actual AI API response quality has not been fully tested yet. Keep AI work split into:

- route/schema/workflow wiring
- live model/API validation

Do not mark live AI quality as complete until it has been tested with the intended API key/model.

## Supabase Deployment Note

If saving fails on deployed Vercel, first confirm whether Supabase has the required tables.

Observed error:

```text
Supabase draft save failed: SupabaseSaveError: 프로젝트 생성 실패: Could not find the table 'public.detail_page_projects' in the schema cache
```

Meaning:

- Vercel env vars are likely connected.
- The Supabase project exists.
- But the database schema has not been applied, or PostgREST schema cache has not reloaded.

Immediate fix:

1. Open Supabase Dashboard.
2. Go to `SQL Editor`.
3. Run the full contents of:
   `/Users/sungwoo/Desktop/work/class/mini_pj/seller-detail-page-automation/docs/supabase/schema.sql`
4. After running it, also run:

```sql
NOTIFY pgrst, 'reload schema';
```

5. Confirm these tables exist in Table Editor:
   - `profiles`
   - `detail_page_projects`
   - `draft_versions`
   - `agent_runs`
   - `competitor_references`
   - `user_style_signals`
   - `usage_events`

After this, a redeploy should not be required. Refresh the deployed app and test save again.

## Completed Implementation Summary

### Auth

- Supabase browser client added.
- Login page exists.
- Signup page exists at `/signup`.
- Account menu in top nav supports settings and logout.
- Settings page exists at `/settings`.
- Email SMTP/Resend is postponed. Supabase auth email rate limit was hit during testing, so team test users may be manually created in Supabase Dashboard.

### Dashboard

- Dashboard reads projects from Supabase `detail_page_projects`.
- Hardcoded project cards were removed.
- If logged out, unconfigured, loading, empty, or error, dashboard shows a state message instead of sample projects.

Important file:

- `src/app/(app)/dashboard/page.tsx`

### New Project Flow

- Page: `/projects/new`
- Product fields are wired into `GenerateDetailPageInput`.
- Competitor URLs/memos are accepted as reference input only. No real crawling.
- Agent workflow is shown as analysis -> planning -> production -> review.
- Calls `/api/generate-detail-page`.
- If AI fails, mock fallback generates a 13-section draft.
- When logged in and schema exists, it attempts to save:
  - `detail_page_projects`
  - `competitor_references`
  - `agent_runs`
  - `draft_versions`
  - `current_draft_version_id`
- It also keeps localStorage fallback.

Important file:

- `src/app/(app)/projects/new/page.tsx`

### Editor

- Page: `/projects/[id]/editor`
- Loads Supabase draft when `id` is a UUID.
- Falls back to localStorage draft.
- If no persisted data exists, it shows mock section structure.
- Can edit selected section copy.
- Can apply mock/reference/section images.
- Can hide sections and reorder selected section via up/down controls.
- Has undo/redo stack and keyboard shortcut support.
- Has planner-agent style revision panel with mock fallback.
- Saves style signals to localStorage and tries Supabase `user_style_signals`.
- Save button now:
  - writes localStorage first
  - attempts Supabase save to `draft_versions`
  - creates a Supabase project if the current local project id is a fallback id such as `p1`
  - updates `current_draft_version_id` best-effort
  - shows detailed Supabase error messages
- ZIP export now attempts to save before download.

Important file:

- `src/app/(app)/projects/[id]/editor/page.tsx`

### Export

- Uses `html-to-image` and `jszip`.
- Applies platform width from `PLATFORM_EXPORT_WIDTH`.
- Slices long detail page into 2000px vertical PNG chunks.
- Downloads a ZIP with numbered PNG files and `export-info.json`.

### AI

- Vercel AI SDK is installed and route exists.
- Current local code uses OpenAI SDK routes with mock fallback.
- Actual live AI API quality testing is still pending.
- Mock fallback is intentionally preserved so the MVP can demo without live AI.

Important files:

- `src/app/api/generate-detail-page/route.ts`
- `src/app/api/agent-workflow/generate/route.ts`
- `src/app/api/agent-workflow/revise/route.ts`
- `src/lib/agents/orchestrator.ts`
- `src/lib/agents/revision.ts`
- `src/lib/mock-ai.ts`
- `docs/PROMPTS.md`

### Supabase

- Schema draft exists at `docs/supabase/schema.sql`.
- RLS policies are included in that SQL.
- Data model spreadsheet exists at `docs/seller_detail_page_data_model.xlsx`.
- The live Supabase project still needs the schema SQL applied.

## Important Product Decisions

- The tool is for sellers using a desktop browser.
- “Mobile first” means the output canvas previews a mobile portrait detail page, not that sellers primarily use the tool on mobile.
- Real crawling is not part of MVP. The app accepts competitor URLs and user notes as references.
- Pinterest API integration is not in MVP. Pinterest-like references are mocked.
- Free-form Figma-like design editing is not the MVP direction. The editor should remain block/section-based so the service has value beyond “just use Figma.”
- Canvas advanced controls (zoom in/out buttons, Space+drag pan, double-click inline text edit) were implemented in the editor canvas. ZIP export deliberately captures an unscaled node so on-screen zoom never affects export dimensions.
- Vertical monitor-specific layout is postponed after real usage showed horizontal work mode is better even on a vertical monitor.
- Business expansion/sourcing automation ideas were intentionally removed from mini-project docs. Keep this project focused on the mini-project MVP.

## Known Issues / Risks

1. Supabase schema has not been applied to live project.
   - This blocks project save on deployed app.
   - Error already confirms missing `public.detail_page_projects`.

2. RLS has not been tested with real team accounts.
   - After applying schema, test that each account only sees its own projects.

3. Supabase Auth email confirmation/rate limit.
   - Email sending hit rate limits.
   - For now, manually create 3 team test accounts in Supabase Dashboard.
   - SMTP/Resend can be added later.

4. AI live generation confirmed working 2026-07-10 with `AI_MODEL=gpt-4.1-mini` — all 4 agents (analysis/planning/production/review) returned real responses, no mock fallback. Previously `gpt-5.4-mini` (a reasoning model) intermittently failed the `planning` step with `AI_NoOutputGeneratedError` because reasoning tokens were eating the whole `maxOutputTokens` budget before any visible output — fixed by switching model and raising `maxOutputTokens` in `analysis.ts`/`planning.ts`/`review.ts`.
   - Mock fallback keeps demo usable regardless.

5. Dashboard now shows only Supabase projects.
   - This is intentional.
   - If schema/env/session is missing, it will not show old hardcoded samples.

6. Live AI revision behavior has not been quality-tested.
   - `/api/agent-workflow/revise` is wired.
   - If live AI fails, fallback now respects the selected section id.
   - Re-test with the intended model before demo claims about AI quality.

## Recommended Next Steps

1. Apply `docs/supabase/schema.sql` in Supabase SQL Editor.
2. Run `NOTIFY pgrst, 'reload schema';`.
3. Refresh deployed app.
4. Log in with a manually-created test account.
5. Create a new detail page.
6. In editor, click `저장`.
7. Return to dashboard and confirm the project appears.
8. Test with a second account and confirm project isolation.
9. Test ZIP download after save.
10. Test live AI only after API/model setup is confirmed.
11. If saving still fails, copy the exact toast message. The app now exposes detailed Supabase save errors.

## Suggested Claude Work Items

### A. Verify Supabase save flow

- Once schema is applied, test:
  - new project creation
  - editor save
  - dashboard list
  - reopening editor from dashboard
  - ZIP download after save

### B. Improve save UI

Current save UX is functional but not polished.

Suggested improvements:

- Show a persistent save status badge in editor toolbar:
  - `로컬 저장됨`
  - `DB 저장됨`
  - `DB 저장 실패`
- Add a small “마지막 저장 시간” label.
- If Supabase schema is missing, show a clearer admin-facing message.

### C. RLS smoke test

After schema is applied:

- Create project with account A.
- Log out.
- Log in with account B.
- Confirm account B cannot see account A’s project.
- Confirm direct URL to account A project does not load data for account B.

### D. ZIP export verification

- Create a long detail page.
- Download ZIP.
- Check all PNG slices.
- Confirm bottom content is not cut.
- If cropped, inspect `html-to-image` source height and slice height calculation.

### E. Live AI smoke test

Do this only after API/model setup is ready.

- Generate a new project.
- Confirm analysis/planning/production/review runs are `succeeded`, not `mocked`.
- Send a selected-section revision request.
- Confirm the changed section matches the selected section.
- Confirm unsupported claims are not introduced.

### F. Canvas/editor polish

Postponed but useful:

- dnd-kit section reorder
- Better selected section controls
- Better empty/loading/error states
- Save status feedback

## Verification Commands

Run from:

```bash
cd /Users/sungwoo/Desktop/work/class/mini_pj/seller-detail-page-automation
```

Commands:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Last known results:

- `npm run lint`: passed
- `npx tsc --noEmit`: passed
- `npm run build`: passed

## Recent Commits

```text
965da68 Make editor save failures diagnosable
ab10d4d Persist editor saves to Supabase
5f117e9 Remove hardcoded project samples
70f94cc Load editor drafts from Supabase
48a4c31 Fix account dropdown crash
d04b4a9 Add account menu and settings page
f282099 Add dedicated signup page
a3854c0 Load dashboard projects from Supabase
```

## Key Files

- `README.md`
- `AGENTS.md`
- `docs/PROJECT_BRIEF.md`
- `docs/MVP_PLAN.md`
- `docs/TASKS.md`
- `docs/PROMPTS.md`
- `docs/CLAUDE_DESIGN_PROMPT.md`
- `docs/supabase/schema.sql`
- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/projects/new/page.tsx`
- `src/app/(app)/projects/[id]/editor/page.tsx`
- `src/app/api/generate-detail-page/route.ts`
- `src/lib/types.ts`
- `src/lib/mock-ai.ts`
- `src/lib/mock-data.ts`
- `src/lib/supabase/client.ts`

## Notes for Claude

- Keep the service block-based, not full free-position Figma-style editing.
- Keep real crawling out of MVP.
- Keep mock fallback until live AI billing is stable.
- Treat Supabase schema application as the first blocker before changing save logic again.
- Do not reintroduce hardcoded project cards on dashboard.
- Do not add business-expansion/sourcing-automation language back into the mini-project docs.
