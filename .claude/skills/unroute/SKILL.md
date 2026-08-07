---
name: unroute
description: Disable the repository's implementation-review delegation policy. Use when the user says unroute, stop routing, turn off delegation, no more subagents, or asks the active main agent to keep future implementation inline.
---

1. Set `tasks/route_state.md` to `routing: OFF` while retaining workflow and granularity metadata.
2. Do not cancel already running delegated work unless the user asks; finish or safely abandon it under
   `docs/agent_workflow.md`.
3. Tell the user that future implementation remains with the active main agent until routing is enabled
   again.
