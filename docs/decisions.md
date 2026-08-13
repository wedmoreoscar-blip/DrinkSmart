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
  hunks to clauses, derive tests from the spec rather than the code, and repair inline. Clause
  mapping happens **before** any test is written, because a missing clause is the one finding tests
  cannot surface — a suite written against unimplemented work reports a failure, not a gap.
- **Checker-owned repair loop (amended twice on 2026-08-09).** Once an implementation is handed
  back, model routing no longer applies: the checker owns the repair. The twenty-line threshold and
  the whole-missing-clause trigger are both **withdrawn**. The test is now the *size and kind* of
  the remaining work — repair inline whenever it is implementable from the spec already written,
  and re-contact only when completing it would mean **designing rather than repairing**, the
  approach is substantially wrong, the repair needs scope or authority the spec did not grant, or
  the checker lacks a required capability. A missing clause is not by itself grounds to hand back.
  W3-A2 settled it: an entirely absent clause took ~70 production lines and six tests to complete
  inline, plainly faster than a rebrief, a wait and a second review. Inline repair is nonetheless
  usually *more* expensive in tokens, since the checker is the larger model; it buys latency, not
  cost. Every inline repair is named in the acceptance record, because that note is the only
  remaining signal that specs are routinely under-specifying the work. The checker must name the
  applicable exception and evidence before messaging; warm-agent reuse still requires Oscar's
  confirmation.
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
  baseline, and whether `speccheck` runs at all remain agent-side discipline. *(Narrowed
  2026-08-13: integration is now also machine-gated — `tools/spend-guard` denies the fast-forward
  merge of an `integration*` ref without a spend-ledger row; see the 2026-08-13 entry.)*
- The guard matches `traycer agent send` only. Delegation driven outside Traycer — `codex exec`,
  `deepseek -p` — bypasses it, and the matcher must be widened before either becomes a real route.

## LOCKED — The delegation path is one document, tuned for speed (2026-08-09)

- **`docs/workflows/delegation.md` is canonical** for how a delegation runs end to end.
  `agent_selection.md` decides *which* agent; this decides *how*. The other workflow documents
  defer to it on sequencing.
- **Four design goals, in priority order:** warm worktrees stay warm; one full baseline per
  delegation; one repair loop; fast-forwards only.
- **Worktrees and their agents are never deleted after integration.** A clean worktree level with
  `main` is a provisioned asset — dependencies installed, agent context cached. The previous
  instruction to delete after `speccheck` contradicted the warm-reuse rule and is withdrawn.
  Reinstall dependencies only when a merge actually changed `package-lock.json`; detect it, do not
  assume it.
- **Review happens on a scratch `integration` branch, never in the worktree and never on `main`.**
  Repairs are then made against the tree that ships, and an unacceptable diff is discarded rather
  than reverted. `main` advances only by fast-forward, so nothing is ever re-tested after merging.
- **Exactly one full baseline, after the repairs, never before them.** A cheap test-only run during
  `speccheck` is diagnostic; the baseline is the confirmation gate. **A green suite does not make
  it redundant**: Vitest transforms with esbuild and does not typecheck. Demonstrated 2026-08-09 —
  a deliberate `const bogus: number = "not a number"` left all 93 tests passing while `tsc -b`
  reported `TS2322`. Typecheck is the irreplaceable element and the slowest, ~46s of ~79s.
- **Disjoint specs are integrated as a batch**: merge every returned branch into one `integration`,
  one `speccheck` pass, one baseline. If that baseline fails, repair inline again and re-run — do
  **not** fall back to per-branch integration, which discards inline fixes already applied.
  Per-branch integration is reserved for specs that genuinely share files.
- **Verification belongs to the checker, never the implementer.** The implementer confirms only
  that the code runs and the existing suite still passes. Tests written by the agent that wrote the
  code encode the same blind spots, so a green suite can report success over a clause that was
  never built — twice observed here: W3-A1's fixtures hid a unit mismatch, and W3-A2 shipped a test
  named for the anchor clause that contained no anchor. `tools/writespec-guard` now denies a
  commissioning send whose spec asks the implementer to write tests, with an `[implementer-tests]`
  marker for the rare justified case.
- **Baseline numbers are derived by running the command, never quoted from a document.** Checked
  2026-08-09: four live documents still carried a superseded lint count, so a spec written from any
  of them would have licensed a regression as "baseline held".
