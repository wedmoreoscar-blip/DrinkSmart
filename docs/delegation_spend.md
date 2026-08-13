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
