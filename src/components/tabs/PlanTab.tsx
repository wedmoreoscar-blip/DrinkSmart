import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppContext } from "@/contexts/AppContext";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { useLastSession } from "@/hooks/useLastSession";
import { useToast } from "@/hooks/use-toast";
import { Clock, Sparkles, ScanLine, RefreshCw, Loader2, History } from "lucide-react";
import { buzzLevels } from "@/data/buzzLevels";
import DrinksTab from "./DrinksTab";
import MenuScannerTab from "./MenuScannerTab";
import {
  buildCatalog,
  computeTargetEthanolMl,
  generatePlan,
  generatedDrinkToEntry,
  type GeneratedPlan,
  type GeneratePlanResult,
  type LockedDrink,
} from "@/lib/generatePlan";

const DEFAULT_DURATION_MINUTES = 180;
const MIN_DURATION = 30;
const MAX_DURATION = 480;
const DURATION_STEP = 15;
const PRELOAD_DEBOUNCE_MS = 300;

type PlanTabProps = {
  onPlanReady: () => void;
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

function formatClock(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

const PlanTab = ({ onPlanReady }: PlanTabProps) => {
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
  const [scannerOpen, setScannerOpen] = useState(false);

  // AI generation state
  const [cachedPlan, setCachedPlan] = useState<GeneratePlanResult | null>(null);
  const [genState, setGenState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lastPlanIds, setLastPlanIds] = useState<string[]>([]);

  const catalog = useMemo(() => buildCatalog(), []);

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

  // Locked drinks contribution — used to shrink the budget given to the AI.
  // In Checkpoint 2.3 lock toggles get wired; for now lockedDrinkIds is empty.
  const lockedContribution = useMemo<{ ethanolMl: number; entries: LockedDrink[] }>(() => {
    if (state.lockedDrinkIds.length === 0) return { ethanolMl: 0, entries: [] };
    let ethanolMl = 0;
    const entries: LockedDrink[] = [];
    state.drinks.forEach((d) => {
      if (!state.lockedDrinkIds.includes(d.id)) return;
      const abv = d.customABV ? parseFloat(d.customABV) : 0;
      const qty = parseFloat(d.quantity);
      if (!Number.isFinite(qty) || !Number.isFinite(abv)) return;
      const ml =
        d.unit === "ml" || d.unit === "oz"
          ? qty
          : d.unit === "shots"
            ? qty * 25
            : d.unit === "pints"
              ? qty * 568
              : qty * 175;
      const ethanol = ml * (abv / 100);
      ethanolMl += ethanol;
      const catalogId =
        catalog.find((c) => c.name === d.drink)?.id ?? `${d.category}::${d.drink}`;
      entries.push({
        catalog_id: catalogId,
        quantity: qty,
        unit: d.unit,
        ethanol_ml: ethanol,
      });
    });
    return { ethanolMl, entries };
  }, [state.drinks, state.lockedDrinkIds, catalog]);

  // Debounced preload — fires whenever the inputs that affect the budget change.
  useEffect(() => {
    if (
      !targetEthanolMl ||
      !state.timeDelta ||
      !preferences ||
      state.inebriationLevel >= 9
    ) {
      setCachedPlan(null);
      setGenState("idle");
      return;
    }

    const remainingBudget = Math.max(0, targetEthanolMl - lockedContribution.ethanolMl);
    if (remainingBudget < 1) {
      setCachedPlan(null);
      setGenState("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setGenState("loading");
      try {
        // generatePlan never throws — it falls back to the greedy generator
        const plan = await generatePlan({
          target_ethanol_ml: remainingBudget,
          duration_minutes: duration,
          preferences,
          catalog,
          locked_drinks: lockedContribution.entries,
          exclude: [],
        });
        setCachedPlan(plan);
        setGenState("ready");
      } catch (err) {
        console.error("Preload generate-plan failed:", err);
        setGenState("error");
      }
    }, PRELOAD_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    targetEthanolMl,
    duration,
    preferences,
    catalog,
    lockedContribution.ethanolMl,
    state.timeDelta,
    state.inebriationLevel,
  ]);

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
        buzz_level: state.inebriationLevel,
        drinks: finalDrinks,
      });
    }
  };

  const handleUseLastNight = () => {
    if (!lastSession) return;
    const now = new Date();
    const restoredDuration = Math.min(
      MAX_DURATION,
      Math.max(MIN_DURATION, lastSession.duration_minutes)
    );
    setDuration(restoredDuration);
    updateInebriationLevel(lastSession.buzz_level);
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

  const handleGenerate = async () => {
    if (cachedPlan) {
      applyPlan(cachedPlan);
      notifyIfFallback(cachedPlan.usedFallback);
      onPlanReady();
      return;
    }
    if (!targetEthanolMl || !preferences) {
      toast({
        title: "Complete your profile first",
        description: "We need your stats to compute your alcohol target.",
        variant: "destructive",
      });
      return;
    }
    setGenState("loading");
    const remainingBudget = Math.max(0, targetEthanolMl - lockedContribution.ethanolMl);
    const plan = await generatePlan({
      target_ethanol_ml: remainingBudget,
      duration_minutes: duration,
      preferences,
      catalog,
      locked_drinks: lockedContribution.entries,
      exclude: [],
    });
    setCachedPlan(plan);
    applyPlan(plan);
    setGenState("ready");
    notifyIfFallback(plan.usedFallback);
    onPlanReady();
  };

  const handleRegenerate = async () => {
    if (!targetEthanolMl || !preferences) return;
    setGenState("loading");
    const remainingBudget = Math.max(0, targetEthanolMl - lockedContribution.ethanolMl);
    const plan = await generatePlan({
      target_ethanol_ml: remainingBudget,
      duration_minutes: duration,
      preferences,
      catalog,
      locked_drinks: lockedContribution.entries,
      exclude: lastPlanIds,
    });
    setCachedPlan(plan);
    applyPlan(plan);
    setGenState("ready");
    notifyIfFallback(plan.usedFallback);
    if (!plan.usedFallback) {
      toast({ title: "Fresh plan ready" });
    }
  };

  const currentBuzz = buzzLevels[state.inebriationLevel - 1];

  const buzzTextColor = useMemo(() => {
    if (state.inebriationLevel <= 3) return "text-green-600 dark:text-green-400";
    if (state.inebriationLevel <= 6) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  }, [state.inebriationLevel]);

  const buzzGradient = useMemo(() => {
    if (state.inebriationLevel <= 3) return "from-green-500 to-yellow-500";
    if (state.inebriationLevel <= 6) return "from-yellow-500 to-orange-500";
    return "from-orange-500 to-red-500";
  }, [state.inebriationLevel]);

  const setStartNow = () => updateDrinkingStartTime(new Date());

  const rapidConsumptionWarning =
    duration <= 30 && state.inebriationLevel > 4
      ? `Reaching buzz level ${state.inebriationLevel} in ${duration} minutes can be dangerous. Consider a longer session.`
      : null;

  const generateButtonContent = (() => {
    if (genState === "loading") {
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      );
    }
    if (genState === "ready" && cachedPlan) {
      return (
        <>
          <Sparkles className="w-4 h-4" />
          Use suggested plan
        </>
      );
    }
    return (
      <>
        <Sparkles className="w-4 h-4" />
        Generate plan
      </>
    );
  })();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Use last night — only when a prior session is persisted */}
      {lastSession && lastSession.drinks.length > 0 && (
        <Card className="p-4 flex items-center justify-between gap-3 bg-muted/30 border-primary/20">
          <div className="flex items-center gap-3 min-w-0">
            <History className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm">Repeat last night?</p>
              <p className="text-xs text-muted-foreground truncate">
                Buzz {lastSession.buzz_level} · {formatDuration(lastSession.duration_minutes)} · {lastSession.drinks.length} drink{lastSession.drinks.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleUseLastNight}>
            Use last night
          </Button>
        </Card>
      )}

      {/* Buzz */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className={`text-7xl md:text-8xl font-bold font-mono transition-colors ${buzzTextColor}`}>
            {state.inebriationLevel}
          </div>
          <h3 className={`text-xl md:text-2xl font-semibold ${buzzTextColor}`}>
            {currentBuzz?.label}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {currentBuzz?.desc}
          </p>
        </div>

        <div className="space-y-3 px-2">
          <div className="relative">
            <div className={`absolute inset-0 h-3 rounded-full bg-gradient-to-r ${buzzGradient} opacity-20 blur-sm`} />
            <Slider
              value={[state.inebriationLevel]}
              onValueChange={([v]) => updateInebriationLevel(v)}
              min={1}
              max={10}
              step={1}
              className="relative"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* Timing */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold">Timing</h3>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Starting</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{formatClock(state.drinkingStartTime)}</span>
            <Button variant="ghost" size="sm" onClick={setStartNow} className="h-7 px-2">
              Now
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="font-mono font-semibold">{formatDuration(duration)}</span>
          </div>
          <Slider
            value={[duration]}
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={DURATION_STEP}
            onValueChange={([v]) => setDuration(v)}
          />
          <div className="flex gap-2">
            {[60, 120, 180, 240, 360].map((m) => (
              <Button
                key={m}
                variant={duration === m ? "default" : "outline"}
                size="sm"
                onClick={() => setDuration(m)}
                className="flex-1 h-7 text-xs"
              >
                {formatDuration(m)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Finishing</span>
          <span className="font-mono font-semibold">{formatClock(state.drinkingTargetTime)}</span>
        </div>

        {rapidConsumptionWarning && (
          <Alert>
            <AlertDescription>⚠️ {rapidConsumptionWarning}</AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Action row */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="lg"
          className="flex-1 min-w-[200px] gap-2"
          onClick={handleGenerate}
          disabled={state.inebriationLevel >= 9 || genState === "loading"}
        >
          {generateButtonContent}
        </Button>
        {(genState === "ready" || lastPlanIds.length > 0) && (
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={handleRegenerate}
            disabled={genState === "loading"}
          >
            <RefreshCw className={`w-4 h-4 ${genState === "loading" ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
        )}
        <Sheet open={scannerOpen} onOpenChange={setScannerOpen}>
          <SheetTrigger asChild>
            <Button size="lg" variant="outline" className="gap-2">
              <ScanLine className="w-4 h-4" />
              Scan menu
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Scan a drinks menu</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <MenuScannerTab onNext={() => setScannerOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {genState === "error" && (
        <Alert>
          <AlertDescription>
            Couldn't reach the AI planner. You can still pick drinks manually below.
          </AlertDescription>
        </Alert>
      )}

      {/* Drink picker — keep existing DrinksTab embedded */}
      <DrinksTab onNext={onPlanReady} />
    </div>
  );
};

export default PlanTab;