- **Implementers run at `--permission-mode full_access`** (Oscar, 2026-08-09), superseding the
  `auto_accept_edits` default. That mode hides stalls — an agent awaiting an unanswered prompt is
  indistinguishable from one still working — which is tolerable under close watch and not when
  several delegations run in parallel.

### Amendment — the spec states the baseline but does not command it (2026-08-12)

- **`blocks/baseline.md` is a third fixed block**, appended verbatim beside `scope.md` and
  `closing.md`, and `tools/writespec-guard` requires all three. It states the division of labour:
  **implementers run `npm run typecheck` and `npx vitest run`; `npm run lint` and `npm run build`
  are the checker's.** A spec still quotes the literal counts — "no worse" has to stay checkable —
  but **must not instruct the commands**. `HEAVY_COMMAND_PATTERNS` denies a send that does.
- **The failure this closes was the orchestrator's, not an implementer's.** Every Wave 4 spec
  appended `closing.md` — which asks only that the code runs and the existing suite passes — and
  then added a baseline section reading *"Run these from the root of your worktree"* above all
  four commands. Both blocks were present and verbatim, so all seven sends passed. The guard
  checked that the blocks were *present*; nothing checked whether the spec around them agreed.
  **A guard that checks for presence is not checking for coherence.**
- The agents were obeying, not forgetting. Diagnosing it as "the agents are looping" was wrong and
  produced a needless steer to five working agents.
- **Cost, measured rather than assumed:** WSL gets 2 of this machine's 4 cores. Five agents × four
  commands is ~20 build-weight jobs on two cores; load average hit 7.85–11.14, one implementer's
  `npm run build` took **2m40s** against the orchestrator's **29s** for the identical command, and
  one agent spent twenty minutes on a `tsc -b` whose result the checker discarded and re-ran.
- **A starved agent is indistinguishable from a stalled one.** That ambiguity, not the delay, is
  the real cost.
- **`tools/agent-lock` is the wrong instrument here**: it holds `flock -n`, so a second caller
  fails with exit 75 rather than queuing. It guards things that must never overlap; wrapping
  verification in it would convert contention into spurious failures.
- **The answer is not smaller waves** (Oscar, 2026-08-12). Keep fanning out as wide as the specs
  allow. Exhaustive work on a cheap model is the correct trade against repair by an expensive one;
  the binding constraint is agent **context**, not tokens.
- **Provisioning a fresh worktree uses `npm ci`, not `npm install`.** `npm install` can rewrite
  `package-lock.json`, handing the implementer a tree already dirty in a file its spec forbids it
  to touch, and that change then rides into the handback diff. A warm worktree whose lockfile moved
  still uses `npm install`, because the incremental update is the whole point of that path.

## LOCKED — The final visual check is a separate workflow (2026-08-09)

- **`docs/workflows/visual_check.md` governs it, and it is deliberately not the delegation path.**
  A `writespec` spec would require first taking the screenshots and finding the defects, which is
  the entire job being delegated, so Luna is briefed roughly and goes in blind.
- **A Claude Design drawing is a precondition.** With nothing authoritative to compare against
  there is no check, only taste. Scope is limited to screens listed Available in
  `docs/visual/03-design-requests.md`.
- **Halt and wait for Oscar on reaching the stage.** Recon first: one Luna reports findings and
  fixes nothing, then headcount is agreed from the finding list rather than guessed.
- **One shared worktree, not one each** — merging several divergent UI trees is the reconciliation
  this phase cannot afford. Disjoint *file* ownership replaces the merge as the safety net, with
  shared primitives owned by exactly one agent. Fixers coordinate by A2A for coherence, which no
  partitioning can guarantee because coherence is a property of the whole.
- **Self-verification is expected here, not forbidden.** Screenshot, fix, screenshot again is the
  mechanism; the ban elsewhere exists because implementer-authored *tests* conceal omissions, which
  an observation of the running app does not. Commissioning messages carry `[visual-check]`.
- **Checking is casual; integration is not.** The orchestrator runs its own visual pass by driving
  the app itself, then one full baseline and a fast-forward. No repair loops back to Luna.
