# Wave 5 design request — prompt for Claude Design

Written 2026-08-13. The fourth file of the visual history. `01-current-state.md` records what is
built, `02-planned-changes.md` what is changing, `03-design-requests.md` which drawings are
available or outstanding, and this one holds the **literal prompt** handed to Claude Design for
Wave 5, so the request and the frames that come back can be read against each other later.

Mirrored as a Traycer `spec` artifact under this epic. If one copy is edited, edit both.

---

## The prompt

> **DrinkSmart — Wave 5: making a generated plan editable**
>
> This continues the DrinkSmart redesign. Waves 1–4 are built and visually verified against your
> existing frames; Wave 5 adds one capability and needs four new drawings for it.
>
> **The capability.** Today the app generates a night and the user accepts it. Wave 5 lets them
> curate it: keep some AI picks, delete others, add their own, swap an individual drink for a
> comparable one, and re-roll only the parts they have not locked. The behaviour is fully settled —
> what is missing is how it looks.
>
> **What has changed in the flow, for context:**
>
> - `Build the night` no longer jumps to the Timeline. It generates, scrolls the Plan tab to its
>   tray, and reveals the selected drinks in place, so the user stays where their plan is.
> - Locking is now a property of a drink and works on both tabs. `Regenerate`, a repeated
>   `Build the night`, and `Re-plan the rest` all re-roll only the **unlocked** drinks.
> - `Re-plan the rest` no longer leaves the Timeline.
> - Quick-add is removed. Nothing may add unbounded alcohol — that was the point of capping the
>   scale at four bands.
>
> **Please draw four things, at 402×874, in the established export format** (PNG plus literal HTML,
> with the trailing `<script>` block carrying copy and formatting rules):
>
> **5a — Plan tab after `Build the night`.** Each category row (`4d`) now shows the drinks selected
> inside it as a drop-down beneath the row. It appears automatically with no tap, and can be
> collapsed by a small **unoutlined** `hide` / `show` control. Note that an unoutlined text control
> has no precedent in the current token set — every control drawn so far is a 56px or 64px target
> with an outline or a fill — so this needs establishing rather than inferring. The row's existing
> chevron keeps its current job of opening that category's screen; it must not read as the
> drop-down's toggle.
>
> Each drink inside that drop-down carries **two controls of its own**: a **lock**, and a **delete**.
> Locking is new to this tab and is the same state the Timeline already shows — a locked drink
> survives `Regenerate`, and a drink locked on the Timeline arrives here **already showing its lock**.
> Delete removes an AI pick the user does not want, so they can replace it themselves. Both must sit
> on a drink row without turning it into a toolbar, and this is where most of 5a's difficulty lies:
> the row is small, it repeats, and it already carries a name, a strength and a price.
>
> **5b — a Timeline row carrying both `lock` and `swap`.** `1d` draws a single trailing lock on a
> 362×64 row laid out `[62px time][34px marker][flex content]`. A second control now has to live
> there. Where it goes, and what yields to make room at 64px, is the decision we need — this is the
> screen the user looks at most.
>
> **5c — the picker entered by pressing `swap`.** It is `4d`/`4e` constrained: only drinks within
> **+20% of the swapped drink's pure alcohol** may be chosen. There is no lower bound — swapping a
> drink for water is allowed and normal. What we need is how a constrained catalogue reads: whether
> ineligible drinks are greyed, absent, or labelled, and how the user understands why. **No warning,
> dialogue or confirmation appears anywhere in this flow** — an eligible swap is simply taken.
>
> The tray is visible on this screen and reads differently here: it shows the night **with the
> swapped drink already removed** — committed fill equals the plan's total alcohol minus that one
> drink — so the user sees the gap they are filling. The candidate under consideration then paints on
> top as pending, in the existing hollow treatment, never solid. Please draw that state; it is the
> only place the tray shows a subtraction.
>
> **5d — the tray meter's over-target states.** The tray meter fills toward the target and reads
> full when it reaches it. Past that, **only the shade changes** — the meter never grows and the
> fill never rises above full:
>
> | Over target | Shade |
> | --- | --- |
> | 0 – 5% | unchanged accent |
> | 5 – 10% | yellow |
> | 10 – 15% | orange |
> | 15 – 20% | red |
> | above 20% | not reachable; selection is bounded there |
>
> In the red band, when a higher buzz band exists (any selection except Heavy), a short line beneath
> advises raising the band. Heavy has nothing above it and shows nothing. It is guidance, never a
> block, and it must not scold the user or congratulate them for stopping.
>
> **Constraints that still hold, and one that has changed:**
>
> - Dark only. The light theme is deliberately unreachable.
> - One accent, no palette. `--fs-body` 19px is the floor for anything readable. Nothing tappable
>   under 56px; exactly one 64px primary action per screen. Completion desaturates; nothing
>   congratulates the user.
> - **`no green` is absolute and unchanged.**
> - **`no red` has been deliberately overridden, in exactly one place: the tray meter's 15–20%
>   shade in 5d.** Please do not take it as licence for a palette anywhere else.
>
> **One request about authority.** The behaviour above is locked on our side and the code follows
> it. If a drawing contradicts it, we will treat that as a regression to raise with you rather than
> a specification to implement — so if any of it looks wrong to you as a designer, please say so in
> the response rather than encoding the disagreement in a frame.
