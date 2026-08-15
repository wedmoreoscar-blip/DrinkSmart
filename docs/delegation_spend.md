# Delegation spend ledger

The single source of delegation token history. One row per delegated leg, appended by the checker
at integration time (speccheck step 8). `tools/spend-guard` denies the fast-forward of `main` from
an `integration*` branch until the batch's rows exist, so the entry is enforced, not advisory.

**Tokens are the orchestrator's context spend for that leg** — spec-start to integration done —
read or estimated from the session transcript or usage display. An estimate is fine; a missing row
is not. "Where they went" is a short breakdown or label (e.g. `spec 6k, clause map+tests 22k,
repairs 10k`), enough that the row explains itself a month later.

These rows are the evidence that will correct the inline-vs-delegate threshold in
`docs/workflows/delegation.md` ("When to delegate at all"), which is currently a reasoned guess.
A merge that genuinely integrates no delegation bypasses the guard with the literal marker
`[no-ledger]` in the merge command.

| date | delegation | orchestrator tokens | where they went |
| --- | --- | --- | --- |
| 2026-08-13 | W4-5 drink picker | ~260k | spec 12k, commission + handback 30k, clause map 40k, independent tests 60k, repairs 90k, baseline 28k |
| 2026-08-13 | W4-6 menu scanner | ~250k | spec 12k, commission + handback 28k, clause map 38k, independent tests 58k, repairs 86k, baseline 28k |
| 2026-08-13 | W5-1 Plan curation | ~60k | spec 9k, commission + handback 8k, clause map 14k, merged-boundary repair/tests 21k, shared baseline 8k |
| 2026-08-13 | W5-2 Timeline editing | ~95k | spec 11k, commission + handback 12k, clause map 22k, re-plan/reorder/water repairs + tests 42k, shared baseline 8k |
| 2026-08-13 | W5-3 bounded picker/swap | ~120k | spec 12k, commission + handback 18k, clause map 30k, Dashboard/category/break-swap repairs + tests 52k, shared baseline 8k |
| 2026-08-13 | W5-4 onboarding Strength | ~55k | spec 8k, commission + handback 8k, clause map 12k, endpoint/family-test repairs 19k, shared baseline 8k |
| 2026-08-13 | W5-5 tray meter bands | ~45k | spec 7k, commission + handback 7k, clause map 10k, boundary/pending tests 13k, shared baseline 8k |
| 2026-08-15 | W5-6 venue, portions, manual plans | ~95k | spec + commission 18k, handback 8k, clause map + independent tests 30k, shared-state/catalog/budget/price repairs 31k, baseline 8k |

Wave 5 rows are estimates split from one Codex TUI batch. The acceptance repair commit names the
routine spec gaps that required checker-owned inline work: generation hint/state sync; consumed
re-plan accounting; fixed-slot reorder; water/break action identity; Dashboard swap routing;
planned-category visibility; red-band boundaries; five-chip/end-label tests; browser-safe metrics
persistence; and removal of new bundler warnings.

Both rows are estimates split from one batch. The Codex TUI orchestrator (session `019ff81c`) ran
both legs in a single context and recorded ~471k uncached input + ~39k output tokens over the whole
session, which spans exactly this batch — kickoff at `48b994b` through the repair pass. The ~510k
total is halved slightly in W4-5's favour because the picker leg carried the larger spec, the larger
diff, and the extra `W4-INT-C1` navigation clause.

Two caveats worth keeping with the numbers, because they bear on the threshold these rows exist to
correct:

- **The batch was checked twice.** The Codex orchestrator died mid-repair; Opus 5 took over at
  delegation.md step 12, re-derived the state from the transcript and the acceptance record, and
  finished the repair pass, baseline, and integration. The rows count the Codex spend only, so the
  true cost of this batch is higher than recorded. A clean run would not pay the handover.
- **The single largest line is repairs, not the spec.** That is the shape delegation.md predicts for
  work at this size, and it is the half the checker pays regardless of who implements.