- **Playwright is a committed devDependency pinned to exactly `1.62.1`** (amended 2026-08-10) —
  each release expects a specific Chromium build, and `1.62.1` matches the cached
  `chromium-1234`. The earlier `1.55.0` pin carried GHSA-7mvr-c777-76hp; the replacement was
  launch-verified in both repositories and contributes no new audit finding. Raising the pin is a
  two-step operation: update the package in both repositories, then run
  `npx playwright install chromium`, because npm does not fetch the browser binary. Keep the pin
  exact and keep both repositories on the same version so their shared browser cache remains valid.

## LOCKED — Orchestrator and implementer roles (2026-08-08; amended 2026-08-10)

- **Default orchestrator: Claude Code on Opus 5 or Fable 5**, `tui` surface. **Codex TUI is an
  authorized alternative only while `$codex-tui-relay` is active.** Either orchestrator plans,
  authors specs, runs `speccheck`, integrates, and commits. Orchestration, spec authorship, and
  acceptance are never delegated.
- **Codex TUI is orchestrator-only.** It is never an agent-to-agent implementation target because
  Traycer does not allow its terminal agent to participate in A2A mutations. A Codex implementer
  always uses the GUI surface. Claude Code TUI uses native bidirectional messaging and does not use
  the artifact adapter.
- **Warm implementers are the default provisioning route (amended 2026-08-09).** Before creating
  an agent or worktree, inventory compatible warm agents and their existing worktrees. If one
  exists, recommend its reuse to Oscar and disclose the agent, worktree and any required sync or
  reconfiguration, but ask for confirmation before sending another spec or mutating that worktree.
  Reuse is the default recommendation, not standing authorization: Oscar may choose a fresh
  agent/worktree for isolation, comparison, quota or ownership reasons. Do not provision the fresh
  route until no compatible warm route exists or Oscar explicitly chooses it. Once confirmed,
  `writespec`, worktree isolation, explicit model/effort configuration and `speccheck` still apply.
- **Compact before cross-harness reconfiguration (empirically settled 2026-08-09).** A warm agent
  may be moved to another harness in its existing Traycer chat and worktree, but compact its source
  session first when the active context is large. Traycer cannot resume the source harness's native
  provider session: it opens a fresh destination-provider session and injects a
  `<previous_session_context>` instruction pointing to
  `/tmp/traycer-chat-refs/<agent-id>/session-carryover/transcript.txt`. The destination agent reads
  that file explicitly, analogous to starting a new provider chat and handing it a transcript.
  This bridge was observed both for Claude/Opus → Codex/GPT-5.6 Sol and for
  OpenCode/DeepSeek V4 Flash → Codex/GPT-5.6 Luna Max.

  In the large-session experiment, OpenCode showed about 210k active tokens before manual
  compaction. The generated carryover was 40,297 bytes / 4,503 words / 581 lines and contained the
  compacted summary plus recent messages, including some tool calls/results — not the raw 210k
  provider history. Codex created a fresh Luna session (`providerSessionKind=fresh`,
  `freshReason=no_harness_anchor_in_chat`). Its first request, before reading the carryover, was
  21,251 uncached input tokens; after the file reads, the successful confirmation turn contained
  28,448 input tokens, of which 27,392 were cached. The GUI displayed roughly 40k context, so use
  the Codex rollout token events as the authoritative input accounting. An interrupted intermediate
  turn means these observations prove transfer shape and active input size, not an exact aggregate
  billing total.

  Operational rule: compact the source, reconfigure only after Oscar confirms, send a minimal
  confirmation turn, then inspect the destination rollout's first `token_count`. The carryover can
  still be verbose or low-quality, so inspect its size/content when cost or continuity matters.
  This finding is specific to cross-harness Traycer reconfiguration; do not generalize it to a
  same-harness model switch, where the provider may reread the full active history under a new
  model-specific cache.
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

## SUPERSEDED — Codex TUI persistent message receiver (2026-08-10)

Superseded on 2026-08-10 by the artifact-ledger A2A hub below. Traycer rejects every A2A mutation
originating from Codex TUI, so the passive receiver could neither be provisioned nor contacted by
the orchestrator. The bullets below are retained as design history only.

- This is a **messaging adapter, not a workflow**. `docs/workflows/delegation.md`,
  `visual_check.md`, `writespec`, and `speccheck` retain authority over how work is specified,
  implemented, verified, repaired, and integrated. The adapter owns only Codex-TUI-specific message
  transport.
