# Benchmarking

Benchmarks live under `benchmarks/<name>/`. A benchmark should test one explicit behavior or model
decision with frozen inputs and reproducible grading.

## Minimum contract

- `cases.*` or `queries.*`: versioned inputs and expected/gold information where applicable.
- A candidate runner with a smoke-sized mode.
- A deterministic grader where possible; otherwise a documented judge and calibration method.
- A report script or command producing a comparable table.
- `FINDINGS.md` containing methodology, date, configuration, raw-result locations, failures, and the
  decision supported by the run.
- Generated results under a documented ignored directory unless small raw evidence is intentionally
  versioned.

## Running an existing benchmark

1. Identify one unambiguous benchmark directory and read its instructions, scripts, prior findings,
   and dirty state.
2. Record candidate versions, model strings, prompts, dataset version, judge, and external services.
3. Run the smallest smoke case first. Diagnose failures before scaling.
4. Use `tools/agent-lock benchmark -- <command>` for costly, networked, or shared-resource runs.
5. Retry only incomplete/error records. Never silently replace valid earlier rows.
6. Grade and report exact counts, failures, costs when available, and raw artifacts.
7. Append a dated result to `FINDINGS.md`; distinguish an observed result from a product decision.

## Creating a benchmark

Before scaffolding, settle the behavior under test, candidates, case shape, frozen upstream inputs,
grading method, judge-independence requirement, smoke command, cost ceiling, and success criterion.
Never overwrite an existing benchmark directory.
