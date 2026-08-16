import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/AppContext";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { useToast } from "@/hooks/use-toast";
import { History, Loader2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBACForLevel } from "@/data/buzzLevels";
import {
  computeRegenerationBudget,
  lockedDrinkEntries,
  resolvePlanningWindow,
} from "@/lib/planGenerationContracts";
import { applyRegenerationToDrinks } from "@/lib/sessionEngine";
import { entryServingCount } from "@/components/picker/wave5-picker";
import { useEstablishments } from "@/hooks/useEstablishments";
import DrinksTab from "./DrinksTab";
import MenuScannerTab from "./MenuScannerTab";
import { EstablishmentsScreen } from "@/components/establishments/EstablishmentsScreen";
import { planFlowReducer } from "./plan-navigation";
import {
  computeTargetEthanolMl,
  generatePlan,
  generatedDrinkToEntry,
  type GeneratedPlan,
  type GeneratePlanInput,
} from "@/lib/generatePlan";
import { buildActiveVenueCatalog } from "@/lib/planCatalog";
import {
  budgetRangeToSlider,
  formatBudgetRange,
  isWideBudgetRange,
  sliderToBudgetRange,
  BUDGET_SLIDER_MAX_POUNDS,
  BUDGET_STEP_POUNDS,
} from "@/lib/budget";

const DEFAULT_DURATION_MINUTES = 180;
const MIN_DURATION = 60;
const MAX_DURATION = 480;
const DURATION_STEP = 30;
const VESSEL_TARGET_LINE_PCT = 78;
const ETHANOL_ML_PER_PINT = 19;
const PLAN_GENERATED_STORAGE_KEY = "drinksmart.planGenerated.v1";

