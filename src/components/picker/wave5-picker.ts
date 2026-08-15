import { OZ_ML, PINT_ML, SHOT_ML } from "@/lib/drinkConstants";
import type { AlcoholTimelineEntryInput } from "@/lib/sessionEngine";
import { fmtMl, money } from "./picker-copy";

/**
 * Wave 5 copy — plan-built panels (5a) and the swap picker (5c).
 * Strings are verbatim from the design HTML trailing <script> blocks.
 */
export const PLAN_BUILT_COPY = {
  screenKicker: "Tonight",
  clock: (t: string) => "now " + t,
  title: "Your night",
  summary: (band: string, n: number, ml: number, target: number) =>
    band + " · " + n + (n === 1 ? " drink" : " drinks") + " · " + fmtMl(ml) + " of " + fmtMl(target) + " ml",
  regenerate: "Regenerate",
  regenerateHint: "re-rolls only what is not locked",
  categorySub: (n: number, ml: number) =>
    n === 0 ? "nothing picked" : n + " picked · " + fmtMl(ml) + " ml",
  // The design always renders money(price); generated entries carry no price,
  // so the price segment is omitted when it is null.
  drinkSub: (portion: string, ml: number, price: number | null) =>
    portion + " · " + ml.toFixed(1) + " ml" + (price != null ? " · " + money(price) : ""),
  waterSub: "330 ml · break · free",
  toggle: (open: boolean) => (open ? "hide" : "show"),
  trayReading: (ml: number, target: number) => fmtMl(ml) + " of " + fmtMl(target) + " ml",
  traySub: (n: number) => "pure alcohol · " + n + (n === 1 ? " drink" : " drinks"),
  trayPrimary: "Done",
};

export const SWAP_COPY = {
  title: (name: string) => "Swap " + name,
  count: (n: number) => String(n),
  bound: (capMl: number, fromMl: number) =>
    "Anything up to " + fmtMl(capMl) + " ml of alcohol — " + fromMl.toFixed(1) +
    " plus a fifth. Weaker is always fine.",
  delta: (d: number) => (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1) + " ml",
  hiddenNote: (n: number, capMl: number) =>
    n + " more drinks here are stronger than " + fmtMl(capMl) +
    " ml, so they cannot replace this one.",
  trayReading: (committed: number, pending: number) => fmtMl(committed) + " + " + fmtMl(pending) + " ml",
  traySub: (target: number, removed: string) => "of " + fmtMl(target) + " ml · " + removed + " taken out",
  trayPrimary: "Swap",
};

/**
 * The four buzz bands, in level order. Heavy is last and has no band above it.
 */
const BAND_LEVELS = [
  { name: "Light", minLevel: 1, maxLevel: 2 },
  { name: "Social", minLevel: 3, maxLevel: 4 },
  { name: "Loose", minLevel: 5, maxLevel: 6 },
  { name: "Heavy", minLevel: 7, maxLevel: 7 },
];

/**
 * Tray guidance line (5d, red band only): at 15–20% over target, when the
 * current band has a band above it, advise raising the band. Heavy shows
 * nothing; shades below red show nothing.
 */
export function overTargetAdvice(
  totalMl: number,
  targetMl: number | null,
  inebriationLevel: number
): string | null {
  if (!targetMl || targetMl <= 0 || !Number.isFinite(totalMl)) return null;
  const ratio = totalMl / targetMl;
  if (ratio < 1.15 || ratio > 1.2) return null;
  const bandIndex = BAND_LEVELS.findIndex(
    (band) => inebriationLevel >= band.minLevel && inebriationLevel <= band.maxLevel
  );
  if (bandIndex < 0 || bandIndex === BAND_LEVELS.length - 1) return null;
  const band = BAND_LEVELS[bandIndex];
  return (
    "Raise the band to " + BAND_LEVELS[bandIndex + 1].name +
    " — this is past " + band.name + "'s target."
  );
}

export function entryVolumeMl(entry: AlcoholTimelineEntryInput, quantity: number): number {
  switch (entry.unit) {
    case "pints":
      return quantity * PINT_ML;
    case "oz":
      return quantity * OZ_ML;
    case "shots":
      return quantity * SHOT_ML;
    case "glass":
      return quantity * 175;
    case "ml":
      return quantity;
  }
}

export function entryEthanolMl(entry: AlcoholTimelineEntryInput, abv: number | null): number {
  if (!entry.quantity) return 0;
  const quantity = parseFloat(entry.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return entryVolumeMl(entry, quantity) * ((abv ?? 0) / 100);
}

export function entryPortionWord(entry: AlcoholTimelineEntryInput): string {
  if (!entry.quantity) return "";
  const quantity = parseFloat(entry.quantity);
  if (!Number.isFinite(quantity)) return "";
  switch (entry.unit) {
    case "pints":
      if (quantity === 0.5) return "half";
      if (quantity === 1) return "pint";
      return quantity + " pints";
    case "oz":
      return quantity + " oz";
    case "shots":
      return quantity + (quantity === 1 ? " shot" : " shots");
    case "glass":
      return quantity + (quantity === 1 ? " glass" : " glasses");
    case "ml":
      if (entry.portions && entry.portions > 1 && quantity > 0) {
        return entry.portions + " × " + quantity / entry.portions + " ml";
      }
      return quantity + " ml";
  }
}
