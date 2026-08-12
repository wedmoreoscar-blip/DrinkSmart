# W4-7 — Establishment browsing screen (designs `4k` and `4l`, request §F)

You are building a **new screen** for DrinkSmart: a single list of drinking venues the user can
choose between. There is no such screen today — establishments currently appear only as collapsible
groups buried inside a command palette in `DrinksTab.tsx`. Your job is the screen as a
self-contained component.

Your worktree: `/home/oscar/.traycer/worktrees/wedmoreoscar-blip__drinksmart/drinksmart_worktree_4`
Your branch: `deepseek_agent_4`

## Design authority — read before writing any code

The **active** authority, by absolute path:

```
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4k-establishments.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4k-establishments.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4l-establishments-empty.html
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/screens/4l-establishments-empty.png
/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart/README.md   (section "§F — Establishment browsing (4k, 4l)", ~line 403)
```

Also read `screens/1l-form-primitives.html` for the text input and the **empty-state card**.

**Read the trailing `<script>` blocks of `4k` and `4l`.** They carry the literal copy objects
`VENUE_COPY` and `VENUE_EMPTY_COPY`, the `venuePreview` formatter and the sort rules. Those strings
are exact — use them verbatim, do not paraphrase.

**NEVER** read or use `/home/oscar/DrinkSmart/design_handoffs/design_handoff_drinksmart_depreciated/`.
It is history, not current authority.

## Standing design constraints (LOCKED — `docs/decisions.md`)

- Dark only. The light theme is deliberately unreachable; never reference or re-enable it.
- One accent, no palette. **No red, no green anywhere.** Amber `#d29a51` is a remark, not an alarm.
- 19px (`text-body`) is the floor for anything the user reads. 13px (`text-micro`) carries tags,
  counts and footnotes only — never an answer.
- Nothing tappable under 56px. **Exactly one 64px primary action on the screen**, and it is
  `Scan a menu` in both states.
- Reach for the token, not the hex. Confirmed classes: `h-tap` (56px), `h-act` (64px),
  `rounded-ctl` (12px), `rounded-lg` (14px),
  `text-micro`/`text-label`/`text-note`/`text-body`/`text-lead`/`text-title`, `bg-field`,
  `text-muted-foreground`, `text-primary`. `<Button size="act">` is the 64px primary.
- Compose the existing `src/components/ui/*` primitives. Do not fork them, do not add a component
  library, do not add any dependency, do not modify `package.json` or the lockfile.

## Files you may modify

- Any **new** file you create under `src/components/establishments/` (this directory does not yet
  exist; create it).

**No other file may be created or modified.** In particular:

- **Do not modify `src/hooks/useEstablishments.ts`.** Consume it as it is. Its return value is
  `{ establishments, loading, isLoggedIn, getEstablishmentDrinks, getGlobalEstablishments,
  getUserEstablishments, sessionEstablishments, addSessionEstablishment,
  clearSessionEstablishments, getAllSearchableDrinks, refetch }`, and its exported types are
  `Establishment` (`{ id, name, isGlobal, isSessionOnly? }`) and `EstablishmentDrink`
  (`{ id, establishment_id, drink_name, abv, category, category_label, price, volume,
  volume_unit }`).
- **Do not modify `src/components/tabs/PlanTab.tsx`, `DrinksTab.tsx` or `MenuScannerTab.tsx`.**
  Two other agents are working in those files concurrently, and the orchestrator owns the
  navigation wiring. **Do not mount your screen anywhere** — you are delivering the component only.
- Do not modify anything under `src/components/ui/`.

## Clauses

**1. Export one self-contained screen against this exact prop contract.**
Create `src/components/establishments/EstablishmentsScreen.tsx` exporting a named
`EstablishmentsScreen` component with exactly these props, because the orchestrator will wire it in:

```ts
export type EstablishmentsScreenProps = {
  selectedId: string | null;
  onSelect: (establishmentId: string) => void;
  onScanMenu: () => void;
  onBack: () => void;
};
```

Header: a 56px row with a 22px back chevron calling `onBack`, and the title `Where are you`
(`VENUE_COPY.title`) at 28/500. Beneath it the `1l` text input with placeholder
`Search by name` (`VENUE_COPY.search`), which filters the list by name, case-insensitively.

**2. Render one list, with no taxonomy lesson.**
Seeded venues and the user's own sit in **one list**, sorted in exactly this order:

1. here-now first,
2. then the user's own, by last used,
3. then seeded venues alphabetically.

**No section headers. No "Global / My venues" split.** The only visible difference is a `yours` tag
on the user's own venues, and it is **neutral** — 13px `#b2b6ca` on `#292b31`, **not accent** —
because origin is a fact, not a status.

