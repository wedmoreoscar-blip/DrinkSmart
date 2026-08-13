export type ParsedDrink = {
  name: string;
  abv: number | null;
  category: string;
  categoryLabel: string;
  price: number | null;
  volume: number | null;
  volumeUnit: string | null;
};

export type PhotoItem = {
  id: string;
  base64: string;
  thumbnail: string;
  mimeType: string;
};

export type ScanFailure = "timeout" | "offline" | "nothing" | "refused";
