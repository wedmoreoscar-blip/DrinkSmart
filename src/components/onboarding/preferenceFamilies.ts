export type PreferenceFamily = {
  label: string;
  keys: string[];
};

export const PREFERENCE_FAMILIES: PreferenceFamily[] = [
  { label: "Beer", keys: ["beer_pint", "beer_bottle"] },
  {
    label: "Wine",
    keys: ["wine_red", "wine_white", "wine_rose", "wine_sparkling"],
  },
  {
    label: "Spirits",
    keys: ["gin", "vodka", "rum", "whiskey", "tequila", "brandy", "liqueurs", "shots"],
  },
  { label: "Cider", keys: ["cider"] },
  // `alcopops` belongs here by elimination rather than by taste: it is a sweet
  // pre-mixed drink, and Beer/Wine/Cider/Spirits all describe it worse. The
  // amendment's table omitted it -- covering 17 of the 18 keys -- which would have
  // left anyone who likes alcopops with a preference no chip could express and
  // none the planner would ever read. Every key must land in exactly one family.
  { label: "Cocktails", keys: ["cocktails", "spritz", "alcopops"] },
  { label: "Low & no", keys: [] },
];
