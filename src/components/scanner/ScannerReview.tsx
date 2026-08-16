import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NO_NUMBER_SPINNER,
  NUMERIC_FIELD_INPUT_MODE,
  numericFieldText,
  parseNumericField,
} from "@/lib/numericField";
import { cn } from "@/lib/utils";

import { SCAN_REVIEW_COPY } from "./copy";
import {
  countDrinkGaps,
  nextGapTarget,
  orderDrinkIndices,
  reviewFieldValue,
  type ReviewField,
} from "./scanner-model";
import { ScannerHeader } from "./ScannerHeader";
import type { ParsedDrink } from "./types";

export type { ReviewField } from "./scanner-model";

export type ScannerReviewProps = {
  drinks: ParsedDrink[];
  venueName: string;
  onCommit: (index: number, key: ReviewField, value: number | null) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving?: boolean;
};

const money = (p: number) => (p === 0 ? "£0" : "£" + p.toFixed(2).replace(/\.00$/, ""));

const gapReason = (d: ParsedDrink) => {
  if (d.abv == null) return SCAN_REVIEW_COPY.reasons.abv;
  if (d.volume == null) return SCAN_REVIEW_COPY.reasons.serve;
  return SCAN_REVIEW_COPY.reasons.price;
};

// An estimated value is usable and therefore not a gap, but it is still honest
// provenance: the card note calls out each fallback before the gap reason.
const cardNote = (d: ParsedDrink) => {
  const parts: string[] = [];
  if (d.abvEstimated) parts.push(SCAN_REVIEW_COPY.estimated.abv);
  if (d.volumeEstimated) parts.push(SCAN_REVIEW_COPY.estimated.serve);
  parts.push(gapReason(d));
  return parts.join(" · ");
};

const REVIEW_FIELDS: ReviewField[] = ["abv", "serve", "price"];
const FIELD_UNIT: Record<ReviewField, string> = { abv: "%", serve: "ml", price: "£" };

type ReviewDrinkCardProps = {
  drink: ParsedDrink;
  onCommit: (field: ReviewField, value: number | null) => void;
  onAdvance: () => void;
  focusField: ReviewField | null;
  focusRequest: number;
};

/**
 * One gapped drink: title, provenance note, and three native numeric fields the
 * user types into with their own keyboard. This replaced the `4o` keypad — the
 * app renders no number pad of its own — but keeps that card's geometry, its
 * amber gap ring, the em-dash gap glyph and its next-gap traversal, now on Enter.
 */
