# Visual state — as built

**Snapshot taken 2026-08-08.** This file records what the app *currently looks like in code*, not
what it should look like. It is the "before" half of the visual history; see
`02-planned-changes.md` for what is being changed and `03-design-requests.md` for what has been
asked of Claude Design.

Update this file only when a change has actually landed and been verified, never in anticipation.

---

## What has landed

**The token layer, and nothing else.** Redesign step 1 applied the handoff's `tokens/index.css` and
`tokens/tailwind.config.ts` (`b46de81`), then forced dark (`d1d2be8`). Every subsequent step is
unstarted.

Consequence worth stating plainly: the app currently has the redesign's **colours** and none of its
**geometry**. Components pick up new colour automatically because they reference CSS variables
whose values changed underneath them. Nothing that is expressed as a hardcoded Tailwind class —
heights, radii, type sizes, weights — has moved at all.

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

## What has not landed: the primitives

All 51 components in `src/components/ui/` are at stock shadcn geometry.

| Primitive | Current | Design target |
| --- | --- | --- |
| `button` default | `h-10` (40px), solid `bg-primary` fill | 56px floor, **outlined never filled** |
| `button` sm | `h-9` (36px) | — below the floor entirely |
| `button` lg | `h-11` (44px) | 64px primary action |
| `button` icon | `h-10 w-10` (40px) | 56×56, radius 12 |
| `card` | `rounded-lg border shadow-sm` | `#232532`, radius 14, **no shadow** |
| `badge` | `rounded-full`, `text-xs`, `px-2.5 py-0.5` | radius 8, 13px/0.06em upper, `8px 12px` |
| `slider` | track `h-2` (8px), thumb 20px | track 12px, thumb **56px** |
| `tabs` | shadcn top tabs, `h-10` list | not used at all — bottom bar replaces it |
| `input` / `select` | `h-10` (40px) | undrawn; see `03-design-requests.md` §A |

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

1. **Red and green are in the product.** The pure-alcohol meter at
   `src/components/tabs/DrinksTab.tsx:878–966` switches between red and green gradients on a
   `progressPercentage >= 110` threshold, and renders ⚠️/ℹ️ emoji warnings. The locked rule is one
   accent, no palette, no red, no green.
2. **The meter is a battery.** Horizontal, filling by `width:%`, with a battery terminal nub. The
   design is a vertical vessel filling bottom-up.
3. **Buttons are filled.** `variant: default` is `bg-primary text-primary-foreground`. The rule is
   outlined on transparent.
4. **Chrome is wrong.** `Dashboard.tsx` renders a centred title and top tabs. The design has no
   header and puts the three tabs in a 58px bottom bar.
5. **Nothing meets the touch floor.** See the table above.

## Verification baseline at snapshot

Confirmed in a fresh worktree after `npm install`, 2026-08-08:

- `npx tsc --noEmit` — **PASS**
- `npm run lint` — **FAIL, 9 errors / 12 warnings** (pre-existing; must not get worse)
- `npm run build` — **PASS** (~17s)
- `npm audit` — 18 vulnerabilities, 3 moderate / 15 high (up from a recorded 17 / 3 / 14)
- **Nothing has been rendered in a browser.** `npm run dev` has not been run since the token layer
  landed, so no claim here is visually verified.