- The first Codex TUI orchestrator creates one epic-scoped receiver named `codex-tui-receiver`:
  OpenCode GUI, `deepseek:deepseek-v4-flash`, max reasoning effort, DrinkSmart repository context,
  and `full_access`. It has no worktree and relies on a strict instruction to acknowledge and
  preserve messages without using tools, editing files, answering substantively, contacting agents,
  or making decisions.
- The receiver is the **sole usable inbound channel** while Codex TUI orchestrates. Implementation
  commissions retain `--expect-reply`, but Traycer's native response thread still targets Codex TUI
  and cannot be redirected. Every implementation agent therefore explicitly sends each question,
  status, blocker, and handback to the receiver with `traycer agent send --to <receiver-id>`.
- Codex TUI reads the one receiver transcript, answers the originating implementation agent with a
  fresh outbound message, then appends a processed control marker. An unmatched message ID is
  logically unread; the marker makes handled state recoverable after context compaction, restart, or
  a later Codex TUI orchestration session.
- The receiver remains idle when Codex TUI is not orchestrating and is reused by later Codex TUI
  orchestrators in the epic. A later orchestrator reads the existing transcript, reconciles pending
  messages, and records its activation; it does not create a per-session receiver.
- The existence of a question route does not weaken specification quality. `writespec` is applied as
  though the implementer cannot ask, while genuinely unforeseen questions may use the receiver.
- `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` is the canonical contract and the thin repo-local
  `$codex-tui-relay` skill activates it. `AGENTS.md` is the discovery hook. The skill's mirrored
  Claude package exists only for repository parity and does not trigger there.

## LOCKED — Codex TUI artifact-ledger A2A hub (2026-08-10; amended 2026-08-11)

- Oscar manually creates and cleanly initializes one epic-scoped OpenCode GUI / DeepSeek V4 Flash /
  max / `full_access` agent named `codex-tui-a2a-hub`. It has the DrinkSmart root as its primary
  working directory and uses the repo helper to reach the absolute epic-ledger path; no additional
  workspace binding is required. Codex TUI never creates, configures, messages or impersonates this
  hub.
- `$codex-tui-relay` creates or resumes exactly one append-only Traycer artifact ledger per epic.
  Codex appends exact spawn/reuse/send commands and substantive replies; the hub claims and executes
  them through its supported A2A identity and appends receipts and implementation-agent messages.
- Codex remains the sole orchestrator. It selects agents, obtains warm-reuse approval, writes specs,
  decides whether and how to answer, checks transcripts, reviews, repairs, accepts and integrates.
  The hub performs transport mechanics only and never edits DrinkSmart source or makes decisions.
- ~~The user manually wakes the hub with `Check the relay ledger` after Codex queues outbound work.~~
  **Superseded 2026-08-11 by the relay waker (below).** Manual waking remains the documented fallback
  whenever the daemon is not running. The original exclusion stands as written for its actual target:
  private WebSocket automation and GUI prompt injection are still forbidden, and Codex TUI is still
  never an A2A sender.
- The hub issues Codex-authored commissions with `--expect-reply`, so native implementation-agent
  responses return directly to the hub and are copied verbatim into the ledger. A separate passive
  receiver message is unnecessary.
- Ledger appends use a short lock and validation helper. Claims do not expire automatically; stale
  claims are reconciled against agent lists and transcripts before retry, preventing duplicate
  agents and messages where Traycer exposes sufficient evidence.
- `docs/agent_setup/CODEX_TUI_MESSAGE_RELAY.md` remains the canonical contract and the thin
  repo-local `$codex-tui-relay` skill activates it. All delegation, verification, review and
  integration workflows remain unchanged outside their transport step.

### Amendment — the relay waker closes the manual wake step (2026-08-11)

- **`tools/relay-hub-waker` wakes the hub automatically.** It watches the epic ledger's mtime and
  sends `Check the relay ledger.` only when `pending_commands` is non-empty. It is a doorbell with no
  judgement and no authority: it never claims, interprets, executes, answers or accepts anything.
  Decisions stay with Codex and A2A actions stay with the hub, so the transport boundary is unchanged.