Each card is at least 72px, `#232532`, radius 14. The current venue (`selectedId`) takes
`box-shadow: 0 0 0 2px #9184d9` and shows `HERE NOW` (13px `#b5abfc`) **in place of** its drink
count. Every other card shows its count via `VENUE_COPY.countSub(n)` → `"<n> drinks"`.

**There is no GPS anywhere in this screen.** *Here now* means *last chosen*. Do not call
`navigator.geolocation`, do not request a location permission, and do not add a distance.

**3. Preview each venue without a tap, and design price in ahead of the column.**
Every card carries a second line at 15px `#b2b6ca`: **up to three** of that venue's drinks,
one line, ellipsis-truncated, joined by ` · `. Get the drinks from
`getEstablishmentDrinks(establishment.id)`.

Follow `4k`'s `venuePreview` exactly: a drink with a price renders as `Name £4.55`; **a drink whose
`price` is `null` renders as its name alone.** The preview must never print `£—`, and a venue with
no priced drinks drops to names only — `Carling · Guinness · House red`.

`EstablishmentDrink.price` is `number | null` in this repo, so the null case is real and must be
handled, not assumed away.

**4. Make the empty state partial, and put it under the list.**
Seeded venues always exist, so the screen is never truly empty. When the user has **no venues of
their own**, render the `1l` empty-state card **below the list, never over it**: `#1c1e2c`,
radius 14, padding `32px 18px`, centred, with a 44px `#3f424d` glyph, a 22px line
`VENUE_EMPTY_COPY.title`, and a 17px `#b2b6ca` body `VENUE_EMPTY_COPY.body`.

**That card gets no action of its own.** The screen's 64px `Scan a menu` is already that offer, and
two of them is the same offer twice. The reassurance is the 13px footnote
`VENUE_EMPTY_COPY.footnote` beneath the primary.

**5. Keep the footer, and keep the component presentational beyond its one hook.**
Fixed at the bottom: the 64px primary `Scan a menu` (`VENUE_COPY.cta`) calling `onScanMenu`, then a
13px centred footnote — `VENUE_COPY.footnote` in the populated state, `VENUE_EMPTY_COPY.footnote`
in the empty one.

Selecting a card calls `onSelect(id)` and nothing else. Do **not** write to Supabase, do not add a
mutation, do not add React Query usage of your own, and do not add a router or a toast. The only
data source is `useEstablishments()`. Render a plain loading state while its `loading` is true.

## Verification baseline — derived live on `main` at `1f25436`, 2026-08-12

Run these from the root of **your** worktree.

- `npm test` — **PASS, 102 tests across 9 files.** It must still report exactly 102 passing.
- `npm run typecheck` — **PASS, 0 errors.** It must stay 0.
  **Never run bare `tsc --noEmit` in this repository.** The root `tsconfig.json` is `"files": []`
  plus project references, so bare `tsc --noEmit` compiles **zero files** and always appears to
  pass. Use `npm run typecheck`, which is `tsc -b --noEmit`.
- `npm run lint` — **KNOWN FAILING, and that is expected.** It reports exactly
  `✖ 21 problems (10 errors, 11 warnings)` in pre-existing application files. That is the accepted
  baseline; it must not get worse. **Do not fix pre-existing lint problems** — out of scope, and it
  enlarges the diff.
- `npm run build` — **PASS, about 29s.** The `chunks are larger than 500 kB` notice is expected and
  is not a failure.
- Browser, Supabase, edge-function, notification and native/Capacitor checks are **BLOCKED**: that
  infrastructure is not available to you. You cannot reach a real database, so you cannot see real
  venues or drinks. Do not attempt these and do not claim them.

Note that because nothing mounts your component yet, `npm run build` will tree-shake it; a clean
typecheck plus a clean build is the evidence available to you, and that is expected for this ticket.

Do not run `npm install` or `npm ci`. Your worktree is already provisioned with 430 packages.
Do not run `git commit`, `git push`, or any `supabase` command. Leave your work **uncommitted** in
the worktree — the orchestrator commits the handback.

Change only what is required. Do not refactor, rename, reformat, add error
handling, or improve anything you were not asked to change, even if it
looks wrong. Modify only the files named above. If you believe another
file must change, stop and report it instead.

Before reporting back:
- Re-read the spec clause by clause. For each clause, point at the specific
  change that satisfies it. If any clause has no corresponding change,
  you are not finished.
- Run the code. It must execute without syntax or import errors.
- Run the existing test suite. It must pass exactly as it did before.
- Do NOT write new tests. Do NOT modify existing tests. Verification of
  new behaviour is not your job.
- Report what you changed, which clause each change maps to, and anything
  you were unsure about.