const ReviewDrinkCard = ({
  drink,
  onCommit,
  onAdvance,
  focusField,
  focusRequest,
}: ReviewDrinkCardProps) => {
  // Only fields the user has actually typed into are held as text; the rest read
  // straight off the drink, so a value changed elsewhere still shows through.
  const [texts, setTexts] = useState<Partial<Record<ReviewField, string>>>({});
  const refs = useRef<Partial<Record<ReviewField, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (!focusField) return;
    refs.current[focusField]?.focus();
    // focusRequest is unused in the body on purpose: bumping it is how the review
    // re-focuses a field that is already the target.
  }, [focusField, focusRequest]);

  const textFor = (field: ReviewField) =>
    texts[field] ?? numericFieldText(reviewFieldValue(drink, field));

  const handleChange = (field: ReviewField, text: string) => {
    setTexts((current) => ({ ...current, [field]: text }));
    onCommit(field, parseNumericField(field, text));
  };

  // Show the number that was actually committed once the field is left. Fields
  // the user never touched are skipped, so a scanned 29.5735 ml is not rewritten.
  const normalize = (field: ReviewField) => {
    setTexts((current) => {
      const text = current[field];
      if (text === undefined) return current;
      return { ...current, [field]: numericFieldText(parseNumericField(field, text)) };
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, field: ReviewField) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    // Land on this card's next remaining gap; only once it has none does the
    // review move on to a later drink.
    const start = REVIEW_FIELDS.indexOf(field);
    for (let offset = 1; offset <= REVIEW_FIELDS.length; offset += 1) {
      const candidate = REVIEW_FIELDS[(start + offset) % REVIEW_FIELDS.length];
      if (reviewFieldValue(drink, candidate) === null) {
        refs.current[candidate]?.focus();
        return;
      }
    }
    onAdvance();
  };

  return (
    <div className="rounded-lg bg-card px-4 pb-4 pt-3.5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="text-lead text-foreground">{drink.name}</div>
        <div className="text-micro text-[#75798c]">{cardNote(drink)}</div>
      </div>
      <div className="mt-3 flex gap-2">
        {REVIEW_FIELDS.map((field) => (
          <Input
            key={field}
            ref={(element) => {
              refs.current[field] = element;
            }}
            type="number"
            inputMode={NUMERIC_FIELD_INPUT_MODE[field]}
            aria-label={`${field} ${FIELD_UNIT[field]}`}
            // Never an empty box, never a zero: an untouched gap still reads as one.
            placeholder="—"
            value={textFor(field)}
            onChange={(event) => handleChange(field, event.target.value)}
            onBlur={() => normalize(field)}
            onWheel={(event) => event.currentTarget.blur()}
            onKeyDown={(event) => handleKeyDown(event, field)}
            className={cn(
              "min-w-0 flex-1 px-2 text-center tabular-nums",
              NO_NUMBER_SPINNER,
              reviewFieldValue(drink, field) === null && "border-warning",
            )}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {REVIEW_FIELDS.map((field) => (
          <div key={field} className="flex-1 text-center text-micro text-[#75798c]">
            {FIELD_UNIT[field]}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ScannerReview = ({
  drinks,
  venueName,
  onCommit,
  onSave,
  onClose,
  isSaving = false,
}: ScannerReviewProps) => {
  const [editingTarget, setEditingTarget] = useState<{ index: number; field: ReviewField } | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const gapCount = countDrinkGaps(drinks);
  const ordered = orderDrinkIndices(drinks);
  const editingIndex = editingTarget?.index ?? null;
  const gapped = ordered.gapped.includes(editingIndex ?? -1)
    ? ordered.gapped
    : editingIndex == null
      ? ordered.gapped
      : [...ordered.gapped, editingIndex];
  const clean = ordered.clean.filter((index) => index !== editingIndex);

  useEffect(() => {
    if (editingIndex !== null) {
      cardRefs.current[editingIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [editingIndex]);

  const commit = (index: number, key: ReviewField, value: number | null) => {
    setEditingTarget({ index, field: key });
    onCommit(index, key, value);
  };

  const advanceFrom = (index: number) => {
    // onAdvance only fires once this drink's own group has no gap left, so scanning
    // from its last field lands on the first remaining gap in a later drink.
    const next = nextGapTarget(drinks, { drinkIndex: index, field: "price" });
    setEditingTarget(next === null ? null : { index: next.drinkIndex, field: next.field });
    if (next !== null) setFocusRequest((request) => request + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background px-5 pt-[22px] text-foreground">
      <ScannerHeader title={SCAN_REVIEW_COPY.title} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto pt-1.5">
        <div className="flex flex-none items-baseline justify-between gap-2.5">
          <h1 className="text-title font-medium">{SCAN_REVIEW_COPY.count(drinks.length)}</h1>
          {gapCount > 0 && (
            <span className="flex-none rounded-md bg-[rgba(210,154,81,.14)] px-[9px] py-[5px] text-micro font-medium tracking-[0.04em] text-warning">
              {SCAN_REVIEW_COPY.gaps(gapCount)}
            </span>
          )}
        </div>
        <p className="mb-3 mt-1.5 whitespace-nowrap text-note text-muted-foreground">{SCAN_REVIEW_COPY.lead(gapCount)}</p>

        {gapped.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {gapped.map((index) => (
              <div key={index} ref={(el) => (cardRefs.current[index] = el)}>
                <ReviewDrinkCard
                  drink={drinks[index]}
                  onCommit={(key, value) => commit(index, key, value)}
                  onAdvance={() => advanceFrom(index)}
                  focusField={editingTarget?.index === index ? editingTarget.field : null}
                  focusRequest={focusRequest}
                />
              </div>
            ))}
          </div>
        )}

        {clean.length > 0 && (
          <>
            <div className="mt-3.5 mb-1.5 h-px bg-[linear-gradient(to_right,transparent,rgba(233,233,237,.16)_48px,rgba(233,233,237,.16)_calc(100%-48px),transparent)]" />
            <div className="pt-0.5 pb-1 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
              {SCAN_REVIEW_COPY.cleanHeader(clean.length)}
            </div>
            {clean.map((index) => {
              const drink = drinks[index];
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setEditingTarget({ index, field: "abv" });
                    setFocusRequest((request) => request + 1);
                  }}
                  className="flex min-h-tap w-full items-center justify-between gap-3 text-left"
                >
                  <span className="flex-1 truncate text-body text-foreground">{drink.name}</span>
                  <span className="flex-none text-[15px] leading-[1.2] tabular-nums text-[#75798c]">
                    {drink.abv != null && drink.volume != null
                      ? `${drink.abv.toFixed(1)}%${drink.abvEstimated ? " est." : ""} · ${drink.volume}${drink.volumeEstimated ? " est." : ""}`
                      : ""}
                  </span>
                  <span className="min-w-14 flex-none text-right text-body tabular-nums text-muted-foreground">
                    {drink.price != null ? money(drink.price) : ""}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>
      <div className="flex-none pt-3">
        <Button size="act" className="w-full" onClick={onSave} disabled={isSaving}>
          {SCAN_REVIEW_COPY.cta(drinks.length, venueName)}
        </Button>
        <p className="mt-2.5 text-center text-micro text-[#75798c]">{SCAN_REVIEW_COPY.footnote}</p>
      </div>
    </div>
  );
};