- **A daemon is the only thing that can do this.** Every agent is reactive — it exists during a turn,
  and a turn begins because something messaged it — so no agent and no skill can notice a file change.
  A skill is inert text loaded into a turn that is already happening; it cannot schedule a future one.
  `tools/waker-daemon-start` is the only supported way to run the daemon.
- **This uses the supported CLI, not a bypass.** The wake is an ordinary `traycer agent send`,
  byte-identical to Oscar typing the phrase himself. No private WebSocket, no prompt injection, no
  Codex-as-sender. The prohibition on "sender-identity spoofing" is narrowed to its intent: **Codex
  TUI must never be the sender, and no actor may impersonate an agent that acts on its own behalf.** A
  dedicated never-prompted identity used by a non-agent process is not impersonation, because the
  daemon has no identity of its own to misrepresent.
- **Sender identity, confirmed empirically 2026-08-11.** Traycer's `resolveSenderAgentId` requires a
  real sender agent id from `TRAYCER_AGENT_ID` or a flag, and a detached process outside any agent turn
  sends successfully when it is supplied. The sender is a dedicated agent named `a2a-hub-waker` that
  takes one throwaway turn (`do nothing`) at creation and is never prompted again; only a message's
  recipient is woken or charged. That turn is deliberate: whether an agent that has **never** run is
  accepted as sender is untested, and giving it a real session sidesteps the question rather than
  relying on the answer. It must never be the Codex TUI orchestrator nor the hub itself.
- **Agents are addressed by name, never by id.** Traycer ids change whenever an agent is recreated, so
  a stored id is a stale id waiting to happen. The daemon resolves `codex-tui-a2a-hub` and
  `a2a-hub-waker` at launch and re-resolves after a failed send, so recreating either heals itself with
  no edit and no restart. Duplicate names break resolution outright, so the `relay-waker` skill must
  never create a missing agent or substitute a different sender.
- **The hub runs `relay-waker` before ending every cycle.** That end-of-turn check is what makes the
  system self-sustaining, and it is the skill's real purpose: the mechanics live in the launcher, while
  the skill supplies the trigger and the refusals a script cannot enforce on an eager model.
- **The self-starting gap is accepted, not fixed.** Liveness is only observed during a hub turn, so a
  daemon that dies while the hub is idle goes unnoticed until Oscar says `Check the relay ledger.` once.
  A systemd user unit with `Restart=always` would close it and is deliberately not built: the symptom
  is obvious and recovery is one prompt. `wsl --shutdown` and reboots kill the daemon undetected.
- `docs/agent_setup/RELAY_WAKER.md` is authoritative for design, bring-up, terminal rules and log
  meanings; the `relay-waker` skill stays thin and defers to it.

### Amendment — three findings from first live operation (2026-08-11)

- **The relay works end to end.** Smoke item 8 passed unattended at 18:36:06Z: Codex appended
  `01KZS1R9…`, the daemon detected it and woke the hub as `a2a-hub-waker`, and the hub claimed and
  delivered a W3-STEP6 resume with nobody prompting anything.
- **Detached processes launched from an agent shell are reaped with Traycer.** Anything started from
  one inherits the cgroup `/user.slice/…/app.slice/ai.traycer.host.service`; `setsid` escapes the
  session but **not** the cgroup, so a well-detached process still dies when that service is reaped.
  Confirmed by the waker daemon and both git visualiser servers dying in the same window, three times
  in one evening. This is the reason long-running local tooling keeps "silently disappearing". A
  `systemd --user` unit with `Restart=always` is the fix and is deliberately **not** built; revisit if
  hand-restarting becomes tiresome, noting that reaping also defeats the hub's end-of-turn liveness
  check, because a daemon reaped while the hub is idle is noticed by nobody.
- **Codex's sandbox must allow network for any Traycer CLI call.** `sandbox_mode = "workspace-write"`
  denies network by default, and the CLI reaches its host service over it, so every `traycer agent
  list` failed while filesystem work succeeded — a fingerprint that reads convincingly as a code bug.
  `.codex/config.toml` now sets `network_access = true` under `[sandbox_workspace_write]`. Without it
  Codex cannot start the daemon that `$codex-tui-relay` instructs it to start.
