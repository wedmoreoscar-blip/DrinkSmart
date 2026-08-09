import { cn } from "@/lib/utils";

export interface VesselMeterProps {
  targetMl: number;
  entries: { label: string; ml: number }[];
  className?: string;
}

const VESSEL_HEIGHT = 300;
const TARGET_LINE_BOTTOM = 234;
const TARGET_LABEL_BOTTOM = 240;

const formatMl = (value: number) => value.toFixed(1).replace(/\.0$/, "");

type MeterLabel = {
  key: string;
  text: string;
  bottom: number;
  priority: number;
};

export const VesselMeter = ({ targetMl, entries, className }: VesselMeterProps) => {
  const plannedMl = entries.reduce((total, entry) => total + entry.ml, 0);
  const pxPerMl = targetMl > 0 ? TARGET_LINE_BOTTOM / targetMl : 0;
  const onTargetFillHeight = Math.min(VESSEL_HEIGHT, Math.min(plannedMl, targetMl) * pxPerMl);
  const overMl = Math.max(0, plannedMl - targetMl);
  const overFillHeight = Math.min(VESSEL_HEIGHT - TARGET_LINE_BOTTOM, overMl * pxPerMl);

  let cumulativeMl = 0;
  const entryLabels: MeterLabel[] = entries.map((entry, index) => {
    cumulativeMl += entry.ml;
    return {
      key: `entry-${index}`,
      text: `— ${entry.label}`,
      bottom: Math.min(VESSEL_HEIGHT, Math.max(0, cumulativeMl * pxPerMl)),
      priority: 1,
    };
  });

  const fixedLabels: MeterLabel[] = [
    {
      key: "target",
      text: "target",
      bottom: TARGET_LABEL_BOTTOM,
      priority: 3,
    },
    {
      key: "start",
      text: "start",
      bottom: 0,
      priority: 2,
    },
  ];

  if (overMl > 0) {
    fixedLabels.unshift({
      key: "over",
      text: `+${formatMl(overMl)} over`,
      bottom: Math.min(VESSEL_HEIGHT, Math.max(TARGET_LABEL_BOTTOM + 22, TARGET_LINE_BOTTOM + overFillHeight + 3)),
      priority: 3,
    });
  }

  const visibleLabels = [...fixedLabels, ...entryLabels]
    .sort((left, right) => right.priority - left.priority)
    .reduce<MeterLabel[]>((visible, label) => {
      if (!visible.some((other) => Math.abs(other.bottom - label.bottom) <= 14)) {
        visible.push(label);
      }
      return visible;
    }, []);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div>
        <div className="text-label font-medium uppercase text-muted-foreground">Plan holds</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-display font-medium tabular-nums">{formatMl(plannedMl)}</span>
          <span className="text-body text-muted-foreground">ml of {formatMl(targetMl)}</span>
        </div>
      </div>

      <div className="flex items-stretch gap-4">
        <div className="relative h-[300px] w-[96px] flex-none overflow-hidden rounded-vessel border border-border bg-[#1c1e2c]">
          <div
            className="absolute inset-x-0 bottom-0 bg-primary opacity-90"
            style={{ height: `${Math.max(0, onTargetFillHeight)}px`, transition: "var(--transition-liquid)" }}
          />
          {overMl > 0 && (
            <div
              className="absolute inset-x-0 bg-warning opacity-90"
              style={{
                bottom: `${TARGET_LINE_BOTTOM}px`,
                height: `${Math.max(0, overFillHeight)}px`,
                transition: "var(--transition-liquid)",
              }}
            />
          )}
          <div
            className="absolute inset-x-0 bg-foreground"
            style={{ bottom: `${TARGET_LINE_BOTTOM}px`, height: "2px" }}
          />
        </div>

        <div className="relative min-w-0 flex-1 text-micro tabular-nums text-[#75798c]">
          {visibleLabels.map((label) => {
            const isFixed = label.key === "target" || label.key === "over";
            return (
              <div
                key={label.key}
                className={cn(
                  "absolute left-0 whitespace-nowrap",
                  isFixed && "text-label tracking-normal",
                  label.key === "target" && "text-foreground",
                  label.key === "over" && "text-warning",
                )}
                style={{ bottom: `${label.bottom}px` }}
              >
                {label.text}
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn("text-[17px] leading-[1.4]", overMl > 0 ? "text-warning" : "text-[#cfd3e5]")}>
        {overMl > 0
          ? `plan is ${overMl.toFixed(0)} ml over — trim it`
          : `plan covers ${targetMl > 0 ? Math.round((plannedMl / targetMl) * 100) : 0}% of it`}
      </div>
    </div>
  );
};
