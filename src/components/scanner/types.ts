export type ParsedDrink = {
  name: string;
  abv: number | null;
  category: string;
  categoryLabel: string;
  price: number | null;
  volume: number | null;
  volumeUnit: string | null;
  /** True when the shown ABV is a deterministic fallback, not a printed fact. */
  abvEstimated?: boolean;
  /** True when the shown serving ml is a deterministic fallback, not a printed fact. */
  volumeEstimated?: boolean;
};

/** The Edge Function's raw model output, before client-side normalization. */
export type RawParsedDrink = Omit<ParsedDrink, "abvEstimated" | "volumeEstimated">;

export type PhotoItem = {
  id: string;
  base64: string;
  thumbnail: string;
  mimeType: string;
};

export type ScanFailure = "timeout" | "offline" | "nothing" | "refused";