const readPlanGenerated = (): boolean => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return false;
  try {
    return window.localStorage.getItem(PLAN_GENERATED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const persistPlanGenerated = (value: boolean): void => {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return;
  try {
    window.localStorage.setItem(PLAN_GENERATED_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Storage unavailable — the flag still applies for this session.
  }
};

const NUMBER_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];

type BuzzBand = {
  name: string;
  subtitle: string;
  minLevel: number;
  maxLevel: number;
};

const BUZZ_BANDS: BuzzBand[] = [
  { name: "Light", subtitle: "warm, unchanged", minLevel: 1, maxLevel: 2 },
  { name: "Social", subtitle: "talkative, still sharp", minLevel: 3, maxLevel: 4 },
  { name: "Loose", subtitle: "clumsy by the end", minLevel: 5, maxLevel: 6 },
  { name: "Heavy", subtitle: "gaps in the night", minLevel: 7, maxLevel: 7 },
];

type PlanTabProps = {
  onPlanReady: () => void;
  onFullScreenChange?: (fullScreen: boolean) => void;
  swapDrinkId?: string | null;
  onSwapComplete?: () => void;
};

function deriveDurationMinutes(start: Date | null, target: Date | null): number {
  if (!start || !target) return DEFAULT_DURATION_MINUTES;
  const startMin = start.getHours() * 60 + start.getMinutes();
  const targetMin = target.getHours() * 60 + target.getMinutes();
  const diff =
    targetMin <= startMin ? 24 * 60 - startMin + targetMin : targetMin - startMin;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, diff || DEFAULT_DURATION_MINUTES));
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatOverDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

function formatClock(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function bandRangeLabel(band: BuzzBand): string {
  const min = getBACForLevel(band.minLevel).min_bac;
  const max = getBACForLevel(band.maxLevel).max_bac;
  return `${min.toFixed(2)}–${max.toFixed(2)}%`;
}

const PlanTab = ({
  onPlanReady,
  onFullScreenChange,
  swapDrinkId,
  onSwapComplete,
}: PlanTabProps) => {
  const {
    state,
    updateInebriationLevel,
    updateDrinkingStartTime,
    updateDrinkingTargetTime,
    updateDrinks,
    updateBudget,
    loadSessionSnapshot,
  } = useAppContext();
  const { preferences } = useUserMetrics();
  const { lastSession } = useSessionHistory();
  const { toast } = useToast();
  const { activeVenue, activeVenueId, setActiveVenueId, getEstablishmentDrinks } =
    useEstablishments();

  const [duration, setDuration] = useState<number>(() =>
    deriveDurationMinutes(state.drinkingStartTime, state.drinkingTargetTime)
  );
  const [flow, dispatchFlow] = useReducer(planFlowReducer, {
    screen: "picker",
    selectedVenueId: null,
    scannerTask: "idle",
  });

  useEffect(() => {
    onFullScreenChange?.(flow.screen === "scanner");
    return () => onFullScreenChange?.(false);
  }, [flow.screen, onFullScreenChange]);

  // Keep the picker's selected venue in lock-step with the persisted active
  // venue, except while a menu scan is in flight. Wetherspoons (or the
  // resolved fallback) therefore shows HERE NOW and feeds the picker on
  // first use without a click.
  useEffect(() => {
    if (flow.screen !== "picker" || flow.scannerTask !== "idle") return;
    if (activeVenueId !== null && flow.selectedVenueId !== activeVenueId) {
      dispatchFlow({ type: "select-venue", id: activeVenueId });
    }
  }, [activeVenueId, flow.selectedVenueId, flow.screen, flow.scannerTask]);

  // AI generation state — generation is explicit only: opening or returning
  // to Plan never calls AI, applies a plan, or mutates drinks.
  const [genState, setGenState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lastPlanIds, setLastPlanIds] = useState<string[]>([]);
  const [planBuilt, setPlanBuilt] = useState<boolean>(() =>
    state.drinks.some((d) => d.drink || (d.isCustom && d.customName))
  );
  // Whether an explicit generation has actually succeeded, independently of
  // whether drinks exist: a fully manual plan stays `Build the night`.
  const [hasGenerated, setHasGenerated] = useState<boolean>(
    () =>
      state.drinks.some((drink) => drink.drink || (drink.isCustom && drink.customName)) &&
      readPlanGenerated(),
  );
  const pickerRegionRef = useRef<HTMLDivElement | null>(null);

  const venueDrinks = useMemo(
    () => (activeVenue ? getEstablishmentDrinks(activeVenue.id) : []),
    [activeVenue, getEstablishmentDrinks]
  );

  const catalog = useMemo(
    () => buildActiveVenueCatalog(activeVenue, venueDrinks),
    [venueDrinks, activeVenue],
  );

  useEffect(() => {
    const hasDrinks = state.drinks.some((drink) => drink.drink || (drink.isCustom && drink.customName));
    setPlanBuilt(hasDrinks);
    if (!hasDrinks) {
      setHasGenerated(false);
      persistPlanGenerated(false);
    }
  }, [state.drinks]);

  const currentLevel = Math.max(1, Math.min(state.inebriationLevel, 7));
  const currentBand =
    BUZZ_BANDS.find((b) => currentLevel >= b.minLevel && currentLevel <= b.maxLevel) ??
    BUZZ_BANDS[0];

  useEffect(() => {
    if (state.inebriationLevel > 7) {
      updateInebriationLevel(7);
    }
  }, [state.inebriationLevel, updateInebriationLevel]);

  // Default start time to "now" on first mount
  useEffect(() => {
    if (state.drinkingStartTime === null) {
      updateDrinkingStartTime(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute target time when start or duration changes
  useEffect(() => {
    if (!state.drinkingStartTime) return;
    const target = new Date(state.drinkingStartTime.getTime() + duration * 60_000);
    if (
      !state.drinkingTargetTime ||
      Math.abs(state.drinkingTargetTime.getTime() - target.getTime()) > 30_000
    ) {
      updateDrinkingTargetTime(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, state.drinkingStartTime]);

  const budgetSliderValue = useMemo(
    () => budgetRangeToSlider(state.budget),
    [state.budget],
  );

  const targetEthanolMl = useMemo(
    () => computeTargetEthanolMl(state.userMetrics, state.targetBAC, state.timeDelta),
    [state.userMetrics, state.targetBAC, state.timeDelta]
  );

  // The night's total: pricePerUnit × servings, present only when some plan
  // entry actually carries a price — never a guessed £0.
  const nightCost = useMemo(() => {
    let total = 0;
    let priced = false;
    for (const drink of state.drinks) {
      if (drink.pricePerUnit == null) continue;
      priced = true;
      total += drink.pricePerUnit * entryServingCount(drink);
    }
    return priced ? total : null;
  }, [state.drinks]);

  const lockedEntries = useMemo(
    () => lockedDrinkEntries(state.drinks, state.lockedDrinkIds, catalog),
    [state.drinks, state.lockedDrinkIds, catalog],
  );

  // Static target meter — the vessel shows the target level only. It must not
  // respond to the selected drinks.
  const vesselFillPct = VESSEL_TARGET_LINE_PCT;

  const targetNote = useMemo(() => {
    if (targetEthanolMl === null) return null;
    const pints = Math.max(1, Math.round(targetEthanolMl / ETHANOL_ML_PER_PINT));
    const word = NUMBER_WORDS[pints - 1] ?? String(pints);
    return `about ${word} ${pints === 1 ? "pint" : "pints"}, spread out`;
  }, [targetEthanolMl]);

  const applyPlan = (plan: GeneratedPlan) => {
    // Shared retention rule with Timeline "Re-plan the rest": consumed/past
    // source drinks and explicitly locked current/future source drinks
    // survive; every other current/future drink is replaceable.
    const protectedSourceIds = [
      ...state.lockedDrinkIds,
      ...state.consumedTimelineEntries.map((snapshot) => snapshot.sourceDrinkId),
    ];
    const generatedEntries = plan.drinks
      .map((g) => generatedDrinkToEntry(g, catalog))
      .filter((d): d is NonNullable<typeof d> => d !== null);
    const merged = applyRegenerationToDrinks(state.drinks, protectedSourceIds, generatedEntries);
    const finalDrinks =
      merged.length === 0
        ? [{ id: "1", category: "", drink: "", quantity: "", unit: "ml" as const, isCustom: false }]
        : merged;
    updateDrinks(finalDrinks);
    setLastPlanIds(plan.drinks.map((d) => d.catalog_id));
    setHasGenerated(true);
    persistPlanGenerated(true);

    // Stay on Plan: mark the curation region built and bring it into view
    // once React has rendered the applied list.
    setPlanBuilt(true);
    window.setTimeout(() => {
      pickerRegionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleUseLastSession = () => {
    if (!lastSession) return;
    const now = new Date();
    const restoredDuration = Math.min(
      MAX_DURATION,
      Math.max(MIN_DURATION, lastSession.duration_minutes)
    );
    // Keep this Plan's local duration in sync while it is already mounted;
    // the shared operation replaces the drinks and rebases the window.
    setDuration(restoredDuration);
    loadSessionSnapshot(lastSession, now);
    // A loaded snapshot is a fully manual draft: no AI call happened, so the
    // action stays `Build the night`.
    setHasGenerated(false);
    persistPlanGenerated(false);
    toast({
      title: "Last session loaded",
      description: "Same duration, drinks and buzz target. Tweak anything if you like.",
    });
  };

  const notifyIfFallback = (usedFallback: boolean) => {
    if (usedFallback) {
      toast({
        title: "Built offline",
        description: "AI planner unreachable — used a local plan instead.",
      });
    }
  };

  // One explicit generation operation: `Build the night` before any successful
  // generation, `Regenerate` afterwards. Opening or returning to Plan never
  // calls AI; only pressing this button does.
  const handleGenerate = async () => {
    const now = new Date();
    const resolved = resolvePlanningWindow(
      state.drinkingStartTime,
      state.drinkingTargetTime,
      duration,
      now
    );
    updateDrinkingStartTime(resolved.start);
    updateDrinkingTargetTime(resolved.target);

    if (!targetEthanolMl || !preferences) {
      toast({
        title: "Complete your profile first",
        description: "We need your stats to compute your alcohol target.",
        variant: "destructive",
      });
      return;
    }

    const budget = computeRegenerationBudget({
      targetEthanolMl,
      timeline: state.drinkTimeline,
      consumedSnapshots: state.consumedTimelineEntries,
      lockedDrinkIds: state.lockedDrinkIds,
      now,
    });
    const exclude = hasGenerated ? lastPlanIds : [];
    const request: GeneratePlanInput = {
      target_ethanol_ml: budget,
      duration_minutes: duration,
      preferences,
      catalog,
      locked_drinks: lockedEntries,
      exclude,
    };

    if (budget <= 0) {
      setGenState("idle");
      applyPlan({ drinks: [], notes: "" });
      return;
    }

    setGenState("loading");
    const plan = await generatePlan(request);
    setGenState("ready");
    applyPlan(plan);
    notifyIfFallback(plan.usedFallback);
    if (hasGenerated && !plan.usedFallback) {
      toast({ title: "Fresh plan ready" });
    }
  };

  const generateButtonContent =
    genState === "loading" ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        Generating...
      </>
    ) : hasGenerated ? (
      "Regenerate"
    ) : (
      "Build the night"
    );

  // W5-3/Dashboard integration boundary — forwarded to DrinksTab; no swap
  // logic lives here.
  const pickerBoundaryProps = {
    planBuilt,
    swapDrinkId,
    onSwapComplete,
  };

  return (
    <>
    <div className={cn("h-full px-5 pb-0 animate-in fade-in duration-500", flow.screen !== "picker" && "hidden")}>
      <div className="flex min-h-[calc(100%-14px)] flex-col pt-[22px]">
      {/* Use last session — only when a prior session is persisted */}
      {lastSession && lastSession.drinks.length > 0 && (
        <Card className="p-4 flex items-center justify-between gap-3 bg-muted/30 border-primary/20 mb-[14px]">
          <div className="flex items-center gap-3 min-w-0">
            <History className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm">Repeat last session?</p>
              <p className="text-xs text-muted-foreground truncate">
                Buzz {Math.min(lastSession.buzz_level, 7)} · {formatDuration(lastSession.duration_minutes)} · {lastSession.drinks.length} drink{lastSession.drinks.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleUseLastSession}>
            Use last session
          </Button>
        </Card>
      )}

      <div className="text-label font-medium uppercase text-muted-foreground mb-[14px]">
        Tonight
      </div>

      <div className="flex flex-col gap-[10px]">
        {BUZZ_BANDS.map((band) => {
          const isSelected =
            currentLevel >= band.minLevel && currentLevel <= band.maxLevel;
          return (
            <button
              key={band.name}
              type="button"
              onClick={() => updateInebriationLevel(band.minLevel)}
              className={cn(
                "min-h-[72px] rounded-[14px] bg-card px-[18px] py-[14px] flex items-center justify-between gap-3 text-left",
                isSelected && "shadow-[0_0_0_2px_#9184d9]"
              )}
            >
              <span>
                <span className="block text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
                  {band.name}
                </span>
                <span className="block mt-[2px] text-[15px] leading-[1.3] text-muted-foreground">
                  {band.subtitle}
                </span>
              </span>
              <span className="flex-none text-micro tabular-nums text-[#75798c]">
                {bandRangeLabel(band)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="h-px mt-[10px] mb-[8px]"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(233,233,237,.16) 48px, rgba(233,233,237,.16) calc(100% - 48px), transparent)",
        }}
      />

      {currentBand.maxLevel > currentBand.minLevel && (
        <div className="mt-[10px] flex gap-[10px]">
          <button
            type="button"
            onClick={() => updateInebriationLevel(currentBand.minLevel)}
            className={cn(
              "flex-1 min-h-[56px] rounded-[12px] bg-[#1c1e2c] flex items-center justify-center text-[19px] leading-none text-muted-foreground",
              currentLevel === currentBand.minLevel &&
                "shadow-[0_0_0_2px_#9184d9] text-foreground"
            )}
          >
            softer
          </button>
          <button
            type="button"
            onClick={() => updateInebriationLevel(currentBand.maxLevel)}
            className={cn(
              "flex-1 min-h-[56px] rounded-[12px] bg-[#1c1e2c] flex items-center justify-center text-[19px] leading-none text-muted-foreground",
              currentLevel === currentBand.maxLevel &&
                "shadow-[0_0_0_2px_#9184d9] text-foreground"
            )}
          >
            stronger
          </button>
        </div>
      )}

      <div className="mt-[14px] flex items-end justify-between gap-3">
        <div>
          <div className="text-label font-medium uppercase text-muted-foreground">Over</div>
          <div className="mt-[6px] text-display font-medium tabular-nums text-foreground">
            {formatOverDuration(duration)}
          </div>
          <div className="mt-[2px] text-body tabular-nums text-muted-foreground">
            {formatClock(state.drinkingStartTime)} → {formatClock(state.drinkingTargetTime)}
          </div>
        </div>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            aria-label="Shorter night"
            onClick={() => setDuration(Math.max(MIN_DURATION, duration - DURATION_STEP))}
            className="flex h-[56px] w-[56px] items-center justify-center rounded-[12px] shadow-[0_0_0_1px_#383a46]"
          >
            <Minus className="h-5 w-5 text-foreground" />
          </button>
          <button
            type="button"
            aria-label="Longer night"
            onClick={() => setDuration(Math.min(MAX_DURATION, duration + DURATION_STEP))}
            className="flex h-[56px] w-[56px] items-center justify-center rounded-[12px] shadow-[0_0_0_1px_#383a46]"
          >
            <Plus className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Budget — a property of tonight, beside duration and buzz. The top
          stop is "no limit", which is where a fresh session starts, so an
          untouched budget constrains nothing. Carries the `mt-auto` that used
          to sit on the target vessel, so the pair still bottoms out the column. */}
      <div className="mt-auto pt-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-label font-medium uppercase text-muted-foreground">Budget</span>
          <span className="text-[28px] font-medium leading-[1.1] tabular-nums text-foreground">
            {formatBudgetRange(state.budget)}
          </span>
        </div>
        <Slider
          className="mt-[10px]"
          value={budgetSliderValue}
          onValueChange={(value) => updateBudget(sliderToBudgetRange(value))}
          min={0}
          max={BUDGET_SLIDER_MAX_POUNDS}
          step={BUDGET_STEP_POUNDS}
        />
        <div className="mt-[6px] text-[15px] leading-[1.3] text-muted-foreground">
          {isWideBudgetRange(state.budget)
            ? "no limit either way — set a floor to keep the night off the cheapest shelf"
            : "the floor shapes what fills your target, never how much you drink"}
        </div>
      </div>

      <div className="mt-[18px] flex items-center gap-4 rounded-[14px] bg-[#1c1e2c] py-[14px] px-[18px]">
        <div className="relative h-[88px] w-[38px] flex-none overflow-hidden rounded-[12px] bg-[#161826] shadow-[0_0_0_1px_#383a46]">
          <div
            className="absolute inset-x-0 bottom-0 bg-primary opacity-[0.85]"
            style={{
              height: `${vesselFillPct}%`,
              transition: "var(--transition-liquid)",
            }}
          />
          <div
            className="absolute inset-x-0 h-px bg-foreground"
            style={{ bottom: `${VESSEL_TARGET_LINE_PCT}%` }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
            Target
          </div>
          <div className="mt-[6px] flex items-baseline gap-[6px]">
            <span className="text-[28px] font-medium leading-[1.1] tabular-nums text-foreground">
              {targetEthanolMl !== null ? targetEthanolMl.toFixed(1) : "—"}
            </span>
            <span className="text-[19px] leading-none text-muted-foreground">ml</span>
          </div>
          {targetNote && (
            <div className="mt-[4px] text-[15px] leading-[1.3] text-muted-foreground">
              {targetNote}
            </div>
          )}
        </div>
        {nightCost != null && (
          <div className="flex-none text-right">
            <div className="text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
              Total
            </div>
            <div className="mt-[6px] text-[28px] font-medium leading-[1.1] tabular-nums text-foreground">
              £{nightCost.toFixed(2)}
            </div>
          </div>
        )}
      </div>

        <div className="mt-3 flex items-center gap-3">
          <Button
            size="tap"
            variant="outline"
            className="min-w-0 flex-1 gap-2 text-[19px] leading-[1.3]"
            onClick={handleGenerate}
            disabled={genState === "loading"}
          >
            {generateButtonContent}
          </Button>
          {planBuilt && (
            <span className="max-w-[132px] text-micro leading-[1.35] text-muted-foreground">
              re-rolls only what is not locked
            </span>
          )}
        </div>

      </div>

      {genState === "error" && (
        <Alert className="mt-3">
          <AlertDescription>
            Couldn't reach the AI planner. You can still pick drinks manually below.
          </AlertDescription>
        </Alert>
      )}

      {/* Drink picker — keep existing DrinksTab embedded */}
      <div ref={pickerRegionRef} className="mt-6">
        <DrinksTab
          onNext={onPlanReady}
          onOpenVenues={() => dispatchFlow({ type: "open-venues" })}
          selectedVenueId={flow.selectedVenueId}
          {...pickerBoundaryProps}
        />
      </div>
    </div>
    <div className={cn("h-full", flow.screen !== "establishments" && "hidden")}>
      <EstablishmentsScreen
        selectedId={flow.selectedVenueId}
        onSelect={(id) => {
          setActiveVenueId(id);
          dispatchFlow({ type: "select-venue", id });
        }}
        onScanMenu={() => dispatchFlow({ type: "open-scanner" })}
        onBack={() => dispatchFlow({ type: "keep-planning" })}
      />
    </div>
    {(flow.screen === "scanner" || flow.scannerTask !== "idle") && (
      <div className={cn("h-full", flow.screen !== "scanner" && "hidden")}>
        <MenuScannerTab
          onNext={() => dispatchFlow({ type: "finish-scanner" })}
          onClose={() => dispatchFlow({ type: "back-to-venues" })}
          onLeave={() => dispatchFlow({ type: "keep-planning" })}
          onReviewReady={() => dispatchFlow({ type: "check-scan" })}
          onSaved={(id) => {
            setActiveVenueId(id);
            dispatchFlow({ type: "select-venue", id });
          }}
          onTaskChange={(task) => dispatchFlow({ type: "scanner-task", task })}
        />
      </div>
    )}
    </>
  );
};

export default PlanTab;