- **Tools resolve Traycer identity rather than demanding it.** Only an agent's own shell inherits
  `TRAYCER_EPIC_ID` and `TRAYCER_AGENT_ID`; a Traycer UI terminal tab does not. Requiring them made
  both the waker launcher and the visualiser unusable from an ordinary terminal. `tools/traycer-identity`
  (mirrored into `git_visual_system`) resolves the epic from Traycer's open-tab state and the caller
  identity from a validated cache it seeds inside any agent session. Any agent the user owns works as
  a caller.

## LOCKED — Multi-harness delegation and permission parity (2026-08-08)

Verified empirically; each point cost attempts to discover.

- **Target-side agent-to-agent messaging on `--surface tui` is Claude-Code-only.** `codex` and
  `opencode` both fail `agent.create` with `TARGET_TUI_UNSUPPORTED — harness cannot participate in
  agent-to-agent messaging`. Non-Claude implementers must use `--surface gui`.
  This does **not** contradict `docs.traycer.ai/agents-and-models/coding-agents`, which lists Claude
  Code, Codex, and OpenCode as Terminal-interface capable. That matrix is about which harnesses can
  *back a terminal session a human drives*. It documents nothing about agent-to-agent messaging.
  Both are true: you can launch codex or opencode in a terminal tab yourself; you cannot have
  another agent message one there and get a structured reply. An implementation target therefore
  needs `gui`. Codex TUI may still orchestrate while `$codex-tui-relay` is active: it writes exact
  commands to the epic ledger, and its user-created GUI hub performs the A2A mutations and records
  native replies.
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
- **Retire a Traycer worktree through Traycer, then retire its branch through Git** (settled
  2026-08-09). First run `traycer worktree list --json --include-activity` and do not touch any row
  classified `in-use`; obtain explicit approval for a `review` row. Remove the approved path with
  Traycer's `/opt/Traycer/resources/cli/linux-x64/traycer` executable and its `worktree delete`
  command, passing `--path <absolute-worktree-path> --json --no-progress`; do not use
  `git worktree remove` or `rm`.
  Traycer deliberately leaves the named branch behind. Verify it contains no commits absent from the
  integration branch with
  `git merge-base --is-ancestor <branch> main`, then use `git branch -d <branch>`; never substitute
  `-D` merely to make cleanup succeed. Finally re-run both the Traycer inventory and
  `git worktree list` to confirm removal.
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

- `design_handoffs/design_handoff_drinksmart/` is the authority for the frontend redesign. `README.md` is the spec
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
- **Canonical archive path (amended 2026-08-11).** `design_handoffs/` contains Claude Design
  handoffs in chronological order. The newest unsuffixed bundle,
  `design_handoffs/design_handoff_drinksmart/{README.md,screens/,tokens/}`, is authoritative; older
  exports remain alongside it with `depreciated` in the directory name and are historical only.
  This supersedes the former repository-root `design_handoff_drinksmart/` path. Exports may nest
  the active bundle deeper; lift it back to the path above because current docs and specs reference
  it directly. The wider project export (`DrinkSmart.dc.html`, `_ds/`, `ios-frame.jsx`,
  `support.js`, `uploads/`) sits under `design_handoffs/design_handoff_drinksmart/project/`. Strip
  `:Zone.Identifier` files when unzipping on Windows into WSL; they are never tracked.
- ~~Two in-repo amendments to the bundled README (2026-08-06) are part of the spec.~~
  **Superseded 2026-08-08 by designs `1n`/`1o`.** The amendments held the four-band scale as prose;
  it is now drawn, and README §1n/1o states *"supersedes 1c"* and carries the whole spec. Prose
  replaced by a drawing is a promotion up this ladder, so the amendments are **not** restored. The
  general rule from the earlier export still stands: an export that *deletes* an amendment without
  drawing its content is a regression and must be restored.

**Precedence ladder (amended 2026-08-08).** Claude Design entities are ground truth for UI, and for
backend design concerning those entities. Where sources disagree, the higher rank wins outright and
the lower is treated as stale — no reconciliation, no averaging:

