---
name: bench
description: Run an existing project benchmark through inspection, smoke testing, full execution, retry, grading, reporting, and findings update. Use when asked to run, evaluate, compare, or bench candidates using an existing benchmark directory.
---

1. Read `docs/workflows/benchmarking.md`, `docs/workflows/verification.md`, and the target benchmark.
2. If multiple targets are plausible, ask which one; otherwise proceed with the single match.
3. Record candidates, versions, dataset, prompts, judge/grader, cost boundary, and external services.
4. Run a smoke-sized case first. Diagnose a failure before scaling.
5. Serialize costly or networked runs with `tools/agent-lock benchmark -- <command>`.
6. Retry only incomplete/error records, grade results, and append a dated evidence table plus concise
   interpretation to the benchmark's `FINDINGS.md`.
7. Report exact commands, failures, retries, raw artifact locations, and conclusions. Do not turn an
   observed result into a locked product decision unless the user approves it.
