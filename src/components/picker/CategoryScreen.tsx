import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DrinkFilterPopover, type DrinkFilters } from "@/components/DrinkFilterPopover";
import type { EstablishmentDrink } from "@/hooks/useEstablishments";
import { compareByResolvedPrice } from "@/lib/drinkOverrides";
import { CATEGORY_COPY, pickerScreenCategoryFor } from "./picker-copy";
import { defaultServingFor, servingPrice } from "./picker-model";
import { DrinkRow } from "./DrinkRow";
import { pureAlcoholMl } from "./picker-model";

type CategoryScreenProps = {
  categoryLabel: string;
  drinks: EstablishmentDrink[];
  availableCategories: string[];
  filters: DrinkFilters;
  onFiltersChange: (filters: DrinkFilters) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  selectedId: string | null;
  quantity: number;
  servingId: string;
  customMl: number | null;
  onSelect: (drinkId: string) => void;
  onQuantityChange: (quantity: number) => void;
  onServingChange: (servingId: string) => void;
  onCustomMlChange: (ml: number | null) => void;
  /** A price for one serving of `volumeMl` of that drink. See DrinkRow. */
  onPriceCommit?: (drinkId: string, price: number | null, volumeMl: number | null) => void;
  onBack: () => void;
};

export const CategoryScreen = ({
  categoryLabel,
  drinks,
  availableCategories,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  selectedId,
  quantity,
  servingId,
  customMl,
  onSelect,
  onQuantityChange,
  onServingChange,
  onCustomMlChange,
  onPriceCommit,
  onBack,
}: CategoryScreenProps) => {
  const [sortOpen, setSortOpen] = useState(false);

  const abvActive = filters.abvRange.min > 0 || filters.abvRange.max < 100;

  const visibleDrinks = useMemo(() => {
    const abvActive = filters.abvRange.min > 0 || filters.abvRange.max < 100;
    const filtered = drinks.filter((d) => {
      const drinkCategory = pickerScreenCategoryFor(d.category, d.category_label);
      const categoryMatches = filters.selectedCategories.includes(drinkCategory);
      const abvMatches =
        d.abv == null
          ? !abvActive
          : d.abv >= filters.abvRange.min && d.abv <= filters.abvRange.max;
      return categoryMatches && abvMatches;
    });
    const sorted = [...filtered];
    if (sort === CATEGORY_COPY.sort[1]) sorted.sort((a, b) => (b.abv ?? -1) - (a.abv ?? -1));
    else if (sort === CATEGORY_COPY.sort[2])
      sorted.sort(
        (a, b) =>
          pureAlcoholMl(a, defaultServingFor(a).id, null) -
          pureAlcoholMl(b, defaultServingFor(b).id, null)
      );
    // Cheapest first compares each drink at the serving it would open on, since
    // a price is now per rung and two drinks' prices are only comparable at a
    // stated volume. Unpriced rows sort last, per compareByResolvedPrice.
    else
      sorted.sort((a, b) =>
        compareByResolvedPrice(
          servingPrice(a, defaultServingFor(a).id, null),
          servingPrice(b, defaultServingFor(b).id, null),
        ),
      );
    return sorted;
  }, [drinks, filters.abvRange, filters.selectedCategories, sort]);

  const chipLabel = CATEGORY_COPY.abvChip(filters.abvRange.min, filters.abvRange.max);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-14 flex-none items-center gap-3">
        <button type="button" aria-label="Back" onClick={onBack} className="flex-none">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M13 4.5L6.5 11l6.5 6.5" stroke="#e9e9ed" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex-1 truncate text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
          {categoryLabel}
        </div>
        <div className="flex-none text-[15px] leading-[1.2] text-[#75798c]">{visibleDrinks.length}</div>
      </div>

      <div className="flex flex-none gap-2.5">
        <DrinkFilterPopover
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableCategories={availableCategories}
          trigger={
            <button
              type="button"
              className={
                abvActive
                  ? "flex min-h-14 flex-none items-center whitespace-nowrap rounded-ctl px-[18px] text-body shadow-[0_0_0_2px_#9184d9] text-foreground"
                  : "flex min-h-14 flex-none items-center whitespace-nowrap rounded-ctl px-[18px] text-body shadow-[0_0_0_1px_#383a46] text-muted-foreground"
              }
            >
              ABV
              <span className={"ml-1.5 tabular-nums" + (abvActive ? " text-[#b5abfc]" : "")}>
                {chipLabel.slice("ABV ".length)}
              </span>
            </button>
          }
        />
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex min-h-14 flex-none items-center whitespace-nowrap rounded-ctl px-[18px] text-body shadow-[0_0_0_1px_#383a46] text-muted-foreground"
            >
              {sort}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1.5">
            <div className="flex flex-col">
              {CATEGORY_COPY.sort.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onSortChange(option);
                    setSortOpen(false);
                  }}
                  className={
                    "flex min-h-14 items-center gap-2.5 rounded-ctl px-4 text-left text-body " +
                    (option === sort ? "text-primary" : "text-foreground")
                  }
                >
                  {option === sort ? (
                    <Check className="h-4 w-4 flex-none" />
                  ) : (
                    <span className="w-4 flex-none" />
                  )}
                  <span className="flex-1">{option}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-2.5">
        {visibleDrinks.map((drink) => (
          // One row per drink. The row is a selector and nothing else: it never
          // edits the plan, so choosing a serving cannot rewrite an entry the
          // user already committed. Separate volumes are separate cards on the
          // Plan tab, which is where a committed drink is edited.
          <DrinkRow
            key={drink.id}
            drink={drink}
            selected={selectedId === drink.id}
            quantity={quantity}
            servingId={servingId}
            customMl={customMl}
            onSelect={() => onSelect(drink.id)}
            onQuantityChange={onQuantityChange}
            onServingChange={onServingChange}
            onCustomMlChange={onCustomMlChange}
            onPriceCommit={(price, volumeMl) => onPriceCommit?.(drink.id, price, volumeMl)}
          />
        ))}
      </div>
    </div>
  );
};
