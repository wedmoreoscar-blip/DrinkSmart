import { useEffect, useState } from "react";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { Input } from "@/components/ui/input";
import { CATEGORY_COPY, money } from "./picker-copy";
import {
  basePriceFromServingPrice,
  pureAlcoholMl,
  servingMl,
  servingOptionsFor,
  servingPrice,
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
  onPriceCommit?: (price: number | null) => void;
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
  const serving = options.find((option) => option.id === servingId) ?? options[0];
  const perUnitVolumeMl = servingMl(drink, serving.id, customMl) ?? 0;
  const perUnitPureMl = pureAlcoholMl(drink, serving.id, customMl);
  const perUnitPrice = servingPrice(drink, serving.id, customMl);

  // The price field is edited as text and committed on blur. It must be a
  // controlled input with an onChange: a `value` prop without one makes the
  // field read-only, so the control renders but cannot be typed into at all.
  const [priceDraft, setPriceDraft] = useState<string>("");
  useEffect(() => {
    setPriceDraft(perUnitPrice != null ? perUnitPrice.toFixed(2) : "");
  }, [perUnitPrice]);

  const sub =
    selected && quantity > 1
      ? CATEGORY_COPY.rowSub(drink.abv, perUnitVolumeMl, perUnitPureMl)
      : CATEGORY_COPY.rowSubSingle(
          drink.abv,
          perUnitVolumeMl,
          perUnitPureMl,
        );

  const summary = CATEGORY_COPY.selectedSummary(quantity, perUnitVolumeMl, perUnitPureMl);

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
          <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">{sub}</div>
        </div>
        {perUnitPrice != null && (
          <div className="flex-none text-right">
            <div className="text-[19px] font-medium leading-[1.2] tabular-nums text-foreground">
              {selected && quantity > 1
                ? CATEGORY_COPY.priceTotal(perUnitPrice, quantity)
                : money(perUnitPrice)}
            </div>
            {selected && quantity > 1 && (
              <div className="mt-[3px] text-[13px] leading-[1.2] tabular-nums text-[#75798c]">
                {CATEGORY_COPY.priceUnit(perUnitPrice, quantity)}
              </div>
            )}
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
                  inputMode="numeric"
                  aria-label="Custom serving ml"
                  placeholder="ml"
                  value={customMl ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    if (raw === "") {
                      onCustomMlChange(null);
                      return;
                    }
                    const parsed = Number(raw);
                    onCustomMlChange(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
                  }}
                  className="flex h-14 w-24 flex-none rounded-ctl bg-field px-4 text-center text-[19px] leading-none tabular-nums text-foreground shadow-[0_0_0_1px_#383a46] outline-none focus:shadow-[0_0_0_2px_#9184d9]"
                />
              )}
              <Input
                type="number"
                inputMode="decimal"
                aria-label="Price"
                placeholder="£"
                value={priceDraft}
                onChange={(event) => setPriceDraft(event.target.value)}
                onBlur={(event) => {
                  const raw = event.target.value.trim();
                  if (raw === "") {
                    onPriceCommit(null);
                    return;
                  }
                  const parsed = Number(raw);
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    onPriceCommit(null);
                    return;
                  }
                  // The user types the price of the serving in front of them;
                  // what is stored is the price of the priced volume. Commit
                  // the converted figure so re-reading it does not rescale an
                  // already-scaled number.
                  onPriceCommit(
                    basePriceFromServingPrice(drink, serving.id, customMl, parsed),
                  );
                }}
                className="flex h-14 w-24 flex-none rounded-ctl bg-field px-4 text-center text-[19px] leading-none tabular-nums text-foreground shadow-[0_0_0_1px_#383a46] outline-none focus:shadow-[0_0_0_2px_#9184d9]"
              />
            </div>
          </div>
          {quantity > 1 && (
            <div className="mt-3 text-note text-muted-foreground">{summary}</div>
          )}
        </>
      )}
    </div>
  );
};
