# Project Decisions

This is the durable design ledger. Agents may add entries only through the `update-decisions`
workflow. Keep history: supersede an entry instead of deleting it.

## LOCKED — Deterministic BAC and pacing engine

- `src/contexts/AppContext.tsx` owns BAC, total body water, ethanol, and pacing calculations.
- The application model selects catalog items only. It never replaces deterministic math.
- `adjustedTargetMl` intentionally scales the displayed target when selected drinks exceed it.

## LOCKED — Anonymous-first identity

- Every launch requires a valid Supabase session; create an anonymous session when none exists.
- Upgrading to a permanent account preserves the existing Supabase `user_id`.
- Manual identity linking and the two-step email verification then password-reset flow are required.

## LOCKED — State ownership

- React Context owns the deterministic session/math engine.
- React Query owns Supabase-backed state and shared session-only hook caches.
- `drinksmart.session.v1` owns persisted active-session state. Change its version when its shape
  changes; do not silently reinterpret incompatible data.

## LOCKED — AI plan boundary

- `generate-plan` currently uses `deepseek/deepseek-v4-flash-0731` through OpenRouter.
- The server validates catalog identifiers and recomputes actual ethanol totals.
- The client uses a deterministic greedy fallback and tops up material underfills.
- API keys remain Supabase secrets and never enter the client bundle or repository.

## LOCKED — Supabase and frontend conventions

- Use `@supabase/server` `withSupabase` for edge functions and preserve JWT verification.
- Keep Row Level Security enabled; use RLS-scoped clients unless an explicitly reviewed admin action
  requires otherwise.
- Use React Query for new Supabase-backed hooks, Tailwind plus shadcn/ui for interface work, and the
  established component patterns.
- Do not introduce another state library, styling system, backend, or production dependency without
  explicit approval.

## LOCKED — Verification language

- Typecheck, lint, build, automated tests, live Supabase verification, browser verification, and
  native-device verification are distinct evidence categories.
- Missing infrastructure is `BLOCKED`, never `PASS`.

**Typecheck command (amended 2026-08-08).** The typecheck is `npm run typecheck`, which is
`tsc -b --noEmit`. **Bare `tsc --noEmit` is a no-op in this repository** and must never be used or
quoted as evidence: the root `tsconfig.json` is `"files": []` plus project references, so without
`-b` it compiles zero files and exits 0 vacuously. It did so for the entire life of the project,
concealing four real errors (Supabase `Json` mistyping in `useUserMetrics` and `useLastSession`)
and passing a delegated diff that had introduced four more.

The general lesson, which outlives this specific bug: **a green check is only evidence if the
command has been shown to be capable of going red.** When adopting or trusting a verification
command, prove it fails on a deliberate fault before treating its success as meaningful. Applies
equally to lint, tests, and any future runner.

## LOCKED — Traycer-orchestrated delegation (2026-08-07)

- Traycer orchestrates all delegated implementation. Client-native subagent roles are retired; the
  spec, not shared session context, is the only channel to a delegated agent.
- `writespec` commissions every delegation: full paths and exact signatures, scope stated in both
  directions, checkable acceptance criteria, an explicit verification baseline, and the fixed
  scope/closing blocks appended verbatim.
- `speccheck` gates acceptance: enumerate clauses before reading the diff, map clauses to hunks and
  hunks to clauses, derive tests from the spec rather than the code, fix small failures inline, and
  hand back only for a missing clause or a wrong approach.
- The implementer never writes or modifies tests; the checker owns test authorship.
- Delegated runs use Traycer-managed worktrees, never the workspace folder itself.
- **Precedence over bundled Traycer skills.** The bundled `traycer-*` skills carry their own
  delegation flow that does not reference these two skills. Where they overlap, `writespec` and
  `speccheck` win: no delegation is commissioned except by a `writespec` spec, and none is accepted
  except through a `speccheck` pass, whatever a bundled skill's own procedure says.
- **Artifact structure remains Traycer's.** The `traycer-*` skills stay authoritative for artifact
  shape and lifecycle — the `spec`/`ticket`/`review`/`story` kinds, `status` transitions, nesting,
  and epic layout. The split is deliberate: Traycer owns transport, isolation, and durable structure;
  `writespec`/`speccheck` own the content contract and the acceptance gate.
