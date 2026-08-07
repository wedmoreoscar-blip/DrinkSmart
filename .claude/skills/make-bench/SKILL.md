---
name: make-bench
description: Design and scaffold a new reproducible project benchmark without overwriting existing work. Use when asked to create, make, design, or scaffold a benchmark, evaluation, bake-off, or model comparison.
---

1. Read `docs/workflows/benchmarking.md`, `docs/workflows/change_safety.md`, and current benchmark
   conventions.
2. Settle the behavior under test, candidates, case shape, frozen inputs, grading method, independent
   judge needs, smoke command, cost ceiling, and success criterion before costly work.
3. Propose `benchmarks/<name>/` and stop if it already exists.
4. Create only the necessary cases, runner, grader, report, findings, and ignored-results structure.
5. Ensure the runner supports a smoke-sized run and failures are resumable without replacing valid rows.
6. Report what is runnable, what remains, and the exact smoke command. Do not start a full or paid run
   unless separately authorized.
