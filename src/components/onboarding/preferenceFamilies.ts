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
  { label: "Cocktails", keys: ["cocktails", "spritz"] },
  { label: "Low & no", keys: [] },
];
