import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import type { AlcoholTimelineEntryInput } from "@/lib/sessionEngine";
import { getWeightInKg, getHeightInCm, getTBWGrams } from "@/lib/unitConversions";
import { useEstablishments, type EstablishmentDrink } from "@/hooks/useEstablishments";
import { useSavedDrinks } from "@/hooks/useSavedDrinks";
import { useDrinkOverrides } from "@/hooks/useDrinkOverrides";
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
  pickerScreenCategoryFor,
} from "@/components/picker/picker-copy";
import { sumPrices } from "@/lib/basePricing";
import { uuid } from "@/lib/uuid";
import {
  defaultServingFor,
  pureAlcoholMl,
  servingMl,
  servingOptionsFor,
  servingPrice,
} from "@/components/picker/picker-model";
import {
  isSamePlannedDrink,
  mergePlanDuplicates,
  perServingMl,
  withServings,
} from "@/lib/planMerge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

function filterActionablePlanEntries<T extends { id: string }>(
  entries: T[],
  consumedSourceIds: ReadonlySet<string>,
): T[] {
  return entries.filter((entry) => !consumedSourceIds.has(entry.id));
}

/**
 * The category a pick from this venue row is recorded under. A custom drink kept
 * on the venue is picked from Cocktails, so it groups under Cocktails; the same
 * drink added through the Custom drink sheet carries isCustom and groups under
 * Custom drink.
 */