- **Commissioning is machine-enforced (2026-08-08).** `tools/writespec-guard`, registered as a
  `PreToolUse`/`Bash` hook in `.claude/settings.json`, denies any `traycer agent send` whose spec
  lacks the verbatim `scope.md` + `closing.md` blocks. Replies (`--response-id`) are exempt. Nothing
  else in this workflow is mechanically enforced: spec quality, the honesty of a verification
  baseline, and whether `speccheck` runs at all remain agent-side discipline.
- The guard matches `traycer agent send` only. Delegation driven outside Traycer — `codex exec`,
  `deepseek -p` — bypasses it, and the matcher must be widened before either becomes a real route.

## LOCKED — Orchestrator and implementer roles (2026-08-08)

- **Orchestrator: Claude Code on Opus 5 or Fable 5**, `tui` surface. It plans, authors specs,
  runs `speccheck`, integrates, and commits. Orchestration, spec authorship, and acceptance are
  never delegated.
- **Warm implementers are the default provisioning route (amended 2026-08-09).** Before creating
  an agent or worktree, inventory compatible warm agents and their existing worktrees. If one
  exists, recommend its reuse to Oscar and disclose the agent, worktree and any required sync or
  reconfiguration, but ask for confirmation before sending another spec or mutating that worktree.
  Reuse is the default recommendation, not standing authorization: Oscar may choose a fresh
  agent/worktree for isolation, comparison, quota or ownership reasons. Do not provision the fresh
  route until no compatible warm route exists or Oscar explicitly chooses it. Once confirmed,
  `writespec`, worktree isolation, explicit model/effort configuration and `speccheck` still apply.
- **Default implementer: DeepSeek V4 Flash via the `opencode` harness**, `--surface gui`. Served by
  DeepSeek's own API through configured credentials — not the `opencode:*-free` tier, which may
  serve a pre-0731 build. Spawn several in parallel when the work splits into independent specs.
- **Effort comes from `--reasoning-effort` on `create`, and nothing else** (settled 2026-08-08 by
  A/B). Two runs with identical `opencode.json` (`agent.build.variant: "max"`): without the flag the
  GUI reported **low**; with the flag it reported **max**. `agent.build.variant` alone does **not**
  reach a Traycer-launched agent. Always pass `--reasoning-effort max`; keep the config value as the
  redundant half, not the primary. (The session export reports `variant: max` in both cases, so the
  export is not a reliable effort signal — only the create flag is.)
- Autonomy is separate and *is* config-driven: `opencode.json`'s `permission` block (`"*": "allow"`
  plus explicit denies) is the config form of `--auto` and applies on every surface.
- Traycer's Settings "Terminal interface CLI arguments" (`--model … --variant max --auto`) apply
  *only* to terminal-interface launches and never reach a `gui` agent — and since opencode/codex
  cannot do a2a on the terminal surface, that field is irrelevant to delegation entirely.
- **DeepSeek reaches opencode as a built-in provider**, authenticated by API key via
  `opencode providers login` (stored in `~/.local/share/opencode/auth.json`), not a custom provider
  block in `opencode.json`. It therefore hits DeepSeek's official endpoint, and
  `deepseek-v4-flash` is their canonical name serving the current build (0731) — which was the point
  of avoiding the `opencode:*-free` tier.
- opencode's model syntax uses a slash (`deepseek/deepseek-v4-flash`); Traycer's `--model` uses a
  colon (`deepseek:deepseek-v4-flash`). Both correct in their own place.
- **`--permission-mode auto_accept_edits` for both implementers** (Oscar, 2026-08-08). Traycer's
  enum is `full_access | supervised | auto_accept_edits` — there is no `auto`. An explicit
  instruction in the selection guide is the sanctioned override to the `full_access` default;
  inferring a restrictive mode from the task or the parent's mode remains forbidden.
  Accepted tradeoff: an implementer waiting on an unanswered prompt is indistinguishable from one
  still working, so a stall does not announce itself. Viable because Oscar watches both agents and
  approves in-session; revisit if delegations are ever run unattended or several in parallel.
  Containment is mode-independent — worktree isolation plus the `opencode.json` denies.
