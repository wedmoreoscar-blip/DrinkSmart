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
>
> ---
>
> **Appended after the above was written.** Two further findings from reading the built Timeline.
> Both land on the same row `5b` is about, so they are here rather than in a separate request. The
> authority note above still governs everything below it.
>
> **Amendment to 5b — the row also has to carry reordering.**
>
> Reordering a night is already built: a future, unlocked entry can be dragged into a different
> position. What it has never had is a drawn affordance. The drag listeners sit on the row's own
> text block, so the way to move a drink is to press its name and drag it — with nothing on screen
> saying so, and `1d` drawing only the trailing lock. In practice the capability is undiscoverable,
> and the region that answers the drag is the same region that would otherwise scroll the list.
>
> So `5b` is a **three**-control problem rather than two: **lock, swap, and reorder**, competing for
> the same 362×64 row of `[62px time][34px marker][flex content]`. Please settle all three in that
> one frame — drawn apart they would settle nothing, because the whole question is what fits. Whether
> reorder becomes an explicit grab handle, a long-press on the row, or something else is the decision
> we need. If the honest answer is that three trailing controls do not fit at 64px, we would much
> rather hear that and change the row than have it drawn tight.
>
> Reordering stays limited to entries still in the future and not locked; past drinks and the drink
> currently up do not move. Whatever the affordance is, it should be absent on rows that cannot be
> dragged rather than present and inert.
>
> **5e — the Timeline footer loses `Add a drink`.**
>
> `1d` draws that footer as a pair — `Add a drink` and `Re-plan the rest`, two flex-1 buttons at
> 56px, 1px `#383a46`, radius 14, 19px — and the README states it the same way. **`Add a drink` is
> being removed**, for exactly the reason quick-add is: it appends alcohol to a night with no bound,
> which is the thing the four-band cap and the +20% ceiling exist to prevent. Adding a drink now
> happens on the Plan tab, where the tray meter is watching, and substituting one happens through
> `swap`. Neither can run past the ceiling; that button could.
>
> That leaves `Re-plan the rest` alone in a row composed as a pair. What we need is what the footer
> becomes: one full-width button, a narrower single button, or something else entirely. It is a small
> thing and it may well belong inside `5b`'s frame — draw it wherever it reads best.
>
> The rule underneath both this and the quick-add removal, in case it helps you judge anything else
> in the wave: **no affordance may add unbounded alcohol to a plan.** Anything that can is the same
> defect wearing a different label.
>
> ---
>
> **Appended later still — one more, on onboarding.**
>
> **5f — `4c` gains a Strength rail beneath Sweetness.**
>
> `4c` draws one word-stop rail, Sweetness, `dry → sweet` over five stops. There has always been a
> second preference behind it — **strength** — and it has never been drawn, so the onboarding screen
> has no way to collect it. The Profile taste sheet already carries the rail on the same form, with
> the stops `Light · Mild · Medium · Strong · Very strong`. Onboarding is the gap.
>
> **What strength is, precisely, because the obvious reading is wrong.** It is a *taste* preference,
> exactly like sweetness. It tells the planner the user prefers stronger drinks, so the picker leans
> toward higher-ABV items in the catalogue. It is **not** a quantity control and **not** a second way
> of saying how drunk to get — that is entirely the four-band buzz picker's job (`1n`), and the
> amount of alcohol in the night is fixed by it before this preference is ever read.
>
> What a user notices is a downstream consequence rather than the setting's doing: with the total
> fixed, someone at `Very strong` gets fewer, stronger drinks and someone at `Light` gets more,
> weaker ones, across the same night. The deterministic engine produces that from its budget. The
> preference only says what kind of drink to reach for.
>
> **That distinction is the whole design problem here.** Two rails stacked on one card invite the
> reading that the lower one is a second intensity dial, sitting a few hundred pixels from the actual
> intensity dial. Please make Strength read unmistakably as *what you like*, not *how much* — through
> the stop words, the section label, or a short line if one is genuinely needed. It must not
> contradict or appear to compete with the band chosen on `1n`.
>
> **Two things to settle beyond the wording:**
>
> **Vertical space.** The `4c` card is close to full at 874: step label, 28px title, three lines of
> body, six 56px chips in two columns, the Sweetness rail, a 64px `Start` and a 56px ghost action.
> Our rough addition leaves something like 120px of headroom against a rail that costs roughly 150px
> with its label and end words. Assume something has to give and tell us what — trimming the body
> copy, tightening the chip grid, a more compact rail form for both, or splitting the step. We would
> rather you moved something deliberately than have two rails drawn tight.
>
> **The `Low & no` chip now overlaps the rail.** That chip currently *is* the strength control by
> proxy — selecting it drives strength to its minimum. With an explicit rail on screen, a chip that
> silently moves it is two controls fighting over one value. Options we can see: the chip becomes the
> rail's far-left stop and stops being a chip; it stays and visibly drives the rail; or it keeps a
> separate meaning about category rather than strength. Your call — it is a composition question
> about that card, and we would rather it were drawn than argued.
>
> If the answer changes the Profile taste sheet too, say so and we will follow it there.
