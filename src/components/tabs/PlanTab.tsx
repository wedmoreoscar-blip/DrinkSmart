import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/AppContext";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useLastSession } from "@/hooks/useLastSession";
import { useToast } from "@/hooks/use-toast";
import { History, Loader2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBACForLevel } from "@/data/buzzLevels";
import {
  computeRemainingBudget,
  lockedDrinkEntries,
  lockedEthanolTotal,
  requestFingerprint,
  resolvePlanningWindow,
} from "@/lib/planGenerationContracts";
import DrinksTab from "./DrinksTab";
import MenuScannerTab from "./MenuScannerTab";
import { EstablishmentsScreen } from "@/components/establishments/EstablishmentsScreen";
import { planFlowReducer } from "./plan-navigation";
import {
  buildCatalog,
  computeTargetEthanolMl,
  generatePlan,
  generatedDrinkToEntry,
  type GeneratedPlan,
  type GeneratePlanInput,
  type GeneratePlanResult,
} from "@/lib/generatePlan";

const DEFAULT_DURATION_MINUTES = 180;
const MIN_DURATION = 60;
const MAX_DURATION = 480;
const DURATION_STEP = 30;
const PRELOAD_DEBOUNCE_MS = 300;
const VESSEL_TARGET_LINE_PCT = 78;
const ETHANOL_ML_PER_PINT = 19;

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
  } = useAppContext();
  const { preferences } = useUserMetrics();
  const { lastSession, upsertLastSession } = useLastSession();
  const { toast } = useToast();

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

  // AI generation state
  const [cachedPlan, setCachedPlan] = useState<GeneratePlanResult | null>(null);
  const [cachedRequestFingerprint, setCachedRequestFingerprint] = useState<string | null>(null);
  const requestFingerprintRef = useRef<string | null>(null);
  const [genState, setGenState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lastPlanIds, setLastPlanIds] = useState<string[]>([]);
  const [planBuilt, setPlanBuilt] = useState<boolean>(() =>
    state.drinks.some((d) => d.drink || (d.isCustom && d.customName))
  );
  const pickerRegionRef = useRef<HTMLDivElement | null>(null);

  const catalog = useMemo(() => buildCatalog(), []);

  useEffect(() => {
    if (state.drinks.some((drink) => drink.drink || (drink.isCustom && drink.customName))) {
      setPlanBuilt(true);
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

  const targetEthanolMl = useMemo(
    () => computeTargetEthanolMl(state.userMetrics, state.targetBAC, state.timeDelta),
    [state.userMetrics, state.targetBAC, state.timeDelta]
  );

  const lockedEntries = useMemo(
    () => lockedDrinkEntries(state.drinks, state.lockedDrinkIds, catalog),
    [state.drinks, state.lockedDrinkIds, catalog]
  );
  const lockedEthanolMl = useMemo(() => lockedEthanolTotal(lockedEntries), [lockedEntries]);

  const preloadRequest = useMemo<{ request: GeneratePlanInput; fingerprint: string } | null>(() => {
    if (!targetEthanolMl || !preferences) return null;
    const budget = computeRemainingBudget(targetEthanolMl, lockedEthanolMl);
    if (budget < 1) return null;
    const request: GeneratePlanInput = {
      target_ethanol_ml: budget,
      duration_minutes: duration,
      preferences,
      catalog,
      locked_drinks: lockedEntries,
      exclude: [],
    };
    return { request, fingerprint: requestFingerprint(request) };
  }, [targetEthanolMl, preferences, duration, catalog, lockedEntries, lockedEthanolMl]);

  // Debounced preload — fires whenever the request context changes. A cached
  // result is accepted only if its fingerprint still matches the current
  // request, so a superseded async response can never overwrite a newer one.
  useEffect(() => {
    requestFingerprintRef.current = preloadRequest?.fingerprint ?? null;
    if (!preloadRequest || !state.timeDelta) {
      setCachedPlan(null);
      setCachedRequestFingerprint(null);
      setGenState("idle");
      return;
    }

    const { request, fingerprint } = preloadRequest;
    const timer = setTimeout(async () => {
      setGenState("loading");
      try {
        // generatePlan never throws — it falls back to the greedy generator
        const plan = await generatePlan(request);
        if (fingerprint !== requestFingerprintRef.current) return;
        setCachedPlan(plan);
        setCachedRequestFingerprint(fingerprint);
        setGenState("ready");
      } catch (err) {
        if (fingerprint !== requestFingerprintRef.current) return;
        console.error("Preload generate-plan failed:", err);
        setGenState("error");
      }
    }, PRELOAD_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [preloadRequest, state.timeDelta]);

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
    const lockedEntries = state.drinks.filter((d) => state.lockedDrinkIds.includes(d.id));
    const generatedEntries = plan.drinks
      .map((g) => generatedDrinkToEntry(g, catalog))
      .filter((d): d is NonNullable<typeof d> => d !== null);
    const merged = [...lockedEntries, ...generatedEntries];
    const finalDrinks =
      merged.length === 0
        ? [{ id: "1", category: "", drink: "", quantity: "", unit: "ml" as const, isCustom: false }]
        : merged;
    updateDrinks(finalDrinks);
    setLastPlanIds(plan.drinks.map((d) => d.catalog_id));

    // Persist as the "last night" for next session
    if (finalDrinks.length > 0 && finalDrinks[0].drink !== "") {
      upsertLastSession({
        duration_minutes: duration,
        buzz_level: currentLevel,
        drinks: finalDrinks,
      });
    }

    // Stay on Plan: mark the curation region built and bring it into view
    // once React has rendered the applied list.
    setPlanBuilt(true);
    window.setTimeout(() => {
      pickerRegionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleUseLastNight = () => {
    if (!lastSession) return;
    const now = new Date();
    const restoredDuration = Math.min(
      MAX_DURATION,
      Math.max(MIN_DURATION, lastSession.duration_minutes)
    );
    setDuration(restoredDuration);
    updateInebriationLevel(Math.max(1, Math.min(lastSession.buzz_level, 7)));
    updateDrinkingStartTime(now);
    updateDrinkingTargetTime(new Date(now.getTime() + restoredDuration * 60_000));
    const restoredDrinks = lastSession.drinks.map((d) => ({
      ...d,
      id: crypto.randomUUID(),
    }));
    if (restoredDrinks.length > 0) {
      updateDrinks(restoredDrinks);
    }
    toast({
      title: "Last night restored",
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

  // One generation operation: `Build the night` before the first applied plan,
  // `Regenerate` afterwards. First generation may reuse the cached preload;
  // later generation excludes the last plan's drink ids.
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

    const budget = computeRemainingBudget(targetEthanolMl, lockedEthanolMl);
    const exclude = planBuilt ? lastPlanIds : [];
    const request: GeneratePlanInput = {
      target_ethanol_ml: budget,
      duration_minutes: duration,
      preferences,
      catalog,
      locked_drinks: lockedEntries,
      exclude,
    };
    const fingerprint = requestFingerprint(request);

    if (!planBuilt && cachedPlan && cachedRequestFingerprint === fingerprint && budget > 0) {
      applyPlan(cachedPlan);
      notifyIfFallback(cachedPlan.usedFallback);
      return;
    }

    if (budget <= 0) {
      setCachedPlan(null);
      setCachedRequestFingerprint(null);
      setGenState("idle");
      applyPlan({ drinks: [], notes: "" });
      return;
    }

    setGenState("loading");
    const plan = await generatePlan(request);
    setCachedPlan(plan);
    setCachedRequestFingerprint(fingerprint);
    applyPlan(plan);
    setGenState("ready");
    notifyIfFallback(plan.usedFallback);
    if (planBuilt && !plan.usedFallback) {
      toast({ title: "Fresh plan ready" });
    }
  };

  const generateButtonContent =
    genState === "loading" ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        Generating...
      </>
    ) : planBuilt ? (
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
      {/* Use last night — only when a prior session is persisted */}
      {lastSession && lastSession.drinks.length > 0 && (
        <Card className="p-4 flex items-center justify-between gap-3 bg-muted/30 border-primary/20 mb-[14px]">
          <div className="flex items-center gap-3 min-w-0">
            <History className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm">Repeat last night?</p>
              <p className="text-xs text-muted-foreground truncate">
                Buzz {Math.min(lastSession.buzz_level, 7)} · {formatDuration(lastSession.duration_minutes)} · {lastSession.drinks.length} drink{lastSession.drinks.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleUseLastNight}>
            Use last night
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
      <div className="text-center text-micro text-[#75798c]">the scale ends here</div>

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

      <div className="mt-auto flex items-center gap-4 rounded-[14px] bg-[#1c1e2c] py-[14px] px-[18px]">
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
        onSelect={(id) => dispatchFlow({ type: "select-venue", id })}
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
          onSaved={(id) => dispatchFlow({ type: "select-venue", id })}
          onTaskChange={(task) => dispatchFlow({ type: "scanner-task", task })}
        />
      </div>
    )}
    </>
  );
};

export default PlanTab;
