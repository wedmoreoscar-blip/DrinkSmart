import { useMemo, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { AlcoholTimelineEntryInput } from "@/lib/sessionEngine";
import { PINT_ML, OZ_ML, SHOT_ML } from "@/lib/drinkConstants";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { useEstablishments } from "@/hooks/useEstablishments";
import type { DrinkFilters } from "@/components/DrinkFilterPopover";
import { CategoryScreen } from "@/components/picker/CategoryScreen";
import { CustomDrinkSheet, type CustomDrinkDraft } from "@/components/picker/CustomDrinkSheet";
import { PickerTray } from "@/components/picker/PickerTray";
import {
  CATEGORY_COPY,
  PICKER_CATEGORY_ORDER,
  PICKER_COPY,
  pickerCategoryFor,
} from "@/components/picker/picker-copy";
import {
  entryQuantity,
  entryUnit,
  perUnitVolumeMl,
  type Portion,
} from "@/components/picker/picker-model";

type DrinksTabProps = {
  onNext: () => void;
  onOpenVenues?: () => void;
  selectedVenueId?: string | null;
};

type Selection = {
  drinkId: string;
  quantity: number;
  portion: Portion;
};

const DrinksTab = ({ onNext, onOpenVenues, selectedVenueId }: DrinksTabProps) => {
  const { state, addUnplannedDrink } = useAppContext();
  const {
    establishments,
    getEstablishmentDrinks,
    getUserEstablishments,
    getGlobalEstablishments,
    sessionEstablishments,
    getAllSearchableDrinks,
    addEstablishmentDrink,
  } = useEstablishments();

  const drinks = state.drinks;

  const [category, setCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<DrinkFilters>({
    abvRange: { min: 4, max: 6 },
    selectedCategories: [],
  });
  const [sort, setSort] = useState<string>(CATEGORY_COPY.sort[0]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const venue = useMemo(
    () =>
      establishments.find((establishment) => establishment.id === selectedVenueId) ??
      sessionEstablishments[0] ??
      getUserEstablishments()[0] ??
      getGlobalEstablishments()[0] ??
      null,
    [establishments, selectedVenueId, sessionEstablishments, getUserEstablishments, getGlobalEstablishments],
  );

  const venueDrinks = useMemo(
    () => (venue ? getEstablishmentDrinks(venue.id) : []),
    [venue, getEstablishmentDrinks],
  );

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; minPrice: number | null }>();
    for (const drink of venueDrinks) {
      const label = pickerCategoryFor(drink.category, drink.category_label);
      if (!label) continue;
      const entry = map.get(label) ?? { count: 0, minPrice: null };
      entry.count += 1;
      if (drink.price != null) {
        entry.minPrice = entry.minPrice == null ? drink.price : Math.min(entry.minPrice, drink.price);
      }
      map.set(label, entry);
    }
    return PICKER_CATEGORY_ORDER.flatMap((label) => {
      const entry = map.get(label);
      return entry
        ? [{ label, count: entry.count, minPrice: entry.minPrice ?? 0 }]
        : [];
    });
  }, [venueDrinks]);

  const categoryDrinks = useMemo(
    () =>
      category
        ? venueDrinks.filter((d) => pickerCategoryFor(d.category, d.category_label) === category)
        : [],
    [category, venueDrinks],
  );

  // Calculate total pure alcohol needed using Watson TBW formula
  const calculateTotalPureAlcoholNeeded = () => {
    const { userMetrics, targetBAC, timeDelta } = state;

    if (!userMetrics.weight || timeDelta === null) {
      return null;
    }

    const weightKg = getWeightInKg(userMetrics.weight, userMetrics.weightUnit);
    if (!weightKg) return null;

    const heightCm = getHeightInCm(
      userMetrics.heightCm,
      userMetrics.heightFt,
      userMetrics.heightIn,
      userMetrics.heightUnit
    );

    const tbwGrams = getTBWGrams({
      metricType: userMetrics.metricType,
      bodyFat: userMetrics.bodyFat,
      age: userMetrics.age,
      heightCm,
      weightKg,
      sex: userMetrics.sex,
    });

    if (!tbwGrams) return null;

    const BAC = (targetBAC.min + targetBAC.max) / 2;
    const pureAlcoholGrams = (BAC / 100 + 0.00015 * timeDelta) * tbwGrams;
    return pureAlcoholGrams / 0.789;
  };

  const allSearchable = getAllSearchableDrinks();

  // Committed plan: pure alcohol from every planned drink, so far
  const committedMl = drinks.reduce((total, drink) => {
    if (!drink.quantity) return total;
    if (!drink.isCustom && !drink.drink) return total;
    if (drink.isCustom && (!drink.customName || !drink.customABV)) return total;

    const quantity = parseFloat(drink.quantity);
    if (isNaN(quantity)) return total;

    let volumeMl = 0;
    switch (drink.unit) {
      case "pints":
        volumeMl = quantity * PINT_ML;
        break;
      case "oz":
        volumeMl = quantity * OZ_ML;
        break;
      case "shots":
        volumeMl = quantity * SHOT_ML;
        break;
      case "glass":
        volumeMl = quantity * 175;
        break;
      case "ml":
        volumeMl = quantity;
        break;
    }

    const abv = drink.customABV
      ? parseFloat(drink.customABV)
      : allSearchable.find((d) => d.name === drink.drink)?.abv ?? 0;
    return total + volumeMl * (abv / 100);
  }, 0);

  const committedCount = drinks.filter(
    (d) =>
      d.quantity &&
      parseFloat(d.quantity) > 0 &&
      (d.drink || (d.isCustom && d.customName)),
  ).length;

  const targetMl = calculateTotalPureAlcoholNeeded();

  const selectedDrink = selected
    ? venueDrinks.find((d) => d.id === selected.drinkId) ?? null
    : null;
  const pendingMl =
    selectedDrink && selected
      ? ((perUnitVolumeMl(selectedDrink, selected.portion) * selected.quantity * (selectedDrink.abv ?? 0)) / 100)
      : 0;

  const handleSelect = (drinkId: string) => {
    setSelected({ drinkId, quantity: 1, portion: "pint" });
  };

  const handleAddSelected = () => {
    if (!selectedDrink || !selected) return;
    const entry: AlcoholTimelineEntryInput = {
      id: Date.now().toString(),
      category: selectedDrink.category,
      drink: selectedDrink.drink_name,
      customABV: selectedDrink.abv == null ? undefined : String(selectedDrink.abv),
      quantity: entryQuantity(selectedDrink, selected.quantity, selected.portion),
      unit: entryUnit(selectedDrink),
      pricePerUnit: selectedDrink.price,
    };
    addUnplannedDrink(entry);
    setSelected(null);
  };

  const handleAddCustom = async (draft: CustomDrinkDraft) => {
    const entry: AlcoholTimelineEntryInput = {
      id: Date.now().toString(),
      category: "",
      drink: "",
      isCustom: true,
      customName: draft.name,
      customABV: String(draft.abv),
      quantity: String(draft.serve),
      unit: "ml",
      pricePerUnit: draft.price,
    };
    addUnplannedDrink(entry);
    if (draft.keepIt && draft.abv != null && venue) {
      await addEstablishmentDrink(venue.id, {
        drink_name: draft.name,
        abv: draft.abv,
        category: "custom",
        category_label: "Other",
        price: draft.price,
        volume: draft.serve,
        volume_unit: "ml",
      });
    }
    setCustomOpen(false);
  };

  return (
    <div>
      <div className="pb-5 pt-[22px]">
        {category ? (
          <CategoryScreen
            categoryLabel={category}
            drinks={categoryDrinks}
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            selectedId={selected?.drinkId ?? null}
            quantity={selected?.quantity ?? 1}
            portion={selected?.portion ?? "pint"}
            onSelect={handleSelect}
            onQuantityChange={(n) =>
              setSelected((current) => (current ? { ...current, quantity: n } : current))
            }
            onPortionChange={(p) =>
              setSelected((current) => (current ? { ...current, portion: p } : current))
            }
            onBack={() => setCategory(null)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-label font-medium uppercase text-muted-foreground">
              {PICKER_COPY.screenLabel}
            </div>
            {venue && (
              <button
                type="button"
                onClick={onOpenVenues}
                className="flex min-h-14 items-center justify-between gap-2.5 rounded-ctl bg-field px-4 text-left"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="text-lead text-foreground">{venue.name}</span>
                  <span className="text-[15px] leading-[1.2] text-[#75798c]">
                    {PICKER_COPY.venueSub(venueDrinks.length)}
                  </span>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-none">
                  <path d="M6.5 4L12 9l-5.5 5" stroke="#75798c" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div className="flex flex-col gap-2.5">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setCategory(cat.label)}
                  className="flex min-h-[72px] items-center justify-between gap-3 rounded-lg bg-card px-[18px] py-[14px] text-left"
                >
                  <div>
                    <div className="text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
                      {cat.label}
                    </div>
                    <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">
                      {PICKER_COPY.categorySub(cat.count, cat.minPrice)}
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-none">
                    <path d="M6.5 4L12 9l-5.5 5" stroke="#75798c" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomOpen(true)}
                className="flex min-h-[72px] items-center justify-between gap-3 rounded-lg bg-card px-[18px] py-[14px] text-left"
              >
                <div>
                  <div className="text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
                    {PICKER_COPY.customCategory.name}
                  </div>
                  <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">
                    {PICKER_COPY.customCategory.sub}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-none">
                  <path d="M6.5 4L12 9l-5.5 5" stroke="#75798c" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      <PickerTray
        targetMl={targetMl}
        committedMl={committedMl}
        committedCount={committedCount}
        pendingMl={pendingMl}
        pendingQuantity={selected?.quantity ?? 0}
        hasPending={selected !== null && selectedDrink !== null}
        onDone={onNext}
        onAdd={handleAddSelected}
      />
      <CustomDrinkSheet
        open={customOpen}
        onOpenChange={setCustomOpen}
        venueName={venue?.name ?? null}
        targetMl={targetMl}
        onAdd={handleAddCustom}
      />
    </div>
  );
};

export default DrinksTab;