- The repo's `.codex/config.toml` pins `gpt-5.6-sol` at `high` for Oscar's own direct codex
  sessions. Traycer-launched codex agents must pass `--model gpt-5.6-luna --reasoning-effort max`
  explicitly rather than relying on repo config. Codex autonomy comes from
  `approvals_reviewer = "auto_review"` in `~/.codex/config.toml`.
- **Escalation implementer: GPT-5.6 Luna via the `codex` harness**, `--reasoning-effort max`,
  `--surface gui`, billed to the ChatGPT Plus subscription. Pulled for exactly two reasons, kept
  deliberately distinct:
  - **Visual input** (screenshots, design comparison, mockups, rendered output) — DeepSeek cannot
    ingest images at all. A hard capability gap.
  - **Spatial reasoning** (layout, geometry, coordinate systems, canvas/SVG, visual diffing) —
    third-party testing shows DeepSeek V4 still trails Luna and comparable models here. A quality
    margin, not a capability gap.

  Collapsing the two lets "spatial-ish" drift into habitual use of the costlier model. If neither
  applies, use DeepSeek.
- `docs/workflows/agent_selection.md` is the canonical guide. Traycer serves a byte-identical
  mirror from `~/.traycer/agent-selection-guide.md`; `tools/check-agent-setup` fails on drift
  between them and warns when the mirror is absent (fresh machine). The machine copy is not
  versioned — edit the repo copy and sync.
- The guide deliberately does **not** ask children to run `traycer-implement`: the `writespec`
  `closing.md` block already governs how a child verifies and reports, and two instruction sets
  would conflict.

## LOCKED — Multi-harness delegation and permission parity (2026-08-08)

Verified empirically; each point cost attempts to discover.

- **Agent-to-agent messaging on `--surface tui` is Claude-Code-only.** `codex` and `opencode` both
  fail `agent.create` with `TARGET_TUI_UNSUPPORTED — harness cannot participate in agent-to-agent
  messaging`. Non-Claude implementers must use `--surface gui`.
  This does **not** contradict `docs.traycer.ai/agents-and-models/coding-agents`, which lists Claude
  Code, Codex, and OpenCode as Terminal-interface capable. That matrix is about which harnesses can
  *back a terminal session a human drives*. It documents nothing about agent-to-agent messaging.
  Both are true: you can launch codex or opencode in a terminal tab yourself; you cannot have
  another agent message one there and get a structured reply. Delegation needs the second, so it
  needs `gui`.
- **Custom harness providers do reach Traycer.** A provider defined in `opencode.json` /
  `~/.config/opencode/` appears in `traycer agent list-harness-models opencode` and is accepted by
  `--model`. Traycer is not restricted to its own curated list.
- **Model ids are `provider:model` with a colon**, not a slash: `deepseek:deepseek-v4-flash`.
  A slash returns `model ... is not available for harness`.
- Working recipe: `traycer worktree create` → `traycer agent create --harness opencode --model
  deepseek:deepseek-v4-flash --reasoning-effort max --surface gui --cwd <worktree>` →
  `traycer agent send --expect-reply` with a `writespec` spec → `speccheck` → `worktree delete`.
- **Traycer infra is per-agent, not per-surface.** Epic membership, a2a, artifacts, and managed
  worktrees hold in both `tui` and `gui` whenever Traycer spawns the agent. They are forfeited only
  by driving a model outside Traycer (`codex exec`, `deepseek -p`). `traycer config env` is
  machine-global with no per-agent scope, so an env-level model re-point cannot be confined to
  implementers.
- **`tui` agents pin their worktree**; deleting one from the sidebar leaves its process, bash child,
  and `traycer monitor` running, and the lease blocks `worktree delete` until they are killed.
  `gui` agents release when idle. There is no CLI command to terminate an agent.
- **A timed-out `traycer agent create` yields a silently misconfigured agent** (2026-08-08). When
  `create` returns `WebSocket frame timed out after 15000ms`, the agent is still created — it
  appears in `agent list`, accepts messages, and runs — but **none of the `--model`,
  `--reasoning-effort`, or related flags are applied**. Observed: a create that timed out produced
  `providerID: opencode / modelID: big-pickle / variant: default` instead of the requested
  `deepseek / deepseek-v4-flash / max`. It fails open, not closed, and nothing downstream surfaces
  it. **Always confirm `create` returned an agent id cleanly before dispatching a spec**, and
  verify the model actually used with `opencode export <sessionID>` (fields `providerID`,
  `modelID`, `variant`) rather than trusting the create command or the agent's self-report.
  Cross-check `opencode session list` for the session id.
