import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { AlcoholTimelineEntryInput } from "@/lib/sessionEngine";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { useEstablishments } from "@/hooks/useEstablishments";
import { useSavedDrinks } from "@/hooks/useSavedDrinks";
import type { DrinkFilters } from "@/components/DrinkFilterPopover";
import { CategoryScreen } from "@/components/picker/CategoryScreen";
import { CustomDrinkSheet, type CustomDrinkDraft } from "@/components/picker/CustomDrinkSheet";
import { PickerTray } from "@/components/picker/PickerTray";
import {
  CATEGORY_COPY,
  fmtMl,
  money,
  PICKER_CATEGORY_ORDER,
  PICKER_COPY,
  pickerCategoryFor,
} from "@/components/picker/picker-copy";
import {
  defaultServingFor,
  pureAlcoholMl,
  servingMl,
  servingPrice,
} from "@/components/picker/picker-model";
import {
  entryEthanolMl,
  entryEthanolLabel,
  entryPortionWord,
  entryServingCount,
  overTargetAdvice,
  planGroupEthanolLabel,
  planGroupVolumeLabel,
  PLAN_BUILT_COPY,
  SWAP_COPY,
} from "@/components/picker/wave5-picker";
import { cn } from "@/lib/utils";
import { BLOOD_WATER_FRACTION } from "@/lib/drinkConstants";

type DrinksTabProps = {
  onNext: () => void;
  onOpenVenues?: () => void;
  selectedVenueId?: string | null;
  planBuilt?: boolean;
  swapDrinkId?: string | null;
  onSwapComplete?: () => void;
};

type Selection = {
  drinkId: string;
  quantity: number;
  servingId: string;
};