function plannedCategoryFor(drink: EstablishmentDrink): string {
  return pickerCategoryFor(drink.category, drink.category_label) === null
    ? pickerScreenCategoryFor(drink.category, drink.category_label)
    : drink.category;
}

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
  const { setOverride, setDrinkPrice } = useDrinkOverrides();

  const drinks = state.drinks;

  const [category, setCategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<DrinkFilters>({
    abvRange: { min: 0, max: 100 },
    selectedCategories: [],
  });
  const [sort, setSort] = useState<string>(CATEGORY_COPY.sort[0]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [customMl, setCustomMl] = useState<number | null>(null);
  // A price being typed, before it is committed on blur. Held here so the tray
  // can show the running money as it is typed rather than at the moment of
  // adding — pressing Add is what blurs the field, so waiting for the commit
  // made the figure appear exactly when it was too late to be useful.
  const [priceDraft, setPriceDraft] = useState<{ volumeMl: number; price: number } | null>(null);
  // Drinks added but not yet applied. `Add` fills this basket; `Apply` commits
  // it to the plan. Deliberately component state and not the session store: a
  // basket is a half-finished choice, and a reload continues the night rather
  // than the choosing.
  const [staged, setStaged] = useState<AlcoholTimelineEntryInput[]>([]);
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
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
      // Screen placement, not plan grouping: a custom drink kept on this venue
      // counts toward its Cocktails card, the tab it is selectable from.
      const label = pickerScreenCategoryFor(drink.category, drink.category_label);
      const entry = map.get(label) ?? { count: 0, minPrice: null };
      entry.count += 1;
      // The cheapest serving on offer, resolved from rungs like everywhere
      // else. Reading `drink.price` here showed the catalogue figure and never
      // the user's own, so a venue the user had priced still read as unpriced.
      const cheapest = servingPrice(drink, defaultServingFor(drink).id, null);
      if (cheapest != null) {
        entry.minPrice = entry.minPrice == null ? cheapest : Math.min(entry.minPrice, cheapest);
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
    () => filterActionablePlanEntries(planEntries, consumedSourceIds),
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

  // Running plan cost: pricePerUnit × servings, present only when some entry
  // actually carries a price — never a guessed £0.
  const committedCost = useMemo(
    () =>
      sumPrices(
        planEntries.map((entry) =>
          entry.pricePerUnit == null ? null : entry.pricePerUnit * entryServingCount(entry),
        ),
      ),
    [planEntries],
  );

  // The tray reads plan + basket everywhere, so the figure on screen is always
  // what the plan would hold if it were applied right now.
  const stagedMl = useMemo(
    () => staged.reduce((total, entry) => total + entryEthanolMl(entry, entryAbv(entry)), 0),
    [staged, entryAbv],
  );
  const stagedCount = staged.reduce((total, entry) => total + entryServingCount(entry), 0);
  const stagedCost = useMemo(
    () =>
      sumPrices(
        staged.map((entry) =>
          entry.pricePerUnit == null ? null : entry.pricePerUnit * entryServingCount(entry),
        ),
      ),
    [staged],
  );

  const plannedPlusStagedMl = committedMl + stagedMl;
  const plannedPlusStagedCost = useMemo(
    () => sumPrices([committedCost, stagedCost]),
    [committedCost, stagedCost],
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

  // The pending selection counts toward the tray's running total. Without it
  // the figure sat still while the user pressed `+`, because it summed only
  // committed entries — and "each press of + raises the tray by one base unit
  // price" is the rule that makes a per-unit price legible in the first place.
  const pendingCost = useMemo(() => {
    if (!selected || !selectedDrink) return null;
    const selectedMl = servingMl(selectedDrink, selected.servingId, customMl);
    // A price still being typed wins over the stored one, but only for the
    // serving it is being typed against.
    const draft =
      priceDraft != null && selectedMl != null && Math.abs(priceDraft.volumeMl - selectedMl) < 0.01
        ? priceDraft.price
        : null;
    const unit = draft ?? servingPrice(selectedDrink, selected.servingId, customMl);
    return unit == null ? null : unit * selected.quantity;
  }, [selected, selectedDrink, customMl, priceDraft]);

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
      const label = pickerScreenCategoryFor(drink.category, drink.category_label);
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
      venueDrinks.filter(
        (drink) => pureAlcoholMl(drink, defaultServingFor(drink).id, null) > swapCapMl,
      ).length,
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
      // Anything outside the fixed picker categories belongs in the explicit
      // "Custom drink" panel. Dropping it instead leaves a real plan entry
      // rendered in no panel at all — still counted in ethanol, BAC, the tray
      // and the timeline, but with no lock or delete control anywhere.
      // A drink kept via "keep it" is stored as category "custom", which
      // pickerCategoryFor maps to null, and handleAddSelected does not set
      // isCustom, so re-picking one lands exactly here.
      const label = entry.isCustom
        ? PICKER_COPY.customCategory.name
        : (pickerCategoryFor(entry.category, null) ?? PICKER_COPY.customCategory.name);
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

  /** The planned entry a new pick should fold into, per the merge rules. */
  /** Commit the basket to the plan. This is the only path from Add to the plan. */
  const applyStaged = useCallback(() => {
    if (staged.length === 0) return;
    let next = drinks;
    for (const entry of staged) {
      const match = next.find(
        (candidate) =>
          !consumedSourceIds.has(candidate.id) && isSamePlannedDrink(candidate, entry),
      );
      next = match
        ? next.map((candidate) =>
            candidate.id === match.id
              ? withServings(
                  candidate,
                  entryServingCount(candidate) + entryServingCount(entry),
                )
              : candidate,
          )
        : [...next, entry];
    }
    updateDrinks(next);
    setStaged([]);
  }, [staged, drinks, consumedSourceIds, updateDrinks]);

  const mergeTargetFor = (candidate: AlcoholTimelineEntryInput): AlcoholTimelineEntryInput | null =>
    unconsumedEntries.find((entry) => isSamePlannedDrink(entry, candidate)) ?? null;

  const addServingsToEntry = (entry: AlcoholTimelineEntryInput, extraServings: number) => {
    updateDrinks(
      drinks.map((candidate) =>
        candidate.id === entry.id
          ? withServings(candidate, entryServingCount(candidate) + extraServings)
          : candidate,
      ),
    );
  };

  /**
   * Venue rows that already have a planned entry, so the category tab opens
   * showing what is in the plan instead of a fresh, empty pick. Matched on name
   * and category; the entry's own per-serving volume selects which serving
   * button reads as active, falling back to Custom for a volume no fixed option
   * offers.
   */

  /**
   * Step a planned entry by one of its own servings. The per-serving volume is
   * whatever the entry was committed with — a custom drink's saved serve, or a
   * venue row's chosen serving — so one tap is always one more of that drink,
   * never a category default. Editing here never touches the saved drink.
   */
  const handleStepDrink = (entry: AlcoholTimelineEntryInput, delta: number) => {
    if (consumedSourceIds.has(entry.id)) return;
    const total = parseFloat(entry.quantity ?? "");
    if (!Number.isFinite(total) || total <= 0) return;
    const servings = entryServingCount(entry);
    if (servings <= 0) return;
    const perServing = total / servings;
    const nextServings = servings + delta;
    if (nextServings < 1) return;
    if (delta > 0 && targetMl != null) {
      const nextEthanol = entryEthanolMl(
        { ...entry, quantity: String(perServing * nextServings) },
        entryAbv(entry),
      );
      const withoutEntry = committedMl - entryEthanolMl(entry, entryAbv(entry));
      if (withoutEntry + nextEthanol > targetMl * 1.2) return;
    }
    updateDrinks(
      drinks.map((candidate) =>
        candidate.id === entry.id
          ? {
              ...candidate,
              quantity: String(perServing * nextServings),
              portions: nextServings > 1 ? nextServings : undefined,
            }
          : candidate,
      ),
    );
  };

  // ---- Add/ceiling ----------------------------------------------------------

  // The basket counts toward the bound. Blocking Add is the strong form of
  // the rule: if it cannot be added it can never be applied.
  const overCeiling = targetMl != null && plannedPlusStagedMl + pendingMl > targetMl * 1.2;

  const handleSelect = (drinkId: string) => {
    const drink = venueDrinks.find((d) => d.id === drinkId);
    if (!drink) return;
    // A half-typed price belongs to the row it was typed in, and to nothing
    // else.
    setPriceDraft(null);
    // A remembered serve opens the row as the user left it: Custom already
    // selected and the box pre-filled with their serve.
    if (drink.rememberedServingMl != null) {
      setSelected({ drinkId, quantity: 1, servingId: "custom" });
      setCustomMl(drink.rememberedServingMl);
      return;
    }
    setSelected({ drinkId, quantity: 1, servingId: defaultServingFor(drink).id });
    setCustomMl(null);
  };

  const handleAddSelected = () => {
    if (!selectedDrink || !selected) return;
    if (selectedServingMl == null) return;
    if (targetMl != null && plannedPlusStagedMl + pendingMl > targetMl * 1.2) return;
    // Committing a custom ml remembers that serve for the venue drink, so the
    // next session opens this row on Custom at the same volume. A fixed rung
    // or the sheet's per-entry Serve field never writes an override.
    if (selected.servingId === "custom" && customMl != null) {
      void setOverride(selectedDrink.id, { serving_ml: customMl });
    }
    const category = plannedCategoryFor(selectedDrink);
    const entry: AlcoholTimelineEntryInput = {
      id: uuid(),
      category,
      drink: selectedDrink.drink_name,
      customABV: selectedDrink.abv == null ? undefined : String(selectedDrink.abv),
      quantity: String(selectedServingMl * selected.quantity),
      unit: "ml",
      pricePerUnit: servingPrice(selectedDrink, selected.servingId, customMl),
      portions: selected.quantity > 1 ? selected.quantity : undefined,
    };
    // Picking a drink already in the plan at the same serving adds to it rather
    // than opening a second identical card.
    // Add fills the basket; only Apply reaches the plan.
    setStaged((current) => {
      const match = current.findIndex((candidate) => isSamePlannedDrink(candidate, entry));
      if (match === -1) return [...current, entry];
      const next = current.slice();
      next[match] = withServings(next[match], entryServingCount(next[match]) + selected.quantity);
      return next;
    });
    setSelected(null);
    setCustomMl(null);
    setPriceDraft(null);
  };

  /** Save a custom drink to the venue and the account, per the draft's boxes. */
  const persistCustomDrink = async (draft: CustomDrinkDraft) => {
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
    // Keeping a drink on a venue saves it to the account too: the venue copy and
    // the account copy are the same drink, so "both" is the same as "keep it".
    if (
      (draft.saveToAccount || draft.keepIt) &&
      draft.abv != null &&
      draft.serve != null &&
      hasAccount
    ) {
      await saveDrink({
        drinkName: draft.name,
        abv: draft.abv,
        servingMl: draft.serve,
        price: draft.price,
      });
    }
  };

  const handleAddCustom = async (draft: CustomDrinkDraft) => {
    const servings = Math.max(1, draft.quantity);
    const customMl = (((draft.serve ?? 0) * servings) * (draft.abv ?? 0)) / 100;
    if (targetMl != null && committedMl + customMl > targetMl * 1.2) return;
    const entry: AlcoholTimelineEntryInput = {
      id: uuid(),
      category: "Cocktails",
      drink: "",
      isCustom: true,
      customName: draft.name,
      customABV: String(draft.abv),
      quantity: String((draft.serve ?? 0) * servings),
      unit: "ml",
      pricePerUnit: draft.price,
      portions: servings > 1 ? servings : undefined,
    };
    // Adding the same custom drink again folds into the card already there; a
    // pick from a category tab stays separate, being a different origin.
    const existing = mergeTargetFor(entry);
    if (existing) addServingsToEntry(existing, servings);
    else addUnplannedDrink(entry);
    await persistCustomDrink(draft);
    setCustomOpen(false);
  };

  // ---- Tray ----------------------------------------------------------------

  const trayCommittedMl = swapMode ? swapCommittedMl : plannedPlusStagedMl;
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
        aria-label="One fewer"
        disabled={entryServingCount(entry) <= 1}
        onClick={() => handleStepDrink(entry, -1)}
        className="flex h-14 w-11 flex-none items-center justify-center text-[24px] leading-none text-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        −
      </button>
      <button
        type="button"
        aria-label="One more"
        onClick={() => handleStepDrink(entry, 1)}
        className="flex h-14 w-11 flex-none items-center justify-center text-[24px] leading-none text-foreground"
      >
        +
      </button>
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
            // Switching serving carries nothing over. Each option is priced and
            // measured on its own, so a custom ml typed against one must not
            // survive into another — that carryover put a double's 50 ml and
            // its price into the Custom box.
            onServingChange={(servingId) => {
              setCustomMl(null);
              setPriceDraft(null);
              setSelected((current) => (current ? { ...current, servingId } : current));
            }}
            onCustomMlChange={setCustomMl}
            // A price belongs to the volume it was typed against, so the row
            // reports that volume and it is stored as a rung of its own. It is
            // never folded into the drink's single price, which is what let a
            // remembered serve redefine what every stored price meant.
            onPriceCommit={(drinkId, price, volumeMl) => {
              setPriceDraft(null);
              if (volumeMl == null) return;
              void setDrinkPrice(drinkId, volumeMl, price);
            }}
            onPriceDraftChange={(drinkId, price, volumeMl) => {
              if (drinkId !== selected?.drinkId || volumeMl == null || price == null) {
                setPriceDraft(null);
                return;
              }
              setPriceDraft({ volumeMl, price });
            }}
            // Leaving with a basket is destructive and cannot be undone, so it
            // asks first — the same shape as the stats-change confirmation.
            onBack={() => {
              if (staged.length > 0) {
                setLeaveWarningOpen(true);
                return;
              }
              setCategory(null);
            }}
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
        committedCount={committedCount + stagedCount}
        pendingMl={trayPendingMl}
        pendingQuantity={swapMode ? 1 : (selected?.quantity ?? 0)}
        hasPending={swapMode ? swapHasPending : normalHasPending}
        cost={swapMode ? committedCost : plannedPlusStagedCost}
        pendingCost={swapMode ? null : pendingCost}
        // Inside a category the idle action returns to the plan; only the plan
        // root finishes the night. `Done` there took the user to the Timeline
        // mid-selection, when they had pressed it expecting to go back and add
        // more drinks.
        // Inside a category the idle action is Apply: it commits the basket and
        // returns to the plan root. At the plan root it finishes the night.
        onDone={
          !swapMode && category !== null
            ? () => {
                applyStaged();
                setCategory(null);
              }
            : onNext
        }
        onAdd={swapMode ? handleCommitSwap : handleAddSelected}
        addDisabled={swapMode ? !swapHasPending : overCeiling}
        actionLabel={
          swapMode
            ? SWAP_COPY.trayPrimary
            : category !== null && !normalHasPending
              ? PICKER_COPY.trayApply
              : undefined
        }
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
      <AlertDialog open={leaveWarningOpen} onOpenChange={setLeaveWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {stagedCount === 1
                ? "You have added a drink but not applied it. If you don't apply, it will be lost."
                : `You have added ${stagedCount} drinks but not applied them. If you don't apply, they will be lost.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Continue leaves without applying; the basket is dropped. */}
            <AlertDialogCancel
              onClick={() => {
                setStaged([]);
                setLeaveWarningOpen(false);
                setCategory(null);
              }}
            >
              Continue
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                applyStaged();
                setLeaveWarningOpen(false);
                setCategory(null);
              }}
            >
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
