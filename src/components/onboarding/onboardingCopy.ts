export const ONBOARD1_COPY = {
  step: "1 of 2",
  title: "Your stats",
  body: "Pacing is arithmetic on body water. These details make a timeline instead of a guess.",
  cta: "Continue",
  footnote: "Stays on your phone. Nothing is sent anywhere.",
};

export const ONBOARD1_ERRORS = {
  weight: "Between 40 and 250 kg",
  height: "Between 120 and 220 cm",
  age: "18 or over",
  bodyFat: "Greater than 0 and less than 100%",
};

export const ONBOARD2_COPY = {
  step: "2 of 2",
  title: "What you drink",
  body: "Only so the picker opens somewhere sensible. Nothing in the timeline depends on it.",
  categoriesLabel: "Usually",
  // One heading over BOTH rails — they are one kind of thing; Sweetness and
  // Strength are 15px row labels, not sections of their own.
  tasteLabel: "Taste",
  sweetnessLabel: "Sweetness",
  strengthLabel: "Strength",
  // Exactly one line. It never describes the deterministic fewer/stronger
  // outcome and never says how drunk the user gets — that is the band's job.
  strengthNote: "Which drinks get picked, not how many.",
  cta: "Start",
  skip: "I have no preferences",
};

export const ONBOARD2_STOPS = ["dry", "dry-ish", "middling", "sweet-ish", "sweet"];
