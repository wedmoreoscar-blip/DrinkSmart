# Visual state — as built

**Snapshot updated 2026-08-08, after Wave 1 integration.** This file records what the app
*currently looks like in code*, not
what it should look like. It is the "before" half of the visual history; see
`02-planned-changes.md` for what is being changed and `03-design-requests.md` for what has been
asked of Claude Design.

Update this file only when a change has actually landed and been verified, never in anticipation.

---

## What has landed

**The token layer plus Wave 1.** Step 1 applied the handoff's `tokens/index.css` and
`tokens/tailwind.config.ts` (`b46de81`), then forced dark (`d1d2be8`). Wave 1 then landed the
geometry for the five drawn primitives and the meter (`afa6c5e`, `eff7f94`).

Before Wave 1 the app had the redesign's **colours and none of its geometry** — components picked
up colour automatically through CSS variables, while every hardcoded Tailwind class for height,
radius, type size and weight was untouched. Wave 1 closed that gap for `button`, `card`, `badge`,
`slider` and the meter. It remains open for the ~46 primitives the design never drew.

### Colour and theme

- Dark only. Two independent guards, both load-bearing: `forcedTheme="dark"` on the `ThemeProvider`
  in `src/main.tsx`, and `LIGHT_THEME_AVAILABLE = false` in `src/pages/Profile.tsx`, which hides the
  Appearance card and short-circuits the `profiles.theme` sync effect.
- `:root` carries a **derived** light palette so a future Claude-Design-drawn light theme can drop in
  without re-plumbing. It is unreachable at runtime.
- Inter self-hosted via `@fontsource/inter` (400, 500), imported in `src/main.tsx`. No CDN font.

### Tokens available to build against

| Group | Tokens |
| --- | --- |
| Type | `micro` 13 · `label` 15/0.09em · `body` 19 · `lead` 22 · `title` 28 · `display` 44 · `hero` 76 |
| Touch | `tap` 56px · `act` 64px |
| Radius | `sm` 4 · `md` 8 · `lg` 14 (`--radius`) · `xl` 20 · `vessel` 28 |
| Shadow | `sm` · `md` · `lg` — all edge-plus-ambient, never stacked drop shadows |
| Motion | `calm` `cubic-bezier(.32,.72,0,1)` · `liquid` `cubic-bezier(.4,0,.2,1)` |

`tap`, `act` and `vessel` exist but are **used nowhere yet**. They were added by the token layer in
anticipation of the primitives work.

**Known gap:** the nudge controls in design 1c are 12px radius, which is not on the scale. Add a
token or use an arbitrary value when 1c lands.

---

## Primitives: 5 done, ~46 at stock geometry

| Primitive | State |
| --- | --- |
| `button` | **DONE** — `act` 64px / `tap` 56px (default) / `icon` 56×56 r12; `sm` and `lg` kept as aliases of `tap`; outlined on transparent, never filled |
| `card` | **DONE** — `bg-card` r14, no shadow, plus `raised` and `warning` ring variants |
| `badge` | **DONE** — r8, 13px/0.06em uppercase, five variants: `kept` `break` `over` `had` `now` |
| `slider` | **DONE** — track 12px, thumb **56px** |
| `vessel-meter` | **NEW** — 96×300 vertical vessel, target line at 78% of height |
| `tabs` | not used at all — the bottom bar replaces it. Owned by Wave 2 |
| `input` / `select` / `dialog` / `popover` / … | `h-10` (40px) and below. Undrawn; see `03-design-requests.md` §A |

**Consequence to expect:** every screen now mixes 56px buttons with 40px inputs. That is the
accepted interim cost of the global scale, and it closes when §A is drawn and W1-C runs.

### Measured usage, 2026-08-08

**68 `<Button>` usages across `src/`.** Every one is below the design's 56px touch floor.

- 22 `size="sm"` (36px) · 14 `size="icon"` (40px) · 4 `size="lg"` (44px) · 2 explicit `default` ·
  the remaining ~26 implicit `default` (40px)
- Densest consumers: `MenuScannerTab` 10 · `DrinksTab` 7 · `PlanTab` 6 · `StatsForm` 6 ·
  `Profile` 5 · `TimelineTab` 4 · `DrinkFilterPopover` 4 · `Auth` 3

Other primitives in real use: `input` 8 files · `label` 13 · `select` 4 · `dialog` 3 ·
`checkbox` 3 · `switch` 3 · `popover` 2 · `textarea` 1.

---

## Known violations of the locked visual rules

These are live in `main` today and are the substance of the work ahead, not defects to file
separately.

1. ~~**Red and green are in the product.**~~ **FIXED** by Wave 1 (`eff7f94`). The battery meter's
   red/green gradients and its `progressPercentage >= 110` threshold are gone, along with the ⚠️/ℹ️
   emoji and the two Alert blocks below it. Amber `warning` is now the only status colour.
2. ~~**The meter is a battery.**~~ **FIXED** by Wave 1. Replaced by the 1h vertical vessel.
3. ~~**Buttons are filled.**~~ **FIXED** by Wave 1 (`afa6c5e`). Outlined on transparent everywhere;
   no variant emits a solid `bg-primary`.
4. **Chrome is wrong.** `Dashboard.tsx` still renders a centred title and top tabs. The design has
   no header and puts the three tabs in a 58px bottom bar. **Owned by Wave 2.**
5. **The touch floor is met only by the five drawn primitives.** Inputs, selects, dialogs and the
   rest remain at 40px and below. **Blocked on `03-design-requests.md` §A.**

## Verification baseline

Confirmed on `main` after Wave 1 integration, 2026-08-08:

- `npm run typecheck` (`tsc -b --noEmit`) — **PASS, 0 errors**
- `npm run lint` — **FAIL, 9 errors / 11 warnings** (pre-existing; must not get worse)
- `npm run build` — **PASS** (~16–26s)
- `npm audit` — 18 vulnerabilities, 3 moderate / 15 high (up from a recorded 17 / 3 / 14)

> **Do not use bare `tsc --noEmit`.** The root `tsconfig.json` is `"files": []` plus project
> references, so without `-b` it compiles zero files and passes vacuously. It did exactly that for
> the whole life of the project, concealing four real errors until 2026-08-08. See `CLAUDE.md`.

- **Nothing has been rendered in a browser.** `npm run dev` has still not been run. Wave 1 is
  typechecked and built, not seen. No claim in this file is visually verified.
