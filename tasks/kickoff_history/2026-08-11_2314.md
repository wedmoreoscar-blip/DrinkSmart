# Session Handoff / Kickoff — DrinkSmart Wave 4 next

Written 2026-08-11 23:14 BST. Normal-mode handoff. The canonical continuation was replaced.

## Outcome of this session

Wave 3 is integrated and visually accepted. Its notification and wind-down work, independent
browser pass, screenshot history, and full integration are recorded through `07c21db`. Native
notification delivery and platform appearance remain `BLOCKED` on physical iOS/Android hardware.

The Codex TUI artifact-ledger relay also completed its first live operation. The hub, ledger, and
waker transported the Wave 3 delegations end to end. The detached waker can still be reaped with
Traycer's process cgroup; one manual `Check the relay ledger.` prompt remains the recovery path.

Claude Design's newest export is now the active authority at
`design_handoffs/design_handoff_drinksmart/`. The preceding export is preserved at
`design_handoffs/design_handoff_drinksmart_depreciated/` as history. All 15 Wave 4 HTML/PNG pairs
(`4a`–`4o`) were opened and checked, repository references were migrated, 61
`:Zone.Identifier` files were stripped, and the decision/design records now mark Wave 4
unblocked. That archive landed in `d11c8bc`.

## Current repository state

- The integration target is `/home/oscar/DrinkSmart` on `main`.
- Before this handoff commit, `main` was clean at `d11c8bc`.
- Four warm Traycer worktrees are clean at `07c21db`:
  `traycer-redesign-step2-primitives`, `traycer-w1b-vessel-meter`,
  `traycer-w2a-bottom-tab-bar`, and `traycer-w2b-plan-buzz-picker`. They deliberately have not
  been advanced across the design-archive or handoff commits. Reuse requires Oscar's confirmation,
  then synchronization by merge under `docs/workflows/delegation.md`.
- `traycer agent list --json` returned no rows from this TUI. Do not infer live agent identities
  from suffixes or historical IDs; reconcile the relay ledger and live Traycer inventory first.
- This design/archive session did not rerun the application baseline because it changed only
  design assets and documentation. Its checks were clean-tree/diff checks, 15/15 paired assets,
  historical-bundle hash equality, path-reference reconciliation, and zero remaining
  `:Zone.Identifier` files. Derive a fresh baseline before writing any Wave 4 spec.

## Wave 4 starting boundary

Wave 4 covers the six previously undrawn application areas:

| Section | Surface | Design frames |
| --- | --- | --- |
| §B | Profile | `4a` |
| §C | Onboarding | `4b`, `4c` |
| §D | Drink picker and custom-drink sheet | `4d`–`4f` |
| §E | Menu scanner | `4g`–`4j` |
| §F | Establishments | `4k`, `4l` |
| §G | Anonymous-account upgrade | `4m`, `4n` |

The new shared numeric keypad field group is `4o`. The earlier form-control vocabulary in
`1l`/`1m` is also designed but W1-C remains unimplemented. The locked primitives-first rule
therefore makes W1-C plus `4o` the serialization boundary to plan before the screen specs.
Do not guess the final spec count or file split: inspect the current React ownership first and make
every concurrent implementation allowlist disjoint.

## Required startup and execution sequence

1. In a Traycer-launched Codex TUI, activate `$codex-tui-relay` before kickoff or reading agent
   messages. Confirm the epic ledger has no unprocessed Wave 3 commands or replies; restart the
   waker if appropriate, with manual hub prompting as fallback.
2. Invoke `$kickoff`, then read the files below and inspect current Git, worktree, agent, and relay
   state. Treat this bundle as the continuation, but higher-authority locked decisions still win.
3. Audit the Wave 4 prototypes and existing React files. Produce acceptance criteria and a
   dependency/file-ownership map. Sequence W1-C and `4o` before consumers that require them.
4. Inventory compatible warm agents. Present Oscar with the proposed full agent names, IDs,
   harness/model/effort, worktrees, synchronization needs, task split, and rationale. Wait for his
   confirmation before mutating worktrees or commissioning implementation.