- A `gui` agent blocked on an `auto_accept_edits` approval prompt counts as an **active session**
  and pins its worktree, exactly as a `tui` agent does. There is no local process to kill — the
  state is Traycer-side — so only answering the prompt or removing the agent from the sidebar
  releases it. Traycer does surface the stall as an inbox inactivity notice, so it is detectable
  rather than silent.
- **Permission parity is enforced per harness, in each harness's own layer.** `opencode.json` denies
  `git commit`/`git push`/`supabase db push`/`supabase functions deploy` and `.env` reads for
  implementers. `.claude/settings.json` mirrors the hard deny on pushing — `Bash(git push)`,
  `Bash(git push *)`, `Bash(git -C * push *)` are in `permissions.deny`, so no agent can push in any
  mode. **Pushing is the user's alone** (Oscar, 2026-08-08); it is not delegable by request, and
  lifting it means editing this file deliberately.
- Remote Supabase operations sit in `permissions.ask`, not `deny`: `supabase db push`, `functions
  deploy`, `secrets set`, `migration up`. `AGENTS.md` permits these on an explicit user request, and
  `ask` forces exactly that prompt rather than blocking outright.
- `git commit` is deliberately ungated for the orchestrator: Oscar granted standing permission to
  commit locally without asking (2026-08-08), on a non-default branch with the diff reviewed and
  explicit paths staged. Implementers remain denied `git commit` in `opencode.json`.

## SUPERSEDED — Native subagent routing (2026-08-07)

- The planner/implementer/mechanical-worker/reviewer roster, the `route`/`unroute` switch,
  `tasks/route_state.md`, the `docs/agent_workflow.md` lifecycle state machine, and
  `tools/agent-worktree` write leases are superseded by Traycer-orchestrated delegation above.
  Their history remains in Git before this entry's commit.

## LOCKED — Frontend redesign source of truth (2026-08-07)

- `design_handoff_drinksmart/` is the authority for the frontend redesign. `README.md` is the spec
  and is self-sufficient; `screens/*.png` are the ground truth for appearance; `screens/*.html` are
  inline-styled prototypes to port into React, never to paste in; `tokens/` alone is production code.
- Do not read or parse `DrinkSmart-design-reference.html` (1.3 MB compiled output, for a human).
- Design output reaches the repo by **Share → Export → Handoff to Claude Code** from Claude Design,
  unpacked into the repo. Pushing via DesignSync is impossible — it requires
  `PROJECT_TYPE_DESIGN_SYSTEM` and the redesign is a regular project, a type immutable at creation.
- **Correction 2026-08-08: DesignSync *reads* do work on the regular project.** `get_project`,
  `list_files` and `get_file` all succeed against `20b0a55d-9e61-42b1-b03d-d677ea6143ad`; only
  writes are gated. Use `list_files` to check cheaply what an export contains before asking for a
  zip. Prefer the zip for the content itself — a local `git diff` against the existing bundle costs
  no context, whereas `get_file` pulls whole files into it.
- **An export cannot repeal a locked product decision.** The 2026-08-08 export deleted both
  in-repo README amendments (level-7 cap, four-band table, hidden nudge pair) because they live only
  in the repo copy and were never sent upstream. They were restored. The precedence ladder ranks
  design sources against *each other*; it does not let a drawing overrule a decision recorded here.
  When an export regresses an amendment, restore the amendment and consider sending it upstream.
- **The canonical bundle path is `design_handoff_drinksmart/{README.md,screens/,tokens/}`.** Exports
  may nest it deeper; lift it back, because docs and specs reference those paths directly. The wider
  project export (`DrinkSmart.dc.html`, `_ds/`, `ios-frame.jsx`, `support.js`, `uploads/`) sits under
  `design_handoff_drinksmart/project/`. Strip `:Zone.Identifier` files when unzipping on Windows
  into WSL.
- ~~Two in-repo amendments to the bundled README (2026-08-06) are part of the spec.~~
  **Superseded 2026-08-08 by designs `1n`/`1o`.** The amendments held the four-band scale as prose;
  it is now drawn, and README §1n/1o states *"supersedes 1c"* and carries the whole spec. Prose
  replaced by a drawing is a promotion up this ladder, so the amendments are **not** restored. The
  general rule from the earlier export still stands: an export that *deletes* an amendment without
  drawing its content is a regression and must be restored.

