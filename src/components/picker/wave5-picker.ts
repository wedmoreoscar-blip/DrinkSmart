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
  categorySub: (n: number, volume: string, ethanol: string) =>
    n === 0
      ? "nothing picked"
      : n + " picked · " + volume + " · " + ethanol,
  // The design always renders money(price); generated entries carry no price,
  // so the price segment is omitted when it is null.
  drinkSub: (portion: string, ethanol: string, price: number | null) =>
    portion + " · " + ethanol +
    (price != null ? " · " + money(price) : ""),
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
 * Tray guidance line (5d): at 15–20% over target, when the current band has a
 * band above it, advise raising the band. Shades below red show nothing.
 *
 * Past +20% the line explains the hard bound instead. That bound disables the
 * Add button, and this used to return null in exactly that range — so the
 * control greyed out with the one sentence that would explain it switched off,
 * which reads as the button being broken. The bound itself is locked and
 * unchanged; only the silence is. Per the same decision the line advises and
 * never scolds.
 */
export function overTargetAdvice(
  totalMl: number,
  targetMl: number | null,
  inebriationLevel: number
): string | null {
  if (!targetMl || targetMl <= 0 || !Number.isFinite(totalMl)) return null;
  const ratio = totalMl / targetMl;
  if (ratio < 1.15) return null;

  const bandIndex = BAND_LEVELS.findIndex(
    (band) => inebriationLevel >= band.minLevel && inebriationLevel <= band.maxLevel
  );
  const higherBand =
    bandIndex >= 0 && bandIndex < BAND_LEVELS.length - 1 ? BAND_LEVELS[bandIndex + 1] : null;

  if (ratio > 1.2) {
    // Heavy has nothing above it, so it is offered the only move it has.
    return higherBand
      ? "That is more than this night allows — use a smaller serving or fewer, or raise the band to " +
          higherBand.name + "."
      : "That is more than this night allows — use a smaller serving or fewer.";
  }

  if (bandIndex < 0 || !higherBand) return null;
  const band = BAND_LEVELS[bandIndex];
  return (
    "Raise the band to " + higherBand.name +
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

export function entryServingCount(entry: AlcoholTimelineEntryInput): number {
  if (entry.portions && Number.isFinite(entry.portions) && entry.portions > 0) {
    return entry.portions;
  }
  if (!entry.quantity) return 0;
  const quantity = parseFloat(entry.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (entry.unit === "ml" || entry.unit === "oz") return 1;
  return Number.isInteger(quantity) ? quantity : 1;
}

export function planGroupVolumeLabel(entries: AlcoholTimelineEntryInput[]): string {
  const portions = entries
    .map((entry) => {
      if (!entry.quantity) return null;
      const quantity = parseFloat(entry.quantity);
      const count = entryServingCount(entry);
      if (!Number.isFinite(quantity) || quantity <= 0 || count <= 0) return null;
      const totalVolumeMl = entryVolumeMl(entry, quantity);
      return { count, totalVolumeMl, perServingMl: totalVolumeMl / count };
    })
    .filter((portion): portion is NonNullable<typeof portion> => portion !== null);

  if (portions.length === 0) return "0 ml";
  const totalCount = portions.reduce((sum, portion) => sum + portion.count, 0);
  const totalVolumeMl = portions.reduce((sum, portion) => sum + portion.totalVolumeMl, 0);
  const firstServingMl = portions[0].perServingMl;
  const uniformServing = portions.every(
    (portion) => Math.abs(portion.perServingMl - firstServingMl) < 0.01,
  );

  if (uniformServing) {
    return totalCount > 1
      ? totalCount + " × " + fmtMl(firstServingMl) + " ml"
      : fmtMl(firstServingMl) + " ml";
  }
  return fmtMl(totalVolumeMl) + " ml total";
}

export function entryEthanolLabel(
  entry: AlcoholTimelineEntryInput,
  abv: number | null,
): string {
  const count = entryServingCount(entry);
  const totalEthanolMl = entryEthanolMl(entry, abv);
  return count > 1
    ? count + " × " + fmtMl(totalEthanolMl / count) + " ml ethanol"
    : fmtMl(totalEthanolMl) + " ml ethanol";
}

export function planGroupEthanolLabel(
  entries: AlcoholTimelineEntryInput[],
  getAbv: (entry: AlcoholTimelineEntryInput) => number | null,
): string {
  const portions = entries
    .map((entry) => {
      const count = entryServingCount(entry);
      if (count <= 0) return null;
      const totalEthanolMl = entryEthanolMl(entry, getAbv(entry));
      return { count, totalEthanolMl, perServingMl: totalEthanolMl / count };
    })
    .filter((portion): portion is NonNullable<typeof portion> => portion !== null);

  if (portions.length === 0) return "0 ml ethanol";
  const totalCount = portions.reduce((sum, portion) => sum + portion.count, 0);
  const totalEthanolMl = portions.reduce((sum, portion) => sum + portion.totalEthanolMl, 0);
  const firstServingMl = portions[0].perServingMl;
  const uniformServing = portions.every(
    (portion) => Math.abs(portion.perServingMl - firstServingMl) < 0.01,
  );

  if (uniformServing) {
    return totalCount > 1
      ? totalCount + " × " + fmtMl(firstServingMl) + " ml ethanol"
      : fmtMl(firstServingMl) + " ml ethanol";
  }
  return fmtMl(totalEthanolMl) + " ml ethanol total";
}

export function entryPortionWord(entry: AlcoholTimelineEntryInput): string {
  if (!entry.quantity) return "";
  const quantity = parseFloat(entry.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return "";
  const count = entryServingCount(entry);
  const totalVolumeMl = entryVolumeMl(entry, quantity);
  return count > 1
    ? count + " × " + fmtMl(totalVolumeMl / count) + " ml"
    : fmtMl(totalVolumeMl) + " ml";
}
