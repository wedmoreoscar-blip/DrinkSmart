import { cn } from "@/lib/utils";

export interface VesselMeterProps {
  targetMl: number;
  entries: { label: string; ml: number }[];
  pendingMl?: number;
  variant?: "full" | "tray";
  className?: string;
}

const VESSEL_HEIGHT = 300;
const TARGET_LINE_BOTTOM = 234;
const TARGET_LABEL_BOTTOM = 240;

const formatMl = (value: number) => value.toFixed(1).replace(/\.0$/, "");

/* Tray shade bands by % over target, in written interval order. Each exact
   boundary belongs to the interval that lists it first, so every value has
   one deterministic shade. The last band holds anything above 20% over. */
const TRAY_SHADES: { maxOverPct: number; fill: string; pending: string }[] = [
  {
    maxOverPct: 5,
    fill: "bg-primary",
    pending: "border-primary bg-[rgba(145,132,217,.22)]",
  },
  {
    maxOverPct: 10,
    fill: "bg-[hsl(var(--over-1))]",
    pending: "border-[hsl(var(--over-1))] bg-[rgba(211,189,114,.22)]",
  },
  {
    maxOverPct: 15,
    fill: "bg-warning",
    pending: "border-warning bg-[rgba(210,154,81,.22)]",
  },
  {
    maxOverPct: Number.POSITIVE_INFINITY,
    fill: "bg-[hsl(var(--over-3))]",
    pending: "border-[hsl(var(--over-3))] bg-[rgba(200,96,94,.22)]",
  },
];

type MeterLabel = {
  key: string;
  text: string;
  bottom: number;
  priority: number;
};

export const VesselMeter = ({
  targetMl,
  entries,
  pendingMl = 0,
  variant = "full",
  className,
}: VesselMeterProps) => {
  const plannedMl = entries.reduce((total, entry) => total + entry.ml, 0);
  if (variant === "tray") {
    const committedPct = targetMl > 0 ? Math.min(100, (plannedMl / targetMl) * 100) : 0;
    const pendingPct =
      targetMl > 0 ? Math.min(100 - committedPct, (Math.max(0, pendingMl) / targetMl) * 100) : 0;
    const totalMl = plannedMl + Math.max(0, pendingMl);
    const overPct = targetMl > 0 ? ((totalMl - targetMl) / targetMl) * 100 : 0;
    const shade =
      TRAY_SHADES.find((band, index) =>
        // The final warning interval starts at exactly 15%; earlier exact
        // boundaries retain their established lower-band ownership.
        index === 2 ? overPct < band.maxOverPct : overPct <= band.maxOverPct
      ) ?? TRAY_SHADES[TRAY_SHADES.length - 1];

    return (
      <div
        data-vessel-meter="tray"
        className={cn(
          "relative h-[60px] w-[26px] flex-none overflow-hidden rounded-[7px] bg-[#161826] shadow-[0_0_0_1px_#3f424d]",
          className,
        )}
      >
        <div
          className={cn("absolute inset-x-0 bottom-0", shade.fill)}
          style={{ height: `${committedPct}%`, transition: "var(--transition-liquid)" }}
        />
        {pendingPct > 0 && (
          <div
            className={cn("absolute inset-x-0 border-t", shade.pending)}
            style={{
              bottom: `${committedPct}%`,
              height: `${pendingPct}%`,
              transition: "var(--transition-liquid)",
            }}
          />
        )}
      </div>
    );
  }
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