5. Run the live verification baseline. Write and commit every delegation through `writespec`,
   including exact design authority, disjoint allowlists, current baseline results, exclusions, and
   the fixed scope/closing blocks. DeepSeek is the default where literal HTML fully determines the
   work; reserve Luna for a real visual-input or spatial-reasoning need.
6. Follow all fifteen steps of `docs/workflows/delegation.md`: keep agents/worktrees warm, review
   the merged tree on an integration branch with `speccheck`, repair inline, run one full baseline
   after repairs, and advance `main` only by fast-forward.
7. After all Wave 4 implementation is integrated, loudly announce the
   `docs/workflows/visual_check.md` halt and wait for Oscar. Do not contact Luna until he says go.
   Once authorized, follow that workflow in full, including tracked notes, selective working
   screenshots, committed final milestones, independent orchestrator capture, baseline, and
   fast-forward integration.

## Read first

1. `AGENTS.md`
2. `docs/decisions.md`
3. `docs/workflows/delegation.md`
4. `docs/workflows/visual_check.md`
5. `docs/workflows/agent_selection.md`
6. `docs/workflows/verification.md`
7. `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md`
8. `tasks/todo.md`
9. `docs/visual/01-current-state.md`
10. `docs/visual/02-planned-changes.md`
11. `docs/visual/03-design-requests.md`
12. `design_handoffs/README.md`
13. `design_handoffs/design_handoff_drinksmart/README.md` and
    `screens/{1l-form-primitives,1m-sheet-radio-time-toast,4a-profile,4b-onboarding-stats,4c-onboarding-taste,4d-picker-categories,4e-picker-category,4f-picker-custom-sheet,4g-scanner-capture,4h-scanner-waiting,4i-scanner-review,4j-scanner-failed,4k-establishments,4l-establishments-empty,4m-auth-email,4n-auth-waiting,4o-keypad-field-group}.html`

## Explicit exclusions and boundaries

- Never use the depreciated bundle as current authority.
- Do not improvise the undrawn drink-detail edit or notification-permission screens.
- Do not refactor `DrinksTab.tsx` beyond files and behavior explicitly required by an approved
  Wave 4 spec.
- Do not alter deterministic BAC/pacing formulas unless an approved spec explicitly places them in
  scope.
- Do not re-enable the light theme, add a dependency or styling system, or weaken RLS.
- Do not push, deploy Supabase functions, apply remote migrations, rotate secrets, or publish a
  mobile build.
- Do not run the final visual check on the delegation path, and do not contact Luna before the
  workflow halt plus Oscar's go-ahead.

## PROMPT

```text
Continue DrinkSmart with Wave 4 from /home/oscar/DrinkSmart on main.

First confirm that $codex-tui-relay is active, reconcile the epic ledger and live Traycer
agent/worktree inventory, and then follow this kickoff. Wave 3 is complete. The active Claude Design
authority is design_handoffs/design_handoff_drinksmart/, with Wave 4 frames 4a–4o; never use the
depreciated bundle as current authority.

Start Wave 4 by auditing the current React ownership and breaking §B–§G into committed writespec
delegation specs with exact acceptance criteria and disjoint file allowlists. The locked
primitives-first rule applies: W1-C form controls from 1l/1m remain unimplemented, and the new 4o
numeric keypad field group is shared by Wave 4, so plan that primitive boundary before its screen
consumers. Do not guess the number of specs or split files by screen name alone.

Before synchronizing or mutating a worktree or commissioning an implementer, show Oscar the proposed
full agent roster, model/harness/effort, worktree paths, sync needs, task/file split, and rationale,
and wait for confirmation. Then derive the baseline live, commission through the relay, and follow
all fifteen steps of docs/workflows/delegation.md through speccheck, inline repair, one post-repair
full baseline, and fast-forward integration.

When all Wave 4 implementation is integrated, announce the visual-check halt loudly and wait for
Oscar before contacting Luna. Once authorized, follow docs/workflows/visual_check.md fully,
including the visual-history notes, working captures, committed final milestones, and independent
orchestrator pass. Never push or deploy.
```
