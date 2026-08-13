export const money = (p: number): string => (p === 0 ? "£0" : "£" + p.toFixed(2).replace(/\.00$/, ""));

export const fmtMl = (ml: number): string => (ml < 10 ? ml.toFixed(1) : String(Math.round(ml)));

export const PICKER_COPY = {
  screenLabel: "Add a drink",
  venueSub: (n: number) => n + " drinks",
  categorySub: (n: number, minPrice: number) => n + " · from " + money(minPrice),
  customCategory: { name: "Something not listed", sub: "added to this venue" },
  trayReading: (ml: number, target: number) => fmtMl(ml) + " of " + fmtMl(target) + " ml",
  traySub: (n: number) => "pure alcohol · " + n + (n === 1 ? " drink" : " drinks") + " so far",
  trayIdle: "Done",
  trayPending: (n: number) => "Add " + n,
};

export const CATEGORY_COPY = {
  rowSub: (abv: number | null, portion: string, ml: number) =>
    (abv == null ? "—" : abv.toFixed(1)) + "% · " + portion + " · " + ml.toFixed(1) + " ml each",
  rowSubSingle: (abv: number | null, portion: string, ml: number) =>
    (abv == null ? "—" : abv.toFixed(1)) + "% · " + portion + " · " + ml.toFixed(1) + " ml",
  priceTotal: (p: number, n: number) => money(p * n),
  priceUnit: (p: number, n: number) => n + " × " + money(p),
  selectedSummary: (n: number, portion: string, ml: number) =>
    n + " " + (n === 1 ? portion : portion + "s") + " · " + fmtMl(ml) + " ml pure alcohol",
  abvChip: (lo: number, hi: number) => "ABV " + lo + "–" + hi + "%",
  sort: ["Cheapest first", "Strongest first", "Least alcohol first"],
  trayPendingSub: (ml: number) => "of " + fmtMl(ml) + " ml — the pending amount reads hollow",
};

export const CUSTOM_COPY = {
  title: "Something not listed",
  fields: { name: "Name", abv: "Strength", serve: "Serve", price: "Price" },
  keepIt: (venue: string) => "Keep it on " + venue,
  computed: (ml: number, pct: number) =>
    fmtMl(ml) + " ml pure alcohol — " + Math.round(pct) + "% of tonight",
  cta: "Add to plan",
};

export const CUSTOM_ERRORS = {
  name: "Give it a name — anything you'll recognise",
  abv: "Between 0 and 60%",
  serve: "Between 25 and 1000 ml",
  price: "Leave it blank if you didn't pay",
};
