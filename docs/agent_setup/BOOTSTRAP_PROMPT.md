# Bootstrap Prompt for a Newly Cloned Machine

Give the following prompt to either Codex or Claude Code from the DrinkSmart repository root:

```text
Read AGENTS.md and docs/agent_setup/CROSS_MACHINE_SETUP.md completely. Identify whether you are Codex
or Claude Code, then read the matching setup guide and SKILL_CATALOG.md. Keep this bootstrap scoped to
local agent setup: do not change application code, install dependencies, deploy anything, or copy
secrets. Run tools/check-agent-setup. Verify the repo-local instructions and skills are discoverable. Then inspect, but do not overwrite, any same-name user-level skills. Ask for approval
before copying the recommended generic personal skills to the correct user directory. Do not install
project lifecycle or benchmark skills user-wide. Report exact paths, validation results, conflicts,
and anything that still requires a client restart or repository trust action.
```

Afterward, start a fresh session inside each other cloned repository. For `legal-graph-db-rag`, use its
own repo-local skills and workflow files rather than replacing them from DrinkSmart.
