---
name: route
description: Enable the repository's planner, implementer or mechanical-worker, and independent-review workflow for approved code changes. Use when the user says route, enable routing, use the implementation-review workflow, or asks for delegated implementation with review.
---

1. Read `docs/agent_workflow.md` and `docs/workflows/change_safety.md`.
2. Set `tasks/route_state.md` to `routing: ON`; retain its workflow and granularity metadata.
3. Apply the routing cost rule. Keep tiny context-cached work inline; send scoped judgment work to the
   implementer and narrow deterministic work to the mechanical worker.
4. For delegated work, create and claim a task worktree with a stable owner id. Supply complete scope,
   acceptance criteria, files/components, verification, and lifecycle instructions.
5. Require `IMPLEMENTATION_DONE` and released ownership before an independent reviewer claims.
6. Permit one repair by the original writer after `REVIEW_FAILED_1`. Report
   `REVIEW_FAILED_TWICE` without planner repair.
7. Integrate only the reviewer-cleared commit after overlap checks and integrated-checkout verification.
8. Apply lifecycle updates and liveness deadlines from the workflow contract.