**Precedence ladder (amended 2026-08-08).** Claude Design entities are ground truth for UI, and for
backend design concerning those entities. Where sources disagree, the higher rank wins outright and
the lower is treated as stale — no reconciliation, no averaging:

1. `design_handoff_drinksmart/tokens/` — production code; already applied.
2. `screens/*.html` — literal inline values (sizes, radii, colours, weights, copy). Authoritative
   for **values**.
3. `screens/*.png` — authoritative for **appearance**; the visual check on 2.
4. `README.md` prose — rationale and intent. Stale wherever it disagrees with 2 or 3.
5. `tasks/todo.md` acceptance criteria — derived planning notes.
6. Implementer judgement — only where all of the above are silent.

The README backs this itself: colours, type, spacing, radii, touch targets, motion and copy are
declared "final and exact". Verified conflicts where prose lost (2026-08-08): meter radius is **28px**
per `1h-meter-continuous.html` and the pre-existing `rounded-vessel` token, not the prose's 12; meter
fill is **.9** opacity, not .85; badges are **13px / radius 8 / padding 8px 12px** per
`1k-primitives.html`, not the prose's 11px / radius 6 / 5px 8px. The prose's "radius 12" was a leak
from the `softer`/`stronger` nudge control, which is genuinely 12px.

- A **fresh export is expected to contradict the current code**, and is still ground truth. A Claude
  Design edit or redesign supersedes what is already built; contradiction is the mechanism, not a
  defect. Re-export for freshness and coverage — it does not fix prose-vs-markup drift, because any
  narrative layer can reintroduce it. The ladder is what makes such drift non-blocking.
- `radius 12` (nudge controls) has **no** Tailwind token; the scale is `sm 4 · md 8 · lg 14 · xl 20 ·
  vessel 28`. Add one or use an arbitrary value when 1c lands.

## LOCKED — Dark-only, light theme wired but unreachable (2026-08-07)

- The shipped aesthetic is the handoff's dark palette, applied verbatim in `.dark` in `src/index.css`.
- The spec called for `.dark` to be identical to `:root`. We deviated deliberately: `:root` carries a
  **derived** light palette so a Claude-Design-drawn light theme can drop in later without re-plumbing.
- Light is unreachable at runtime by two independent guards, and both must stay until a real light
  theme is drawn: `forcedTheme="dark"` on the `ThemeProvider` in `src/main.tsx`, and
  `LIGHT_THEME_AVAILABLE = false` in `src/pages/Profile.tsx`, which hides the Appearance card and
  short-circuits the `profiles.theme` sync effect.
- Non-colour tokens (type, spacing, touch, motion) are theme-independent and declared once in `:root`.
- Inter is self-hosted via `@fontsource/inter` (400, 500) imported in `src/main.tsx`. No CDN font.

## LOCKED — Buzz ceiling is level 7, in four bands (2026-08-06; drawn 2026-08-08)

> **Build from `screens/1n-buzz-picker-four-band.html` and `1o-buzz-picker-heavy.html`, not from
> this entry or from `1c`.** README §1n/1o supersedes 1c outright. The two frames are a pair: `1o`
> exists so the hidden-nudge reflow can be verified rather than inferred.


- Levels **8–10 are removed**, not rendered as forbidden. `buzzLevels.ts` still contains them; deleting
  them is part of the 1c work and is not yet done.
- Four bands: Light (1–2), Social (3–4), Loose (5–6), Heavy (7 alone). The fourth card is styled
  exactly like the other three — no warning colour, no red, no extra affordance.
- Because the scale ends at a reachable level, the danger warning in `PlanTab.tsx` is deleted, and a
  fading rule reading *"the scale ends here"* sits beneath the last card.
- With a single-level band selected, the `softer` / `stronger` nudge pair is **hidden, not disabled**.

## LOCKED — Specs live in the repo, not in Traycer artifacts (2026-08-08)

- **Traycer artifacts are epic-scoped and do not survive a new session.** They are a review surface:
  use them when the spec should be read and commented on before dispatch (`traycer comments list`
  reads anchored threads). They are not storage.