1. `design_handoffs/design_handoff_drinksmart/tokens/` — production code; already applied.
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
- **`cn()` must be told about the font-size scale, and now is** (2026-08-12). `cn()` is `twMerge`,
  which classifies a `text-*` class by its suffix: stock t-shirt sizes are font-size, and anything
  else falls through to the **colour** group. Our scale is named rather than sized, so `text-body`,
  `text-title`, `text-micro` and the rest were all read as colours and evicted by any colour later
  in the same call — `twMerge("text-body text-foreground")` returned `"text-foreground"`, while
  `twMerge("text-sm text-foreground")` kept both. `src/lib/utils.ts` now registers the scale via
  `extendTailwindMerge`; **keep that list in step with `fontSize` in `tailwind.config.ts`, because a
  token missing from it can be silently dropped again.** Live damage was small only by luck — a
  dropped size inherits `body`'s 19px, so `text-body` survived by accident and only
  `ToastDescription` was wrong. The hazard was forward: the first `cn("text-title", colour)` in new
  work collapses 28px to 19px with nothing in the component to show why, and a visual check would
  hunt it in the wrong place. Found by an implementer, not by review.
- Delegation runs in **waves**. Within a wave, specs must own **disjoint file sets** — file-level
  ownership is what prevents interference, and it removes the need for agent-to-agent chat between
  implementers. Reserve a2a for cases where two implementers must agree on an interface, which
  correct partitioning should avoid.
- The shadcn top-tabs pattern is not used anywhere. The three tabs live in the bottom bar;
  `src/components/ui/tabs.tsx` is owned by that work alone, not by the primitives pass.

## LOCKED — Delegation threshold, spend ledger, and the capped visual pass (2026-08-13)

- **Delegation has an explicit size-and-kind gate**, decided at scoping time
  (`docs/workflows/delegation.md`, "When to delegate at all"): delegate mechanical, fully
  specifiable diffs of roughly 150+ production lines or any multi-leg disjoint wave; keep inline
  anything smaller, anything requiring design judgment mid-implementation, dense single-file
  logic, and work whose independent tests would rival the implementation. Rationale: delegation
  removes iteration *churn* from the orchestrator's window, not code — the spec, handback diff,
  tests, and repairs all land in its context regardless — so below the threshold the fixed
  per-delegation floor exceeds the churn and delegation loses on tokens, latency, and quality at
  once. The line count is a working estimate, to be corrected by the spend ledger.
- **`docs/delegation_spend.md` is the single source of delegation token history**: one row per
  delegated leg — date, label, orchestrator-context tokens (spec-start to integration done,
  estimate acceptable), and a short "where they went" note. `tools/spend-guard`, registered as a
  second `PreToolUse`/`Bash` hook, denies any `git merge` **of** an `integration*` ref until the
  batch's well-formed rows exist (working tree, index, or on the merged ref). Mentions in
  heredocs and merges *into* integration branches pass through; the literal marker `[no-ledger]`
  bypasses deliberately, for merges that integrate no delegation. Regression cases are hermetic
  in `tools/check-agent-setup` via `SPEND_GUARD_REPO`. This narrows the 2026-08-07 entry's
  "nothing else is mechanically enforced" statement: commissioning and integration are now both
  machine-gated.
- **The final visual check's orchestrator pass is capped, and Luna's justification is economic,
  not capability** (`docs/workflows/visual_check.md`). The orchestrator is multimodal — its §9
  pass proves it — so Luna is used because it looks at screenshots at a fraction of frontier cost
  on the ChatGPT subscription, and remains the only *implementer* that can ingest images at all.
  §9 runs numeric-first (`getComputedStyle`/bounding-box read-backs before any image) and ingests
  exactly one capture per drawn screen, once, with no re-shoot loop; findings are fixed inline
  and confirmed by read-backs. A2A coordination between Luna fixers stays deliberately unbounded
  (Oscar, 2026-08-13): Luna is cheap enough that bounding it is not worth the ceremony.
- `ORCHESTRATION.md` (repo root) is the judgment layer over the workflow contracts — strengths,
  weaknesses and mitigations, ten reasoned usage rules, and the falsification criterion the spend
  ledger will settle. It records assessments rather than contracts; the workflow documents remain
  authoritative where they differ.

## LOCKED — Amendments from the W4-B integration (2026-08-13, later)

