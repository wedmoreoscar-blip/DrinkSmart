# The Orchestration System — What It's For, Where It Wins, How to Use It

A candid operating guide to DrinkSmart's delegation setup, assessed on the three axes that
justify its existence: **latency** (how fast work completes), **accuracy** (how good the code
is), and **subscription efficiency** (production output per Claude Pro / ChatGPT Plus weekly
limit). Written 2026-08-13 from the Wave 1–4 record. The workflow contracts themselves live in
`docs/workflows/`; this file is the judgment layer on top of them.

## What the system actually is

A frontier orchestrator (Opus/Fable on the Claude sub) plans, writes specs, reviews, tests,
repairs, and integrates. Cheap implementers do the typing: DeepSeek V4 Flash (out-of-pocket API,
zero subscription load) for essentially everything, GPT-5.6 Luna (ChatGPT Plus, ~20–25× cheaper
than Sol) for images and spatial work. One review pass, one repair loop, one baseline per
delegation batch; `main` advances only by fast-forward.

## The core economics — know what you're actually saving

Delegation does **not** keep code out of the orchestrator's window. The spec, the handback diff,
the independent tests, and the repairs all land in its context anyway. What it removes is the
**iteration churn** — exploration, failed attempts, re-edits, command output — which is typically
3–10× the size of the finished diff, and which is the real consumer of context window and output
tokens in hands-on coding. Every design choice below either buys more churn arbitrage or reduces
the fixed overhead floor each delegation pays (provision, spec, round-trip, clause map, tests,
repairs, baseline).

## Where it's strong

- **Batched fan-in.** Five disjoint legs → one speccheck pass → one repair loop → one baseline.
  Wave 4 evidence: 27 clauses across five branches, 24 satisfied, 3 repaired inline, 0 handed
  back, one baseline. This amortization is the system's single best feature on all three axes.
- **Off-subscription bulk output.** Every line DeepSeek types is a line the Claude sub doesn't
  pay output-token weight for, and DeepSeek bills real money, not weekly limits.
- **Independent verification.** The checker derives tests from the spec's clauses, never from the
  code. This beats a solo frontier agent on accuracy, because self-authored tests encode the
  author's blind spots — a green suite can report success over a clause nobody built. The
  clause map catches the one defect class tests cannot: the missing clause.
- **Warm assets.** Worktrees stay provisioned and agents stay cached; reuse skips the
  create/install/configure/verify cycle entirely.

## Where it's weak, and what was done about it

| Weakness | Consequence | Mitigation in place |
| --- | --- | --- |
| Fixed overhead floor per delegation | Small tasks cost more delegated than done inline, on every axis at once | Explicit threshold in `delegation.md` ("When to delegate at all"): ~150+ mechanical production lines or a multi-leg wave delegates; smaller, design-heavy, or test-heavy work stays inline |
| The threshold is a guess | No data ever measured delegated vs. inline cost | `docs/delegation_spend.md` ledger, one row per leg, enforced by `tools/spend-guard` at every integration — the rows will correct the number |
| 2-of-4-core WSL contention | Parallel verification starved agents 5.5× (2m40s vs 29s builds); a starved agent looks stalled, producing wrong diagnoses | Implementers run only `typecheck` + `vitest`; lint/build are checker-only, hook-enforced; orchestrator never runs baselines while agents work |
| Clause map catches omissions, not mediocrity | DeepSeek code can satisfy every clause and still be fragile in the details; diff-reading is a weaker quality filter than authoring | Inline repairs by the checker, named in the acceptance record so under-specification becomes visible as a trend; dense logic routed inline by the threshold |
| Spec must pre-answer everything | For design-heavy work the spec *is* the solution serialized as prose — nothing was saved | Same threshold: design judgment stays with the orchestrator |
| Orchestrator's visual pass bills images at frontier weight | §9 of `visual_check.md` was the priciest step on the Claude sub | Capped: numeric `getComputedStyle` read-backs first, exactly one image per screen, no re-shoot loop |
| Every handoff re-pays a large cold start | The standing prefix (CLAUDE.md + workflows) is big; frontier cold starts are the expensive event | Handoff at ~350k, warm-context reuse for implementers, and the advice below about session packing |

## Actionable advice

Each item states the rule and the reason. The reasons are the part to internalize — they tell you
when the rule stops applying.

1. **Pack waves into as few orchestrator sessions as possible.** The marginal value of another
   delegation inside a warm session is high: the standing prefix and project context are already
   paid for and cached, so each additional wave rides nearly free on input. The same wave in a
   fresh session re-pays the full cold start. Corollary: don't end a session with a planned wave
   un-dispatched if context still allows it.
2. **Prefer one wide wave over two narrow ones.** Fan-out cost is per-wave (one review pass, one
   baseline), not per-leg. Three disjoint legs in one wave cost one integration cycle; the same
   legs across two waves cost two. Partition the specs to be disjoint and go as wide as the specs
   allow — never shrink a wave to reduce machine load; cut the expensive per-implementer commands
   instead (already done).
3. **Respect the inline threshold in both directions.** Under ~150 mechanical lines, or anything
   design-heavy, delegating loses on tokens, latency, *and* quality simultaneously — the floor
   exceeds the churn. Above it, especially for boilerplate-heavy UI or migrations, delegation's
   churn arbitrage is large. The threshold is written down so the call is made at scoping time,
   not felt out at dispatch time.
4. **Spend spec effort where churn is high, not where the code is hard.** Hard code has low
   churn-to-diff ratio and belongs inline. High-churn mechanical code is where a cheap
   implementer eats the exploration cost for you. If you notice a spec taking as long to write as
   the code would, that task was mis-routed.
5. **Fill the spend ledger honestly, including the "where they went" note.** One row per leg,
   enforced at merge time. This is the only instrument that will ever tell you whether the system
   beats a solo frontier agent for a given task size — guard it from becoming a formality.
6. **Watch the inline-repair trend, not individual repairs.** Three consecutive tickets with a
   clause completed inline means specs are under-specifying or the implementer is
   underperforming. The acceptance-record notes exist to make that visible; act on the trend.
7. **Route images to Luna, always; let the orchestrator look exactly once.** The orchestrator is
   multimodal — Luna's role is price, not capability. Every screenshot the orchestrator ingests
   outside the single capped §9 pass is frontier-weight spend duplicating work Luna does at a
   fraction of the cost, on the other company's subscription.
8. **Reuse warm agents and worktrees by default; treat creation as the exception.** A clean
   worktree level with `main` has dependencies installed and agent context cached. Creating fresh
   costs the full provision cycle and a cold parse of the codebase — the exact cost the warm-reuse
   rule exists to avoid. (Reuse still needs Oscar's confirmation; make it a one-block question.)
9. **Never verify while agents verify.** Two WSL cores are the whole budget. The orchestrator's
   baseline waits until handbacks are in and runs once on the integration branch — which is what
   the workflow wants anyway.
10. **Fix forward on a failed batch baseline.** Falling back to per-branch integration unpicks
    repairs already applied to re-derive attribution that is almost never the problem — the
    failure is nearly always a small semantic clash between branches. Repair inline, re-run,
    move on.

## What would falsify this design

If the spend ledger accumulates rows showing delegated legs of ordinary size costing as much
orchestrator context as inline authorship, the system is paying its overhead floor without
collecting churn arbitrage, and the threshold should rise — or the whole path should narrow to
wide mechanical waves only. That is a data question now, not an argument; the ledger settles it.
