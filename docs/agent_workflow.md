# Cross-Client Agent Workflow

Codex and Claude Code use different native model and agent definitions, but they must preserve this
shared contract.

## Roles and routing cost

- The planner owns user communication, approved scope, acceptance criteria, orchestration, and final
  integration.
- The implementer owns one scoped unit of judgment-bearing code work.
- The mechanical worker owns narrow deterministic work and stops if design judgment appears.
- The reviewer independently checks the approved plan, actual diff, regression risk, and evidence.

Keep a small, well-understood change inline when delegation would cost more than the work. Delegate
substantial scoped implementation to the implementer and rote bulk work to the mechanical worker.
Every delegated code change receives independent review.

## Lifecycle

```text
PLANNED -> WORKTREE_CREATED -> IMPLEMENTING -> IMPLEMENTATION_DONE
IMPLEMENTATION_DONE -> REVIEWING -> REVIEW_CLEAR | REVIEW_FAILED_1
REVIEW_FAILED_1 -> REPAIRING -> IMPLEMENTATION_DONE -> REVIEWING
REVIEW_CLEAR -> READY_TO_INTEGRATE -> INTEGRATED
second review failure -> REVIEW_FAILED_TWICE
user cancellation -> ABANDONED
```

1. Agree a plan containing files/components, acceptance criteria, test expectations, target branch,
   and integration expectations.
2. Create an isolated task with `tools/agent-worktree <codex|claude> <task-slug>`.
3. Assign a stable owner id and claim the write lease:
   `tools/agent-worktree claim <task> <implementer|mechanical-worker> <owner-id>`.
4. Give the writer the complete unit, worktree path, owner id, acceptance criteria, and verification
   expectations. The writer stops all writing processes, releases `IMPLEMENTATION_DONE`, and returns:

   ```text
   IMPLEMENTATION_DONE
   write_lease: released
   processes_stopped: yes
   changed_files: ...
   tests: ...
   base_commit: ...
   head_commit: ...
   assumptions_risks: ...
   ```

5. Only after release, claim as reviewer with a different stable id. The reviewer reads the plan,
   packet, applicable guidance, and actual diff; then independently validates it.
6. On success, the reviewer stages only reviewed task paths, commits the reviewed tree, confirms the
   worktree is clean, and releases `REVIEW_CLEAR` with exact evidence.
7. On `REVIEW_FAILED_1`, the reviewer releases ownership and the original writer gets one repair pass
   using the same role and id. A second failed review becomes `REVIEW_FAILED_TWICE`; the planner reports
   it and does not repair the work unilaterally.
8. Record `READY_TO_INTEGRATE` with the reviewed commit. Check target movement, dirt, and overlap;
   integrate only the reviewed change; rerun relevant verification; then record `INTEGRATED`.
9. On cancellation, stop writing processes and release `ABANDONED`. Clean up only clean, unowned tasks
   in `INTEGRATED` or `ABANDONED` state.

## Ownership, liveness, and evidence

- One lease means one writer. Reviewer and implementer never write concurrently.
- Use stable agent identities, not process ids or improvised fallbacks.
- Emit a concise update at each phase boundary and during validation/review lasting over 90 seconds.
- Arrange semantic self-review before the final validation command. Release the lease and send the
  evidence packet immediately after that command finishes.
- If an agent is inactive for 90 seconds, request its packet once. After 30 more seconds, interrupt it
  once and resume only to deliver evidence already gathered.
- A missing dependency, service, secret, browser, simulator, or backend is `BLOCKED`, not `PASS`.

See `docs/workflows/change_safety.md` and `docs/workflows/verification.md` for the integration and
evidence details.