- **Delegation specs are written to `docs/specs/` and committed**, with pointers from
  `tasks/next_session_kickoff.md`. A handoff can land before implementation does, so a spec that
  exists only as an artifact is lost to the session that has to run it.
- Delete an artifact only after its durable content is in the repo, and only with the user's
  agreement at the time.
- `tools/writespec-guard` denies any `traycer agent send` lacking the verbatim `writespec` blocks.
  Replies (`--response-id`) and messages marked `[no-spec]` pass. Use `[no-spec]` for pings,
  acknowledgements and stand-downs — never to skip commissioning real work.
- **The orchestrator pre-installs `node_modules` in each worktree before dispatch**, sequentially.
  `tools/agent-lock` uses `flock -n` and fails fast (exit 75) rather than queueing, so parallel
  implementers running their own installs would see one succeed and the rest hard-fail. Specs
  forbid dependency changes, which also keeps `package-lock.json` out of every delegated diff.

## LOCKED — Whole-app redesign, global scale, primitives first (2026-08-08)

- The redesign is **whole-app and global**, not screen-by-screen. The current UI is to be brought to
  the Claude Design appearance everywhere it reaches.
- **No dual size scale.** The design's touch scale replaces the shadcn defaults outright:
  `tap` 56px is the floor for anything tappable, `act` 64px is the one primary action per screen,
  icon buttons are 56×56 at radius 12. Both `h-tap` and `h-act` already exist in `tailwind.config.ts`.
  A transitional "leave `sm`/`default` alone and migrate per screen" approach was considered and
  **rejected**: it knowingly violates the 56px floor for the duration of the migration, and the floor
  is the accessibility core of the design.
- Consequence, accepted deliberately: restyling `src/components/ui/*` reflows every screen at once,
  including screens with no redesign step of their own (`Auth`, `MenuScannerTab`, admin,
  `StatsForm`, `DrinkFilterPopover`). Layout fallout on those screens is expected work, not a
  regression. Measured 2026-08-08: 68 `<Button>` usages, of which 22 `sm`, 14 `icon`, 4 `lg`; every
  one currently sits below the 56px floor.
- **Primitives land before screens.** Every screen consumes `src/components/ui/*`, so that work is
  the one serialization point; screen work parallelises freely behind it.
- Delegation runs in **waves**. Within a wave, specs must own **disjoint file sets** — file-level
  ownership is what prevents interference, and it removes the need for agent-to-agent chat between
  implementers. Reserve a2a for cases where two implementers must agree on an interface, which
  correct partitioning should avoid.
- The shadcn top-tabs pattern is not used anywhere. The three tabs live in the bottom bar;
  `src/components/ui/tabs.tsx` is owned by that work alone, not by the primitives pass.

## PENDING

- **Still undrawn after the 2026-08-08 export:** Profile / onboarding (`StatsForm`,
  `PreferencesPicker`), drink picker, menu scanner, establishment browsing, and auth. Under the
  precedence ladder these fall to rank 6, implementer judgement, which is what the ladder exists to
  prevent. **Wave 4 stays blocked** until they are drawn. Form primitives (`1l`, `1m`) and the
  four-band picker (`1n`, `1o`) were delivered and are no longer blockers.
- ~~Band names and subtitles for the four-band picker are proposed, not drawn.~~ **Closed
  2026-08-08** — drawn as `1n`/`1o`, wording as proposed (Light / Social / Loose / Heavy, "gaps in
  the night" for Heavy).
- Light theme values in `:root` are derived, not designed. Replace wholesale on the next export.
- Timeline layout 1e (proportional time axis) is an option, not a requirement. Ship 1d unless the whole
  night is guaranteed to fit without scrolling.
- Meter form: 1h continuous is recommended for the Plan target card, 1j mid-session for the Timeline.
  Pick one object and use it everywhere.
- Nothing in the redesign has been rendered in a browser. `npm run dev` has not been run since the
  token layer landed.
- Live Supabase migration, auth, RLS, and edge-function verification.
- Real iOS and Android notification/build verification.
- Unit coverage for the deterministic engine, `computeTargetEthanolMl`, and greedy fallback.
- A test runner (vitest is the natural fit for Vite) so `speccheck`'s spec-derived tests are
  runnable; adding it needs explicit approval as a new dev dependency.
