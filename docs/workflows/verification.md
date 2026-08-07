# Verification

Report `PASS`, `FAIL`, `SKIP`, and `BLOCKED` distinctly. State the exact command, relevant output, and
coverage boundary.

## Profiles

Run the project wrapper from repository root:

```bash
tools/test-project quick
tools/test-project build
tools/test-project full
```

- `quick`: `npm run typecheck` and `npm run lint`.
- `build`: `npm run build`.
- `full`: quick plus build. It still does not verify a live backend, browser flow, or native device.

Use the smallest profile that covers the change. If tests are added later, place deterministic unit
tests in `quick` or a documented dedicated profile; do not silently redefine build success as test
success.

## Evidence categories

- Static: TypeScript and lint.
- Bundle: Vite production build.
- Unit/integration: an actual test runner with assertions.
- Browser: exercised behavior in a running application.
- Supabase: real auth, migrations, Row Level Security, and edge functions against the intended project.
- Native: Capacitor build and behavior on iOS or Android hardware/simulator.

A change can pass one category and remain blocked in another. Report that boundary directly.

## High-risk areas

- For BAC, total-body-water, ethanol, or pacing changes, add focused deterministic tests and compare
  known scenarios. Do not rely on typecheck alone.
- For auth or RLS changes, inspect migrations and generated types, then verify with anonymous and
  permanent users against a real Supabase environment when authorized.
- For edge functions, verify request validation, authenticated identity, model failure, timeout, and
  deterministic fallback paths.
- For notification or Capacitor work, browser-only checks do not cover native behavior.
