import { useAppContext } from "@/contexts/AppContext";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import type { SessionHistoryDrink, SessionSnapshot } from "@/lib/sessionHistory";
import { entryPortionWord } from "@/components/picker/wave5-picker";

type SessionHistoryProps = {
  onOpenPlan?: () => void;
};

const formatCompletedAt = (completedAt: string): string => {
  const date = new Date(completedAt);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortId = (id: string): string => id.slice(0, 8);

const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const drinkSummary = (drink: SessionHistoryDrink): string => {
  const word = entryPortionWord(drink);
  const name = drink.customName ?? drink.drink;
  return word ? `${word} ${name}` : name;
};

/**
 * Account-only history of completed sessions, newest first. Each row loads the
 * snapshot as a clean, editable Plan draft and switches straight to Plan.
 */
export const SessionHistory = ({ onOpenPlan }: SessionHistoryProps) => {
  const { sessions, loading, isAccount } = useSessionHistory();
  const { loadSessionSnapshot } = useAppContext();

  if (!isAccount) return null;

  const handleOpen = (snapshot: SessionSnapshot) => {
    loadSessionSnapshot(snapshot);
    onOpenPlan?.();
  };

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-0.5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
        Session history
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No completed sessions yet</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((snapshot) => (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => handleOpen(snapshot)}
              className="w-full rounded-lg bg-muted/50 p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-medium leading-[1.3] text-foreground">
                  {formatCompletedAt(snapshot.completed_at)}
                </span>
                <span className="flex-none text-micro tabular-nums text-[#75798c]">
                  {shortId(snapshot.id)}
                </span>
              </div>
              <div className="mt-[3px] text-[13px] leading-[1.3] tabular-nums text-muted-foreground">
                Buzz {Math.min(snapshot.buzz_level, 7)} · {formatDuration(snapshot.duration_minutes)}
              </div>
              {snapshot.drinks.length > 0 && (
                <div className="mt-1 truncate text-[13px] leading-[1.4] text-muted-foreground">
                  {snapshot.drinks.map(drinkSummary).join(", ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
