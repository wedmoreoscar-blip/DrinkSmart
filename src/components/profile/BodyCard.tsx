import { ChevronRight } from "lucide-react";
import type { UserMetricsData } from "@/hooks/useUserMetrics";

type CellValue = {
  value: string;
  unit: string;
};

const weightCell = (metrics: UserMetricsData): CellValue => {
  const weight = parseFloat(metrics.weight);
  return Number.isFinite(weight)
    ? { value: String(Math.round(weight)), unit: metrics.weightUnit }
    : { value: "", unit: "" };
};

const heightCell = (metrics: UserMetricsData): CellValue => {
  if (metrics.heightUnit === "cm") {
    const cm = parseFloat(metrics.heightCm);
    return Number.isFinite(cm) ? { value: String(Math.round(cm)), unit: "cm" } : { value: "", unit: "" };
  }
  const feet = parseFloat(metrics.heightFt);
  if (!Number.isFinite(feet)) return { value: "", unit: "" };
  const inches = Number.isFinite(parseFloat(metrics.heightIn)) ? parseFloat(metrics.heightIn) : 0;
  const totalInches = feet * 12 + inches;
  return { value: `${Math.floor(totalInches / 12)}'${totalInches % 12}"`, unit: "" };
};

const ageCell = (metrics: UserMetricsData): CellValue => {
  const age = parseInt(metrics.age);
  return Number.isFinite(age) ? { value: String(age), unit: "" } : { value: "", unit: "" };
};

const sexCell = (metrics: UserMetricsData): CellValue => {
  if (metrics.sex === "male") return { value: "Male", unit: "" };
  if (metrics.sex === "female") return { value: "Female", unit: "" };
  return { value: "", unit: "" };
};

const bodyFatCell = (metrics: UserMetricsData): CellValue => {
  const bodyFat = parseFloat(metrics.bodyFat);
  return Number.isFinite(bodyFat) ? { value: String(Math.round(bodyFat)), unit: "" } : { value: "", unit: "" };
};

const StatCell = ({
  label,
  cell,
  onClick,
}: {
  label: string;
  cell: CellValue;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[60px] flex-col justify-center gap-[3px] rounded-ctl bg-field px-[14px] py-2 text-left"
  >
    <span className="text-micro font-medium uppercase tracking-[0.09em] text-[#75798c]">
      {label}
    </span>
    <span className="flex items-baseline gap-[5px]">
      <span className="num text-title font-medium leading-none text-foreground">
        {cell.value || "—"}
      </span>
      {cell.unit && (
        <span className="text-body leading-none text-muted-foreground">{cell.unit}</span>
      )}
    </span>
  </button>
);

type BodyCardProps = {
  metrics: UserMetricsData | null;
  loading: boolean;
  onEdit: () => void;
};

export const BodyCard = ({ metrics, loading, onEdit }: BodyCardProps) => (
  <div className="rounded-lg bg-card p-4">
    <div className="mb-2.5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
      Body
    </div>
    {loading ? (
      <p className="py-2 text-note text-muted-foreground">Loading…</p>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCell label="Weight" cell={metrics ? weightCell(metrics) : { value: "", unit: "" }} onClick={onEdit} />
          <StatCell label="Height" cell={metrics ? heightCell(metrics) : { value: "", unit: "" }} onClick={onEdit} />
          <StatCell label="Age" cell={metrics ? ageCell(metrics) : { value: "", unit: "" }} onClick={onEdit} />
          <StatCell label="Sex" cell={metrics ? sexCell(metrics) : { value: "", unit: "" }} onClick={onEdit} />
          {metrics?.metricType === "ffmi" && (
            <StatCell label="Body fat" cell={bodyFatCell(metrics)} onClick={onEdit} />
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="mt-2.5 flex h-tap w-full items-center justify-between rounded-ctl bg-field px-[14px]"
        >
          <span className="whitespace-nowrap text-body text-foreground">Method</span>
          <span className="flex items-center gap-2.5">
            <span className="text-body text-muted-foreground">
              {metrics?.metricType === "ffmi" ? "FFMI" : "BMI"}
            </span>
            <ChevronRight className="h-[18px] w-[18px] text-[#75798c]" strokeWidth={1.8} />
          </span>
        </button>
        <div className="mt-2.5 text-note text-muted-foreground">
          Editing these re-runs tonight's timeline.
        </div>
      </>
    )}
  </div>
);
