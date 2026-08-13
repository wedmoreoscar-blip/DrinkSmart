import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { KeypadFieldGroup, type KeypadField } from "@/components/ui/keypad-field-group";

import { SCAN_REVIEW_COPY } from "./copy";
import {
  countDrinkGaps,
  nextGapTarget,
  orderDrinkIndices,
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

const fieldsFor = (d: ParsedDrink): KeypadField[] => [
  { key: "abv", unit: "%", value: d.abv },
  { key: "serve", unit: "ml", value: d.volume, integer: true },
  { key: "price", unit: "£", value: d.price },
];

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
                <KeypadFieldGroup
                  fields={fieldsFor(drinks[index])}
                  onCommit={(key, value) => commit(index, key as ReviewField, value)}
                  onAdvance={() => advanceFrom(index)}
                  emptyIsAllowed
                  focusKey={editingTarget?.index === index ? editingTarget.field : null}
                  focusRequest={focusRequest}
                  title={drinks[index].name}
                  note={gapReason(drinks[index])}
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
                    {drink.abv != null && drink.volume != null ? `${drink.abv.toFixed(1)}% · ${drink.volume}` : ""}
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
