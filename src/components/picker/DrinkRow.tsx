import { useEffect, useRef, useState } from "react";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { Input } from "@/components/ui/input";
import { CATEGORY_COPY, money } from "./picker-copy";
import {
  NUMERIC_FIELD_INPUT_MODE,
  numericFieldText,
  parseNumericField,
  parseNumericFieldInRange,
} from "@/lib/numericField";
import {
  pricedVolumeForEntry,
  pureAlcoholMl,
  servingMl,
  servingOptionForVolume,
  servingOptionsFor,
  servingPriceFor,
} from "./picker-model";

type DrinkRowProps = {
  drink: EstablishmentDrink;
  selected: boolean;
  quantity: number;
  servingId: string;
  customMl: number | null;
  onSelect: () => void;
  onQuantityChange: (quantity: number) => void;
  onServingChange: (servingId: string) => void;
  onCustomMlChange: (ml: number | null) => void;
  /**
   * A price for one serving of `volumeMl`. A null price clears that rung; a
   * null volume means the serving is not commitable and there is nothing to
   * price. The volume is passed because a price now belongs to the volume it
   * was typed against — the caller must not infer it.
   */
  onPriceCommit?: (price: number | null, volumeMl: number | null) => void;
};

export const DrinkRow = ({
  drink,
  selected,
  quantity,
  servingId,
  customMl,
  onSelect,
  onQuantityChange,
  onServingChange,
  onCustomMlChange,
  onPriceCommit = () => {},
}: DrinkRowProps) => {
  const options = servingOptionsFor(drink);
  const serving =
    options.find((option) => option.id === servingId) ?? options[0];
  const selectedMl = servingMl(drink, serving.id, customMl);
  const perUnitVolumeMl = selectedMl ?? 0;
  const perUnitPureMl = pureAlcoholMl(drink, serving.id, customMl);
  // What THIS serving costs, and only if a price was set for THIS serving.
  // Single, double and custom are priced independently: a double is not twice
  // a single, so a double with no price of its own shows nothing rather than
  // inheriting the single's arithmetic. This is the same value the price box
  // below is filled from, so the figure and the field can never disagree.
  const resolution = servingPriceFor(drink, serving.id, customMl);

  // Every serving of this drink that carries a price, in ladder order.
  const ladderPrices = options.flatMap((option) => {
    const resolved = servingPriceFor(drink, option.id, customMl);
    return resolved.status === "priced" && resolved.exact
      ? [{ id: option.id, price: resolved.total }]
      : [];
  });
  const exactPrice =
    resolution.status === "priced" && resolution.exact ? resolution.total : null;
  const priceFieldLabel = CATEGORY_COPY.priceFieldLabel(
    serving.label,
    selectedMl,
  );

  // The price field is edited as text and committed on blur. It must be a
  // controlled input with an onChange: a `value` prop without one makes the
  // field read-only, so the control renders but cannot be typed into at all.
  const [priceDraft, setPriceDraft] = useState<string>("");
  const priceFocused = useRef(false);
  useEffect(() => {
    if (priceFocused.current) return;
    setPriceDraft(exactPrice != null ? exactPrice.toFixed(2) : "");
  }, [exactPrice]);

  // The serve field keeps the half-typed text, exactly as the custom-drink
  // sheet and the scanner review do. Driving the input's `value` from the
  // parsed number instead means any keystroke that briefly makes the text
  // unparseable — backspacing "1.25e-8" to "1.25e-" — commits null, the parent
  // rejects it, and the unchanged prop re-renders the character the user just
  // deleted. The field then cannot be edited out of a bad value at all.
  const [serveDraft, setServeDraft] = useState<string>("");
  const serveFocused = useRef(false);
  useEffect(() => {
    // Never re-render the box from the committed value while it is being typed
    // into. Doing so is what let a clamp rewrite the field mid-entry.
    if (serveFocused.current) return;
    setServeDraft(numericFieldText(customMl));
  }, [customMl]);

  const sub =
    selected && quantity > 1
      ? CATEGORY_COPY.rowSub(drink.abv, perUnitVolumeMl, perUnitPureMl)
      : CATEGORY_COPY.rowSubSingle(drink.abv, perUnitVolumeMl, perUnitPureMl);

  const summary = CATEGORY_COPY.selectedSummary(
    quantity,
    perUnitVolumeMl,
    perUnitPureMl,
  );

  return (
    <div
      className={
        "rounded-lg bg-card px-[18px] " +
        (selected
          ? "py-3.5 pb-4 shadow-[0_0_0_2px_#9184d9]"
          : "min-h-[72px] py-[14px]")
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="truncate text-[22px] leading-[1.2] text-foreground">
            {drink.drink_name}
          </div>
          <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">
            {sub}
          </div>
        </div>
        {ladderPrices.length > 0 && (
          // One figure per priced serving, in ladder order — single, double,
          // custom. Position says which is which, and the row is right-aligned,
          // so a drink with only a single priced shows that one number hard
          // right. A single figure in this corner could not stand for three
          // independent prices, which is what made it unreadable before.
          <div className="flex flex-none items-baseline justify-end gap-2.5">
            {ladderPrices.map((entry) => (
              <div
                key={entry.id}
                className={
                  "text-[19px] font-medium leading-[1.2] tabular-nums " +
                  // The white marks which serving you are on, so it only
                  // means anything while this row is open. Closed, every price
                  // is grey — a highlighted leftmost figure on a row nobody is
                  // editing points at nothing.
                  (selected && entry.id === serving.id
                    ? "text-foreground"
                    : "text-[#75798c]")
                }
              >
                {money(entry.price)}
              </div>
            ))}
          </div>
        )}
      </button>
      {selected && (
        <>
          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => onQuantityChange(quantity - 1)}
              className="flex h-14 w-14 flex-none items-center justify-center rounded-ctl text-[28px] leading-none text-foreground shadow-[0_0_0_1px_#383a46] disabled:pointer-events-none disabled:opacity-50"
            >
              −
            </button>
            <div className="min-w-11 flex-none text-center text-[28px] font-medium leading-none tabular-nums text-foreground">
              {quantity}
            </div>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => onQuantityChange(quantity + 1)}
              className="flex h-14 w-14 flex-none items-center justify-center rounded-ctl text-[28px] leading-none text-foreground shadow-[0_0_0_1px_#383a46]"
            >
              +
            </button>
            <div className="flex-1" />
            <div className="flex flex-none flex-wrap items-center justify-end gap-1.5">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  onClick={() => onServingChange(option.id)}
                  className={
                    "flex min-h-14 min-w-[62px] items-center justify-center rounded-ctl text-[19px] " +
                    (serving.id === option.id
                      ? "bg-accent font-medium text-primary-hover shadow-[0_0_0_1px_#383a46]"
                      : "text-muted-foreground shadow-[0_0_0_1px_#383a46]")
                  }
                >
                  {option.label}
                </button>
              ))}
              {serving.id === "custom" && (
                <input
                  type="text"
                  inputMode={NUMERIC_FIELD_INPUT_MODE.serve}
                  aria-label="Custom serving ml"
                  placeholder="ml"
                  value={serveDraft}
                  onChange={(event) => {
                    const text = event.target.value;
                    setServeDraft(text);
                    // In-range only while typing: no clamping. Clamping per
                    // keystroke turned `2` into 25 and then `250` into `2550`,
                    // because the committed value was rendered back into the
                    // box the user was still typing in. An out-of-range or
                    // half-typed value leaves the committed one alone; the
                    // blur below clamps whatever is finally there.
                    const typed = parseNumericFieldInRange("serve", text);
                    if (typed !== null) onCustomMlChange(typed);
                  }}
                  onFocus={() => {
                    serveFocused.current = true;
                  }}
                  onBlur={(event) => {
                    serveFocused.current = false;
                    // Commit on blur clamps: whatever is in the box now becomes
                    // a legal serve, or clears it if it holds no number.
                    const committed = parseNumericField("serve", event.target.value);
                    if (committed !== customMl) onCustomMlChange(committed);
                    setServeDraft(numericFieldText(committed));
                    // Committing a typed volume that is exactly one of the
                    // row's own servings lands on that rung and Custom turns
                    // off. Blur-only: switching mid-typing would hijack the
                    // entry, which is what serveDraft exists to prevent.
                    if (committed == null) return;
                    const matching = servingOptionForVolume(drink, committed);
                    if (!matching) return;
                    onCustomMlChange(null);
                    onServingChange(matching.id);
                  }}
                  className="flex h-14 w-24 flex-none rounded-ctl bg-field px-4 text-center text-[19px] leading-none tabular-nums text-foreground shadow-[0_0_0_1px_#383a46] outline-none focus:shadow-[0_0_0_2px_#9184d9]"
                />
              )}
              {/* The label is rendered, not just announced. A screen-reader-only
                  label leaves a sighted user typing `25` into a bare £ box with
                  nothing on screen saying whether that is per shot or for all
                  ten — which is the ambiguity this field exists to remove. */}
              <div className="flex flex-none flex-col items-center gap-[3px]">
                <Input
                  type="number"
                  inputMode="decimal"
                  aria-label={priceFieldLabel}
                  placeholder="£"
                  value={priceDraft}
                  onChange={(event) => setPriceDraft(event.target.value)}
                  onBlur={(event) => {
                    const raw = event.target.value.trim();
                    if (raw === "") {
                      onPriceCommit(
                        null,
                        pricedVolumeForEntry(drink, serving.id, customMl),
                      );
                      return;
                    }
                    const parsed = Number(raw);
                    if (!Number.isFinite(parsed) || parsed < 0) {
                      onPriceCommit(
                        null,
                        pricedVolumeForEntry(drink, serving.id, customMl),
                      );
                      return;
                    }
                    // The user types the price of the serving in front of them,
                    // and that is exactly what is stored — against the volume it
                    // was typed against, with no conversion. The conversion is
                    // what used to make the value drift.
                    onPriceCommit(
                      parsed,
                      pricedVolumeForEntry(drink, serving.id, customMl),
                    );
                  }}
                  className="flex h-14 w-24 flex-none rounded-ctl bg-field px-4 text-center text-[19px] leading-none tabular-nums text-foreground shadow-[0_0_0_1px_#383a46] outline-none focus:shadow-[0_0_0_2px_#9184d9]"
                />
                <span className="text-[11px] leading-[1.2] text-[#75798c]">
                  {priceFieldLabel}
                </span>
              </div>
            </div>
          </div>
          {quantity > 1 && (
            <div className="mt-3 text-note text-muted-foreground">
              {summary}
            </div>
          )}
        </>
      )}
    </div>
  );
};
