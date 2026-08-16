# Session kickoff — generate-plan 502 resolved, provider routing settled

Written 2026-08-16 03:25 BST by normal handoff. Identical in substance to `HANDOFF.md`.

The live `generate-plan` 502 is fixed and verified on deployed **v11**: HTTP 200, real AI plans,
3.3-5.5s end to end. Root cause was a CN jurisdiction guardrail on the OpenRouter account blocking
DeepSeek's endpoint, not a code defect. Routing is now `only: ["coreweave","wafer"]` with failover
between those two only, chosen by a 30-trial-per-provider benchmark.

Session work is uncommitted in the working tree. Preserve Oscar's unstaged `package.json` and
`package-lock.json` (Supabase CLI devDependency). Do not deploy, rotate secrets, apply migrations, or
change locked decisions without explicit authorization.

Read first: `AGENTS.md`; `docs/decisions.md` ("Provider routing after the CN jurisdiction
guardrail"); `supabase/functions/generate-plan/index.ts`; Traycer artifact
`generate-plan-502-diagnosis`; `CLAUDE.md` pitfalls 20, 22, 22c, 22e.

## PROMPT

```text
The live generate-plan 502 is fixed and verified on deployed v11 (HTTP 200, real plans, 3.3-5.5s).
Do not re-pin the provider to DeepSeek: a CN jurisdiction guardrail on the OpenRouter account makes
that endpoint permanently unreachable, and no privacy/ZDR setting or new API key changes it. Read
`docs/decisions.md` "Provider routing after the CN jurisdiction guardrail" before touching
`supabase/functions/generate-plan/index.ts`.

Uncommitted session work sits in the working tree; `package.json` and `package-lock.json` carry
Oscar's Supabase CLI devDependency, which must not be staged, reverted or deleted.

Next, pick up whichever the user prefers:
1. The duplicate-entry prompt gap - the model sometimes emits two entries of quantity 1 for the same
   catalog_id instead of one of quantity 2, contrary to the system prompt's hard rules. Cosmetic
   (two identical Plan cards), ethanol totals are correct.
2. Benchmark the four ZDR-blocked providers with ZDR briefly disabled, in case one beats CoreWeave.
3. Unrelated product work.

Verification baseline: `npm run typecheck` PASSES; `npx vitest run` 209 tests across 36 files;
`npm run build` PASSES; `npm run lint` is known-failing at exactly 11 errors and 12 warnings and must
not get worse. Re-derive every count rather than quoting it. Edge functions are outside the tsc
project and Deno is absent, so index.ts can only be inspection-checked and live-probed. Deployed
function logs are BLOCKED - the analytics endpoint returns zero rows for every log table. Do not
deploy, rotate secrets, apply migrations, or change locked decisions without an explicit request.
```
