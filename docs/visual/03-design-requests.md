# Design requests to Claude Design, and what came back

**Living document.** The "after" half of the visual history. Each request is recorded here in full
when sent, and its section filled in when the drawings arrive and again when they are implemented.

The prompt below is reproduced in full deliberately. It was drafted as a Traycer artifact, and
artifacts are epic-scoped and deleted after use — the repo is the permanent record, so durable
content is promoted here before the artifact goes.

---

## Request 1 — the "Not designed yet" screens

- **Sent:** 2026-08-08
- **Status:** sent; awaiting output
- **Blocks:** W1-C (form controls) and all of Wave 4
- **Why:** the handoff bundle's own README ends with a "Not designed yet" list covering roughly half
  the app, and offers *"ask and they'll be drawn"*. Under the locked precedence ladder anything not
  drawn falls to rank 6 — implementer judgement — which is what the ladder exists to prevent. The
  whole-app redesign will visibly break these screens the moment Wave 1 lands.

### Prompt as sent

```text
Continue the DrinkSmart project. Designs 1a–1k are done and the token layer has already shipped to
the codebase. I need the screens your handoff README listed under "Not designed yet", drawn to the
same standard and in the same output format.

Everything below must sit inside the existing visual language. Do not introduce a new one.

## Non-negotiable constraints (these are locked in the codebase)

- Dark only. There is no light theme and none should be drawn.
- One accent, no palette. No red, no green — anywhere, for any state. Errors and over-target both
  use the amber #d29a51. Completion desaturates rather than celebrates. Nothing congratulates the
  user for drinking.
- Buttons are outlined, never filled. Primary action is a 1px #9184d9 outline on transparent,
  radius 14, 500/22 in #b5abfc. One primary action per screen at 64px; everything else tappable is
  56px minimum.
- 19px (--fs-body) is the floor for anything the user must read. 13px (--fs-micro) is optional
  detail only and never carries the answer.
- Every value must exist as a token in the shipped tokens/index.css. Reach for the token, not the
  hex. If a screen genuinely needs a value the scale doesn't have, call it out explicitly as a new
  token rather than using a one-off.
- Cards are #232532, or #1c1e2c when raised, radius 14, no drop shadow — elevation is an edge plus
  ambient darkness. Selection is a ring, not a fill.
- Chrome: there is no page header and no centred title or tagline; the screen is the product name.
  The three tabs (Profile · Plan · Timeline) live in the bottom bar at 58px, as drawn in 1k.
- Drawn at 402 x 874 (iPhone 16 Pro logical size). Layout fluid; only fixed heights are literal.

## What I need drawn

### A. Form-control primitives (extend 1k)
The single most useful thing, because everything else depends on it. 1k drew buttons, cards,
badges, slider and tabs. Draw the rest of the form vocabulary at the 56px touch scale, in the same
sheet style as 1k:

- Text input — resting, focused, filled, error. Include the label treatment above it.
- Numeric / unit input — the onboarding stats use these, with a unit toggle beside them
  (kg/lb, cm/ft). Show the toggle as a segmented pair.
- Select / dropdown — closed and open, with the open list styled.
- Textarea — used once, for feedback.
- Checkbox and switch.
- Dialog / modal shell — the onboarding modal is non-dismissable, so draw it with no close X.
- Popover — the drink filter uses one; show it anchored with its content at the touch scale.
- Empty state and inline error/hint text treatments.

State clearly which of these are new tokens versus existing.

### B. Onboarding (two steps, in a non-dismissable modal)
Step 1 — stats. Fields: Height, Weight, Body Fat (optional), Age, Sex. These feed a Watson total
body water calculation, so the form is doing real work and should feel considered rather than
bureaucratic. Metric/imperial toggles on height and weight.

Step 2 — preferences. Two sliders, Sweet and Strong, each 1–5 with a word label per stop rather
than a number. Then two chip groups: "I like" and "I avoid", over drink categories (beer, wine,
spirits, cocktails, cider, shots and so on). A chip can be in neither group; the same category must
never be in both.

This is the user's first contact with the app. It gates everything and cannot be dismissed.

### C. Profile
Seven sections currently exist as cards, in this order: Account, Appearance, Stats, Preferences,
Feedback, Saved drinks / establishments, Admin. Notes:

- Appearance is currently hidden because there is no light theme. Draw the card, but tell me
  whether it should be shown at all in a dark-only app.
- Admin only renders for users with the admin role — draw it, and its absence.
- Account carries the anonymous-to-permanent upgrade entry point (see E).
- Stats and Preferences re-use the onboarding forms from B. Show how an edit-in-place version
  differs from the first-run version, if it should.

Seven stacked cards is a lot of scrolling. If a better organisation exists, propose it.

### D. Drink picker
The densest screen in the app and currently the ugliest. It does: browsing a catalog, ABV range
filtering, a search, adding a custom drink (name, ABV, volume, quantity, optional mixer/dilution,
optional split-into-portions), an estimated cost readout, and the pure-alcohol meter. Quantity
steppers throughout.

The meter is form 1h, already drawn — place it, don't redraw it.

Key tension to solve: the catalog wants density, the 56px floor and 19px type want space. That
conflict is the actual design problem here, and it is why this screen needs you rather than a
developer. Water and other 0% entries are deliberately absent — the engine cannot represent them
yet, so do not draw them.

### E. Auth / account upgrade
Every user starts as an anonymous Supabase session, so this is never a gate — it is an optional
upgrade, and the screen must not imply the user is locked out or behind.

The flow is two-step by necessity: the user submits an email and username, receives a verification
email, and separately receives a password-set link they use only after verifying. A password cannot
be set in the same step. That awkwardness needs designing around — the user must understand that
two emails are coming and what each is for. There is also an optional profile picture.

Also draw: the returning-user sign-in state, and the "check your email" interstitial.

### F. Menu scanner
The user photographs a pub menu; it is parsed into drinks. Sections: Menu Photos (capture and
thumbnails), Extracted Drinks (a reviewable, editable list), Category assignment, and Establishment
Name. Needs a scanning/pending state and a partial-failure state — OCR on a dark pub menu will
often be imperfect, and the design should make correcting a row feel routine rather than like error
recovery.

### G. Establishment browsing
Not yet built in the app, so you have a free hand: choosing a venue, and what a venue's drink list
looks like once chosen. Keep it small.

## Output

Same format as the existing bundle, so it drops in the same way:

- A visible id badge per design, continuing the 1a–1k sequence.
- screens/<id>.png — the render.
- screens/<id>.html — exact inline-styled markup. This is what the implementers actually build
  from, so literal values matter more than tidy markup.
- Any new or changed tokens called out explicitly, as a diff against the shipped tokens/index.css
  rather than a replacement file.

Two requests on the prose: keep the per-design notes short and put every number in the markup
rather than only in the description. The last bundle's prose disagreed with its own markup in
several places — meter radius, fill opacity, and badge size, radius and padding — and the markup was
right every time.
```

### What came back

*Not yet received. Fill in on arrival: new design ids, which sections A–G were covered, any token
diff, and anything the designer pushed back on or reorganised.*

### What was implemented

*Fill in as each drawing lands in code: design id → spec → commit. Note any place the
implementation deviated from the drawing and why, since under the precedence ladder a deviation is
a debt against the design, not a decision.*
