repo: wedmoreoscar-blip/DrinkSmart
branch: main
path: src

## Last sync
date: 2026-08-05T18:15:39Z

### Updated in this project
- New token layer replacing the stock shadcn/Lovable set: dark-only, one blurple accent, amber warning, no red or green (`tokens/index.css`, `tokens/tailwind.config.ts`).
- Buzz picker redesigned as three named bands (Light / Social / Loose) with a softer/stronger nudge; levels 7–10 are unreachable in the UI.
- Timeline redesigned in two layouts (even list with pinned hero; proportional time axis) with water/break rows and a now-marker.
- Battery meter from `DrinksTab.tsx` replaced by a vertical vessel in three forms; plus new wind-down and notification surfaces.

## Screen map
| Project screen | Repo files it was built from |
| --- | --- |
| 1a reasoning / 1b tokens | src/index.css, tailwind.config.ts, src/pages/Dashboard.tsx |
| 1c Buzz picker | src/components/tabs/PlanTab.tsx, src/data/buzzLevels.ts, src/components/ui/slider.tsx, src/components/ui/button.tsx, src/components/ui/card.tsx |
| 1d / 1e Timeline | src/components/tabs/TimelineTab.tsx, src/components/tabs/SortableTimelineItem.tsx, src/lib/timelineHelpers.ts |
| 1f Wind-down | src/components/tabs/TimelineTab.tsx (maintenance + target blocks), src/lib/unitConversions.ts |
| 1g Notification | src/hooks/useNotifications.ts, src/hooks/useWebDrinkReminders.ts |
| 1h / 1i / 1j Meter | src/components/tabs/DrinksTab.tsx (lines 878–990), src/lib/drinkConstants.ts |
| 1k Primitives | src/components/ui/{button,card,slider,tabs,badge,progress}.tsx |
