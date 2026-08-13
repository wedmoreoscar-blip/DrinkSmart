import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { CATEGORY_COPY, fmtMl, money } from "./picker-copy";
import { isPintDrink, perUnitVolumeMl, portionWord, type Portion } from "./picker-model";

type DrinkRowProps = {
  drink: EstablishmentDrink;
  selected: boolean;
  quantity: number;
  portion: Portion;
  onSelect: () => void;
  onQuantityChange: (quantity: number) => void;
  onPortionChange: (portion: Portion) => void;
};

export const DrinkRow = ({
  drink,
  selected,
  quantity,
  portion,
  onSelect,
  onQuantityChange,
  onPortionChange,
}: DrinkRowProps) => {
  const pint = isPintDrink(drink);
  const word = portionWord(drink, portion);
  const perUnitMl = perUnitVolumeMl(drink, portion);
  const perUnitPureMl = (perUnitMl * drink.abv) / 100;
  const totalPureMl = perUnitPureMl * quantity;

  const sub =
    selected && quantity > 1
      ? CATEGORY_COPY.rowSub(drink.abv, word, perUnitPureMl)
      : CATEGORY_COPY.rowSubSingle(drink.abv, word, perUnitPureMl);

  const summary =
    word.endsWith(" ml") || word.endsWith(" oz")
      ? quantity + " × " + word + " · " + fmtMl(totalPureMl) + " ml pure alcohol"
      : CATEGORY_COPY.selectedSummary(quantity, word, totalPureMl);

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
        {drink.price != null && (
          <div className="flex-none text-right">
            <div className="text-[19px] font-medium leading-[1.2] tabular-nums text-foreground">
              {selected && quantity > 1
                ? CATEGORY_COPY.priceTotal(drink.price, quantity)
                : money(drink.price)}
            </div>
            {selected && quantity > 1 && (
              <div className="mt-[3px] text-[13px] leading-[1.2] tabular-nums text-[#75798c]">
                {CATEGORY_COPY.priceUnit(drink.price, quantity)}
              </div>
            )}
          </div>
        )}
      </button>
      {selected && (
        <>
          <div className="mt-3.5 flex items-center gap-2.5">
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
            {pint && (
              <div className="flex flex-none overflow-hidden rounded-ctl shadow-[0_0_0_1px_#383a46]">
                <button
                  type="button"
                  aria-label="Half pint"
                  onClick={() => onPortionChange("half")}
                  className={
                    "flex min-h-14 min-w-[62px] items-center justify-center text-[19px] " +
                    (portion === "half"
                      ? "bg-accent font-medium text-primary-hover"
                      : "text-muted-foreground")
                  }
                >
                  half
                </button>
                <button
                  type="button"
                  aria-label="Pint"
                  onClick={() => onPortionChange("pint")}
                  className={
                    "flex min-h-14 min-w-[62px] items-center justify-center text-[19px] " +
                    (portion === "pint"
                      ? "bg-accent font-medium text-primary-hover"
                      : "text-muted-foreground")
                  }
                >
                  pint
                </button>
              </div>
            )}
          </div>
          {quantity > 1 && (
            <div className="mt-3 text-note text-muted-foreground">{summary}</div>
          )}
        </>
      )}
    </div>
  );
};
