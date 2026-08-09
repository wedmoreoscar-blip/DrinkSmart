export type BuzzLevel = {
  level: number;
  label: string;
  desc: string;
  bac_range: string;
  min_bac: number;
  max_bac: number;
};

export const buzzLevels: BuzzLevel[] = [
  {
    level: 1,
    label: "Slightly Buzzed",
    desc: "Feeling warm and relaxed",
    bac_range: "0.01% - 0.03%",
    min_bac: 0.01,
    max_bac: 0.03,
  },
  {
    level: 2,
    label: "Light Buzz",
    desc: "A bit more talkative and comfortable",
    bac_range: "0.03% - 0.06%",
    min_bac: 0.03,
    max_bac: 0.06,
  },
  {
    level: 3,
    label: "Tipsy",
    desc: "Giggly and carefree, inhibitions lowering",
    bac_range: "0.06% - 0.09%",
    min_bac: 0.06,
    max_bac: 0.09,
  },
  {
    level: 4,
    label: "Moderately Drunk",
    desc: "Feeling confident and social",
    bac_range: "0.09% - 0.12%",
    min_bac: 0.09,
    max_bac: 0.12,
  },
  {
    level: 5,
    label: "Properly Drunk",
    desc: "Everything's funny, balance getting wobbly",
    bac_range: "0.12% - 0.15%",
    min_bac: 0.12,
    max_bac: 0.15,
  },
  {
    level: 6,
    label: "Very Drunk",
    desc: "Dancing feels amazing, judgment's out the window",
    bac_range: "0.15% - 0.20%",
    min_bac: 0.15,
    max_bac: 0.20,
  },
  {
    level: 7,
    label: "Heavily Drunk",
    desc: "Slurring words, coordination struggling",
    bac_range: "0.20% - 0.25%",
    min_bac: 0.20,
    max_bac: 0.25,
  },
];

// Helper function to get BAC range for a specific level
export const getBACForLevel = (level: number): { min_bac: number; max_bac: number } => {
  if (!Number.isInteger(level)) {
    throw new Error(`Invalid buzz level: ${level}`);
  }
  const normalizedLevel = level >= 8 && level <= 10 ? 7 : level;
  const buzzLevel = buzzLevels.find((b) => b.level === normalizedLevel);
  if (!buzzLevel) {
    throw new Error(`Invalid buzz level: ${level}`);
  }
  return { min_bac: buzzLevel.min_bac, max_bac: buzzLevel.max_bac };
};