- **A checker's own tests are part of the diff under review.** `speccheck` step 11 already says to
  read the bodies of tests the *implementer* supplied, because a test named for a clause can contain
  nothing that exercises it. W4-B produced the same failure one level up: the checker extracted
  `nextGapTarget`, wrote a passing W4-6-C4 case against it, and left `ScannerReview.advanceFrom`
  reimplementing a narrower scan — so the helper was dead, the shipped cross-drink path had no
  coverage, and the suite was green. **A clause-derived test must exercise the code that ships;
  assert against the helper the component actually calls, or the coverage is theatre.** Extracting
  logic to make it testable is right in this repo (there is no jsdom or testing-library, so pure
  helpers plus `renderToStaticMarkup` is the only route) — but the extraction is only finished when
  the caller is switched over.
- **`tools/spend-guard` resolves its repository root from the merge target**, not from its own script
  path (fixed `081b209`). A checkout and its worktrees share a repository but not a HEAD, so running
  the step-14 fast-forward from a worktree whose HEAD was already the integration branch made both of
  the guard's checks — new rows versus HEAD, and rows carried by the merged ref — compare that branch
  against itself, and it denied a merge whose rows were present and committed. Resolution order is
  now `git -C`'s directory, then the PreToolUse payload's `cwd`, then the script's checkout;
  `SPEND_GUARD_REPO` still overrides all three, so the hermetic cases in `tools/check-agent-setup`
  are unaffected. This refines, not reverses, the entry above.
- **A spend-ledger row states whose spend it is.** W4-B was checked twice — the Codex orchestrator
  died mid-repair and Opus 5 finished the pass — so its two rows record the Codex half only and
  understate the batch. The undercount is noted beside the rows. Rows exist to correct the delegation
  threshold, so a silent handover cost would bias exactly the number they are meant to fix.

## PENDING

- ~~**Still undrawn after the 2026-08-08 export:** Profile / onboarding (`StatsForm`,
  `PreferencesPicker`), drink picker, menu scanner, establishment browsing, and auth.~~ **Closed
  2026-08-11:** the active export draws §B–G as `4a`–`4n`, supplies exact prose/HTML criteria, and
  adds the only new primitive as `4o`. Form primitives remain covered by `1l`/`1m`. **Wave 4 is
  unblocked.**
- ~~Band names and subtitles for the four-band picker are proposed, not drawn.~~ **Closed
  2026-08-08** — drawn as `1n`/`1o`, wording as proposed (Light / Social / Loose / Heavy, "gaps in
  the night" for Heavy).
- Light theme values in `:root` are derived, not designed. Replace wholesale on the next export.
- Timeline layout 1e (proportional time axis) is an option, not a requirement. Ship 1d unless the whole
  night is guaranteed to fit without scrolling.
- Meter form: 1h continuous is recommended for the Plan target card, 1j mid-session for the Timeline.
  Pick one object and use it everywhere.
- ~~Nothing in the redesign has been rendered in a browser.~~ **Closed 2026-08-11:** Waves 2 and 3
  completed independent browser/screenshot acceptance. ~~Wave 4 is designed but has not yet been
  implemented or rendered.~~ ~~**Updated 2026-08-13:** all seven Wave 4 legs are implemented, reviewed,
  repaired and integrated (`main` at `081b209`). **No part of Wave 4 has been rendered in a browser**
  — that is the visual check's job and it has not run.~~ **Closed 2026-08-13:** the Wave 4 visual
  check ran and is complete (`main` at `286a877`). One recon agent and three fixers in one shared
  worktree; every drawn frame `4a`–`4o` captured at 402x874 with `getComputedStyle` read-backs, and
  the orchestrator's capped section 9 pass verified the cross-cutting locked rules independently.
  Deferred to the next wave, both compositional rather than styling defects: the auth screens lack
  the bottom chrome `4m` draws, and `1c`/`4d` are drawn as two screens where the app stacks them on
  one scrolling surface.
- Live Supabase migration, auth, RLS, and edge-function verification.
- Real iOS and Android notification/build verification.
- ~~Unit coverage for the extracted AppContext session/pacing engine remains pending in W3-A2.~~
  **Closed 2026-08-11:** W3-A2 added the pure session engine and checker-derived coverage; the
  accepted Wave 3 suite contains 93 tests across planner and session behavior.
- ~~A test runner so `speccheck`'s spec-derived tests are runnable.~~ **Closed 2026-08-09** — Oscar
  approved Vitest `^3.2.7`; W3-A1 installed it and added `npm test` to the verification profiles.
