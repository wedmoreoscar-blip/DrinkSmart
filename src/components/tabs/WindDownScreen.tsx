import { useEffect } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { clockDayNote } from "@/lib/clockDay";
import { deriveWindDownSummary } from "@/lib/sessionEngine";

type WindDownScreenProps = {
  currentTime: Date;
  onNext?: () => void;
};

const formatClock = (date: Date) =>
  date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

const WindDownScreen = ({ currentTime, onNext }: WindDownScreenProps) => {
  const { state } = useAppContext();

  useEffect(() => {
    const tabBar = document.querySelector<HTMLElement>("[data-wind-down-tab-bar]");
    if (!tabBar) return;

    const previousDisplay = tabBar.style.display;
    tabBar.style.display = "none";

    return () => {
      tabBar.style.display = previousDisplay;
    };
  }, []);

  const summary = deriveWindDownSummary({
    userMetrics: state.userMetrics,
    consumedSnapshots: state.consumedTimelineEntries,
    timeline: state.drinkTimeline,
  });

  const lastDrinkMinutesAgo = summary.lastDrinkAt
    ? Math.max(0, Math.floor((currentTime.getTime() - summary.lastDrinkAt.getTime()) / 60000))
    : null;

  // Both crossings are hours out from the last drink and routinely land after
  // midnight, where a bare HH:mm reads as earlier the same evening.
  const crossingReference = summary.lastDrinkAt ?? currentTime;
  const soberDayNote = clockDayNote(summary.soberAt, crossingReference);
  const under008DayNote = clockDayNote(summary.under008At, crossingReference);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background px-5 pt-16 text-foreground">
      <div className="text-label font-medium uppercase text-muted-foreground">Winding down</div>

      {summary.lastDrinkAt && (
        <p className="mt-2.5 text-body tabular-nums text-[#cfd3e5]">
          Last drink {formatClock(summary.lastDrinkAt)}, {lastDrinkMinutesAgo} minutes ago. Nothing
          else planned.
        </p>
      )}

      <div className="mt-8">
        <div className="text-label font-medium uppercase text-muted-foreground">Sober around</div>
        <div className="mt-2 text-hero font-medium tabular-nums">
          {summary.soberAt ? formatClock(summary.soberAt) : "—"}
          {soberDayNote && (
            <span className="ml-2.5 text-lead font-normal text-muted-foreground">
              {soberDayNote}
            </span>
          )}
        </div>
      </div>

      <div className="mt-[26px] flex flex-col gap-px">
        <div className="flex min-h-[60px] items-center justify-between rounded-t-lg rounded-b-sm bg-field px-[18px]">
          <span className="text-body text-[#cfd3e5]">Under 0.08%</span>
          <span className="text-lead font-medium tabular-nums">
            {summary.under008At ? formatClock(summary.under008At) : "—"}
            {under008DayNote && (
              <span className="ml-1.5 text-note font-normal text-muted-foreground">
                {under008DayNote}
              </span>
            )}
          </span>
        </div>
        <div className="flex min-h-[60px] items-center justify-between rounded-sm bg-field px-[18px]">
          <span className="text-body text-[#cfd3e5]">Peak tonight</span>
          <span className="text-lead font-medium tabular-nums">
            {summary.peakBAC === null ? "—" : `${summary.peakBAC.toFixed(2)}%`}
          </span>
        </div>
        <div className="flex min-h-[60px] items-center justify-between rounded-t-sm rounded-b-lg bg-field px-[18px]">
          <span className="text-body text-[#cfd3e5]">Drunk of planned</span>
          <span className="text-lead font-medium tabular-nums">
            {Math.round(summary.consumedEthanolMl)} / {Math.round(summary.plannedEthanolMl)} ml
          </span>
        </div>
      </div>
      <p className="mt-2.5 text-micro text-pretty text-[#75798c]">
        Estimates from your stats and what you logged. Not a legal or medical measurement.
      </p>

      <div className="mt-[26px] rounded-lg border border-border bg-field p-[18px]">
        <div className="text-lead font-medium">Water, 500 ml</div>
        <p className="mt-1 text-note text-muted-foreground">
          Before bed. Set a reminder for 07:30 if you have somewhere to be.
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 pb-[22px]">
        <button
          type="button"
          onClick={() => onNext?.()}
          className="flex h-14 items-center justify-center text-body text-muted-foreground"
        >
          End session
        </button>
      </div>
    </div>
  );
};

export default WindDownScreen;