const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className={cn("flex-none", locked ? "text-primary" : "text-[#75798c]")}
  >
    <rect
      x="3.5"
      y="8.5"
      width="13"
      height="9"
      rx="2"
      stroke="currentColor"
      fill={locked ? "currentColor" : "none"}
      strokeWidth="1.5"
    />
    <path d="M6.8 8.5V6a3.2 3.2 0 0 1 6.4 0v2.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-none text-[#75798c]">
    <path
      d="M4 6.2h12M8 6.2V4.6h4v1.6M6.7 6.2l.7 10.2h5.2l.7-10.2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ChevronIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-none">
    <path d="M6.5 4L12 9l-5.5 5" stroke="#75798c" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const DrinksTab = ({
  onNext,
  onOpenVenues,
  planBuilt = false,
  swapDrinkId,
  onSwapComplete,
}: DrinksTabProps) => {
  const {
    state,
    addUnplannedDrink,
    updateDrinks,
    toggleLockedDrink,
    replaceBreakWithDrink,
  } = useAppContext();
  const {
    activeVenue,
    getEstablishmentDrinks,
    getAllSearchableDrinks,
    addEstablishmentDrink,
  } = useEstablishments();
  const { isLoggedIn: hasAccount, saveDrink, savedDrinks } = useSavedDrinks();

  const drinks = state.drinks;

  const [category, setCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<DrinkFilters>({
    abvRange: { min: 0, max: 100 },
    selectedCategories: [],
  });
  const [sort, setSort] = useState<string>(CATEGORY_COPY.sort[0]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [customMl, setCustomMl] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => new Set());
  const [swapSelectedId, setSwapSelectedId] = useState<string | null>(null);
  const swapScreenRef = useRef<HTMLDivElement | null>(null);

  const venue = activeVenue;

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

  const openCategory = (label: string) => {
    setCategory(label);
    setFilters((current) => ({ ...current, selectedCategories: [label] }));
  };

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
    const pureAlcoholGrams =
      ((BAC / 100 + 0.00015 * timeDelta) * tbwGrams) / BLOOD_WATER_FRACTION;
    return pureAlcoholGrams / 0.789;
  };

  const allSearchable = getAllSearchableDrinks();

  const entryAbv = useCallback(
    (entry: AlcoholTimelineEntryInput): number | null => {
      if (entry.customABV) {
        const parsed = parseFloat(entry.customABV);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return allSearchable.find((d) => d.name === entry.drink)?.abv ?? null;
    },
    [allSearchable],
  );

  // Committed plan entries that represent a real drink
  const planEntries = useMemo(
    () =>
      drinks.filter(
        (d) =>
          d.quantity &&
          parseFloat(d.quantity) > 0 &&
          (d.drink || (d.isCustom && d.customName)),
      ),
    [drinks],
  );
  const consumedSourceIds = useMemo(
    () => new Set(state.consumedTimelineEntries.map((snapshot) => snapshot.sourceDrinkId)),
    [state.consumedTimelineEntries],
  );

  // Plan-tab cards show only drinks that are still actionable. Consumed
  // records stay in planEntries (committed ethanol, tray ceiling, target
  // accounting, BAC, timeline) but their source drinks no longer render here.
  const unconsumedEntries = useMemo(
    () => planEntries.filter((entry) => !consumedSourceIds.has(entry.id)),
    [planEntries, consumedSourceIds],
  );

  // Committed plan: pure alcohol from every planned drink, so far
  const committedMl = useMemo(
    () => planEntries.reduce((total, entry) => total + entryEthanolMl(entry, entryAbv(entry)), 0),
    [planEntries, entryAbv],
  );

  const committedCount = planEntries.reduce(
    (total, entry) => total + entryServingCount(entry),
    0,
  );

  const targetMl = calculateTotalPureAlcoholNeeded();

  const selectedDrink = selected
    ? venueDrinks.find((d) => d.id === selected.drinkId) ?? null
    : null;
  const selectedServingMl =
    selected && selectedDrink ? servingMl(selectedDrink, selected.servingId, customMl) : null;
  const pendingMl =
    selectedServingMl != null && selected
      ? (selectedServingMl * selected.quantity * (selectedDrink?.abv ?? 0)) / 100
      : 0;
  const normalHasPending = selected !== null && selectedDrink !== null && selectedServingMl != null;

  // ---- Swap mode -----------------------------------------------------------

  const sourceBreak = useMemo(
    () =>
      swapDrinkId
        ? state.breaks.find((entry) => entry.entryId === swapDrinkId) ?? null
        : null,
    [state.breaks, swapDrinkId],
  );
  const sourceEntry = useMemo<AlcoholTimelineEntryInput | null>(() => {
    if (!swapDrinkId) return null;
    const drink = drinks.find((entry) => entry.id === swapDrinkId);
    if (drink) return drink;
    if (!sourceBreak) return null;
    return {
      id: sourceBreak.entryId,
      category: "",
      drink: sourceBreak.drinkName,
      customName: sourceBreak.drinkName,
      customABV: "0",
      quantity: String(sourceBreak.volumeMl ?? 330),
      unit: "ml",
      isCustom: true,
    };
  }, [drinks, sourceBreak, swapDrinkId]);
  const swapMode = sourceEntry !== null;

  useEffect(() => {
    if (swapMode && swapScreenRef.current) {
      swapScreenRef.current.scrollIntoView({ block: "start" });
    }
  }, [swapMode]);

  const sourceEthanolMl = sourceEntry ? entryEthanolMl(sourceEntry, entryAbv(sourceEntry)) : 0;
  const sourceName = sourceEntry
    ? sourceEntry.customName ?? sourceEntry.drink ?? "drink"
    : "";
  const swapCapMl = sourceEthanolMl * 1.2;
  const swapCommittedMl = committedMl - sourceEthanolMl;

  const swapGroups = useMemo(() => {
    const groups = new Map<string, (typeof venueDrinks)[number][]>();
    for (const drink of venueDrinks) {
      const label = pickerCategoryFor(drink.category, drink.category_label);
      if (!label) continue;
      const servingEthanolMl = pureAlcoholMl(drink, defaultServingFor(drink).id, null);
      if (servingEthanolMl > swapCapMl) continue;
      if (targetMl != null && swapCommittedMl + servingEthanolMl > targetMl * 1.2) continue;
      const list = groups.get(label) ?? [];
      list.push(drink);
      groups.set(label, list);
    }
    return PICKER_CATEGORY_ORDER.flatMap((label) => {
      const list = groups.get(label);
      return list ? [{ label, drinks: list }] : [];
    });
  }, [venueDrinks, swapCapMl, swapCommittedMl, targetMl]);

  const omittedStronger = useMemo(
    () =>
      venueDrinks.filter((drink) => {
        const label = pickerCategoryFor(drink.category, drink.category_label);
        return label !== null && pureAlcoholMl(drink, defaultServingFor(drink).id, null) > swapCapMl;
      }).length,
    [venueDrinks, swapCapMl],
  );

  const eligibleCount = swapGroups.reduce((total, group) => total + group.drinks.length, 0);

  const swapSelectedDrink = swapSelectedId
    ? venueDrinks.find((d) => d.id === swapSelectedId) ?? null
    : null;
  const swapPendingMl = swapSelectedDrink
    ? pureAlcoholMl(swapSelectedDrink, defaultServingFor(swapSelectedDrink).id, null)
    : 0;
  const swapHasPending = swapSelectedDrink !== null;

  const handleCommitSwap = () => {
    if (!sourceEntry || !swapSelectedDrink) return;
    const serving = defaultServingFor(swapSelectedDrink);
    const next: AlcoholTimelineEntryInput = {
      id: sourceEntry.id,
      category: swapSelectedDrink.category,
      drink: swapSelectedDrink.drink_name,
      customABV: swapSelectedDrink.abv == null ? undefined : String(swapSelectedDrink.abv),
      quantity: String(serving.ml ?? 330),
      unit: "ml",
      pricePerUnit: servingPrice(swapSelectedDrink, serving.id, null),
      isCustom: false,
    };
    if (sourceBreak) {
      replaceBreakWithDrink(sourceBreak.entryId, next);
    } else {
      updateDrinks(drinks.map((d) => (d.id === sourceEntry.id ? next : d)));
    }
    setSwapSelectedId(null);
    onSwapComplete?.();
  };

  // ---- Plan-built panels ----------------------------------------------------

  const planGroups = useMemo(() => {
    const groups = new Map<
      string,
      { entries: AlcoholTimelineEntryInput[]; count: number }
    >();
    for (const entry of unconsumedEntries) {
      const label = entry.isCustom
        ? PICKER_COPY.customCategory.name
        : pickerCategoryFor(entry.category, null);
      if (!label) continue;
      const group = groups.get(label) ?? { entries: [], count: 0 };
      group.entries.push(entry);
      group.count += entryServingCount(entry);
      groups.set(label, group);
    }
    return groups;
  }, [unconsumedEntries, entryAbv]);

  const planGroupSub = (group: ReturnType<typeof planGroups.get>) =>
    PLAN_BUILT_COPY.categorySub(
      group?.count ?? 0,
      group ? planGroupVolumeLabel(group.entries) : "0 ml",
      group ? planGroupEthanolLabel(group.entries, entryAbv) : "0 ml ethanol",
    );

  const visibleCategories = useMemo(() => {
    const venueCategories = new Map(categories.map((entry) => [entry.label, entry]));
    return PICKER_CATEGORY_ORDER.flatMap((label) => {
      const venueCategory = venueCategories.get(label);
      if (venueCategory) return [venueCategory];
      return planGroups.has(label) ? [{ label, count: 0, minPrice: 0 }] : [];
    });
  }, [categories, planGroups]);

  const toggleHidden = (label: string) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleDeleteDrink = (id: string) => {
    if (consumedSourceIds.has(id)) return;
    updateDrinks(drinks.filter((d) => d.id !== id));
  };

  // ---- Add/ceiling ----------------------------------------------------------

  const overCeiling = targetMl != null && committedMl + pendingMl > targetMl * 1.2;

  const handleSelect = (drinkId: string) => {
    const drink = venueDrinks.find((d) => d.id === drinkId);
    if (!drink) return;
    setSelected({ drinkId, quantity: 1, servingId: defaultServingFor(drink).id });
    setCustomMl(null);
  };

  const handleAddSelected = () => {
    if (!selectedDrink || !selected) return;
    if (selectedServingMl == null) return;
    if (targetMl != null && committedMl + pendingMl > targetMl * 1.2) return;
    const entry: AlcoholTimelineEntryInput = {
      id: crypto.randomUUID(),
      category: selectedDrink.category,
      drink: selectedDrink.drink_name,
      customABV: selectedDrink.abv == null ? undefined : String(selectedDrink.abv),
      quantity: String(selectedServingMl * selected.quantity),
      unit: "ml",
      pricePerUnit: servingPrice(selectedDrink, selected.servingId, customMl),
      portions: selected.quantity > 1 ? selected.quantity : undefined,
    };
    addUnplannedDrink(entry);
    setSelected(null);
    setCustomMl(null);
  };

  const handleAddCustom = async (draft: CustomDrinkDraft) => {
    const customMl = ((draft.serve ?? 0) * (draft.abv ?? 0)) / 100;
    if (targetMl != null && committedMl + customMl > targetMl * 1.2) return;
    const entry: AlcoholTimelineEntryInput = {
      id: crypto.randomUUID(),
      category: "Cocktails",
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
    if (draft.saveToAccount && draft.abv != null && draft.serve != null && hasAccount) {
      await saveDrink({ drinkName: draft.name, abv: draft.abv, servingMl: draft.serve });
    }
    setCustomOpen(false);
  };

  // ---- Tray ----------------------------------------------------------------

  const trayCommittedMl = swapMode ? swapCommittedMl : committedMl;
  const trayPendingMl = swapMode ? swapPendingMl : pendingMl;
  const trayTotalMl = trayCommittedMl + trayPendingMl;
  const trayAdvice = overTargetAdvice(trayTotalMl, targetMl, state.inebriationLevel);

  const swapRowSub = (drink: (typeof venueDrinks)[number]) => {
    const serving = defaultServingFor(drink);
    const perMl = pureAlcoholMl(drink, serving.id, null);
    return CATEGORY_COPY.rowSubSingle(
      drink.abv,
      serving.ml ?? 330,
      perMl,
    );
  };

  const panelRow = (entry: AlcoholTimelineEntryInput) => (
    <div key={entry.id} className="flex min-h-16 items-center border-b border-[#262837] last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[19px] leading-[1.25] text-foreground">
          {entry.customName ?? entry.drink}
        </div>
        <div className="mt-[3px] text-[13px] leading-[1.3] tabular-nums text-[#75798c]">
          {PLAN_BUILT_COPY.drinkSub(
            entryPortionWord(entry),
            entryEthanolLabel(entry, entryAbv(entry)),
            entry.pricePerUnit != null
              ? entry.pricePerUnit * (entry.portions ?? 1)
              : null
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label={state.lockedDrinkIds.includes(entry.id) ? "Unlock" : "Lock"}
        onClick={() => toggleLockedDrink(entry.id)}
        className="flex h-14 w-14 flex-none items-center justify-center"
      >
        <LockIcon locked={state.lockedDrinkIds.includes(entry.id)} />
      </button>
      <button
        type="button"
        aria-label="Delete"
        onClick={() => handleDeleteDrink(entry.id)}
        className="flex h-14 w-14 flex-none items-center justify-center"
      >
        <DeleteIcon />
      </button>
    </div>
  );

  return (
    <div>
      <div className="pb-5 pt-[22px]">
        {swapMode ? (
          <div ref={swapScreenRef} className="flex flex-col gap-3">
            <div className="flex min-h-14 flex-none items-center gap-3">
              <button
                type="button"
                aria-label="Back"
                onClick={() => onSwapComplete?.()}
                className="flex-none"
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M13 4.5L6.5 11l6.5 6.5" stroke="#e9e9ed" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <div className="flex-1 truncate text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
                {SWAP_COPY.title(sourceName)}
              </div>
              <div className="flex-none text-[15px] leading-[1.2] tabular-nums text-[#75798c]">
                {SWAP_COPY.count(eligibleCount)}
              </div>
            </div>
            <p className="text-[19px] leading-[1.45] text-muted-foreground">
              Anything up to{" "}
              <span className="tabular-nums text-foreground">{fmtMl(swapCapMl)}</span>{" "}
              ml of alcohol — {sourceEthanolMl.toFixed(1)} plus a fifth. Weaker is always fine.
            </p>
            <div className="flex flex-col gap-2.5">
              {swapGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  <div
                    className={cn(
                      "text-label font-medium uppercase text-[#75798c]",
                      groupIndex > 0 && "mt-1.5"
                    )}
                  >
                    {group.label}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {group.drinks.map((drink) => {
                      const defaultServing = defaultServingFor(drink);
                      const price = servingPrice(drink, defaultServing.id, null);
                      return <button
                        key={drink.id}
                        type="button"
                        onClick={() => setSwapSelectedId(drink.id)}
                        className={cn(
                          "flex min-h-[72px] items-center justify-between gap-3 rounded-lg bg-card px-[18px] py-[14px] text-left",
                          swapSelectedId === drink.id && "shadow-[0_0_0_2px_#9184d9]"
                        )}
                      >
                        <div className="min-w-0">
                          <div
                            className={cn(
                              "truncate text-[22px] leading-[1.2]",
                              group.label === "Soft & low-alcohol" ? "text-[#cfd3e5]" : "text-foreground"
                            )}
                          >
                            {drink.drink_name}
                          </div>
                          <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">
                            {swapRowSub(drink)}
                          </div>
                        </div>
                        <div className="flex-none text-right">
                          <div
                            className={cn(
                              "text-[19px] font-medium leading-[1.2] tabular-nums",
                              price == null || price === 0
                                ? "text-muted-foreground"
                                : "text-foreground"
                            )}
                          >
                            {price == null || price === 0
                              ? "free"
                              : money(price)}
                          </div>
                          {swapSelectedId === drink.id && (
                            <div className="mt-[3px] text-[13px] leading-[1.2] tabular-nums text-[#b5abfc]">
                              {SWAP_COPY.delta(
                                pureAlcoholMl(drink, defaultServing.id, null) - sourceEthanolMl
                              )}
                            </div>
                          )}
                        </div>
                      </button>;
                    })}
                  </div>
                </div>
              ))}
            </div>
            {omittedStronger > 0 && (
              <p className="px-0.5 pt-1 text-[13px] leading-[1.5] text-[#75798c]">
                {SWAP_COPY.hiddenNote(omittedStronger, swapCapMl)}
              </p>
            )}
          </div>
        ) : category ? (
          <CategoryScreen
            categoryLabel={category}
            drinks={venueDrinks}
            availableCategories={categories.map((entry) => entry.label)}
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            selectedId={selected?.drinkId ?? null}
            quantity={selected?.quantity ?? 1}
            servingId={selected?.servingId ?? ""}
            customMl={customMl}
            onSelect={handleSelect}
            onQuantityChange={(n) =>
              setSelected((current) => (current ? { ...current, quantity: n } : current))
            }
            onServingChange={(servingId) =>
              setSelected((current) => (current ? { ...current, servingId } : current))
            }
            onCustomMlChange={setCustomMl}
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
                <ChevronIcon />
              </button>
            )}
            <div className="flex flex-col gap-2.5">
              {visibleCategories.map((cat) => {
                const group = planGroups.get(cat.label);
                const picked = group?.entries ?? [];
                const open = !hiddenCategories.has(cat.label);
                const showPanel = planBuilt && picked.length > 0;
                return showPanel ? (
                  <div key={cat.label} className="overflow-hidden rounded-lg bg-card">
                    <div className="flex min-h-[72px] items-center gap-1.5 py-[14px] pl-[18px] pr-2">
                      <button
                        type="button"
                        onClick={() => openCategory(cat.label)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
                          {cat.label}
                        </div>
                        <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">
                          {planGroupSub(group)}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHidden(cat.label)}
                        className="flex min-h-14 flex-none items-center rounded-lg px-2 text-[19px] leading-none text-[#b5abfc] active:bg-[rgba(145,132,217,.10)]"
                      >
                        {PLAN_BUILT_COPY.toggle(open)}
                      </button>
                      <button
                        type="button"
                        aria-label={cat.label}
                        onClick={() => openCategory(cat.label)}
                        className="flex h-14 w-11 flex-none items-center justify-center"
                      >
                        <ChevronIcon />
                      </button>
                    </div>
                    {open && (
                      <div className="rounded-b-[14px] bg-[#1c1e2c] px-2 pb-0 pl-[18px]">
                        {picked.map(panelRow)}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => openCategory(cat.label)}
                    className="flex min-h-[72px] items-center justify-between gap-3 rounded-lg bg-card px-[18px] py-[14px] text-left"
                  >
                    <div>
                      <div className="text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
                        {cat.label}
                      </div>
                      <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">
                        {planBuilt
                          ? planGroupSub(group)
                          : PICKER_COPY.categorySub(cat.count, cat.minPrice)}
                      </div>
                    </div>
                    <ChevronIcon />
                  </button>
                );
              })}
              {(() => {
                const customGroup = planGroups.get(PICKER_COPY.customCategory.name);
                const customPicked = customGroup?.entries ?? [];
                const customPanelOpen = !hiddenCategories.has(PICKER_COPY.customCategory.name);
                const showCustomPanel = planBuilt && customPicked.length > 0;
                return showCustomPanel ? (
                  <div className="overflow-hidden rounded-lg bg-card">
                    <div className="flex min-h-[72px] items-center gap-1.5 py-[14px] pl-[18px] pr-2">
                      <button
                        type="button"
                        onClick={() => setCustomOpen(true)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
                          {PICKER_COPY.customCategory.name}
                        </div>
                        <div className="mt-0.5 text-[15px] leading-[1.3] text-muted-foreground">
                          {planGroupSub(customGroup)}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHidden(PICKER_COPY.customCategory.name)}
                        className="flex min-h-14 flex-none items-center rounded-lg px-2 text-[19px] leading-none text-[#b5abfc] active:bg-[rgba(145,132,217,.10)]"
                      >
                        {PLAN_BUILT_COPY.toggle(customPanelOpen)}
                      </button>
                      <button
                        type="button"
                        aria-label={PICKER_COPY.customCategory.name}
                        onClick={() => setCustomOpen(true)}
                        className="flex h-14 w-11 flex-none items-center justify-center"
                      >
                        <ChevronIcon />
                      </button>
                    </div>
                    {customPanelOpen && (
                      <div className="rounded-b-[14px] bg-[#1c1e2c] px-2 pb-0 pl-[18px]">
                        {customPicked.map(panelRow)}
                      </div>
                    )}
                  </div>
                ) : (
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
                    <ChevronIcon />
                  </button>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      <PickerTray
        targetMl={targetMl}
        committedMl={trayCommittedMl}
        committedCount={committedCount}
        pendingMl={trayPendingMl}
        pendingQuantity={swapMode ? 1 : (selected?.quantity ?? 0)}
        hasPending={swapMode ? swapHasPending : normalHasPending}
        onDone={onNext}
        onAdd={swapMode ? handleCommitSwap : handleAddSelected}
        addDisabled={swapMode ? !swapHasPending : overCeiling}
        actionLabel={swapMode ? SWAP_COPY.trayPrimary : undefined}
        traySub={
          swapMode
            ? targetMl != null
              ? SWAP_COPY.traySub(targetMl, sourceName)
              : undefined
            : planBuilt && !normalHasPending
              ? PLAN_BUILT_COPY.traySub(committedCount)
              : undefined
        }
        advice={trayAdvice}
      />
      <CustomDrinkSheet
        open={customOpen}
        onOpenChange={setCustomOpen}
        venueName={venue?.name ?? null}
        targetMl={targetMl}
        committedMl={committedMl}
        ceilingMl={targetMl != null ? targetMl * 1.2 : null}
        canSaveToAccount={hasAccount}
        savedDrinks={savedDrinks}
        onAdd={handleAddCustom}
      />
    </div>
  );
};

export default DrinksTab;
