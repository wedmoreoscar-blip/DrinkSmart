import { cn } from "@/lib/utils";

// The read-only step strip shared by 4m (all steps pending) and 4n (the same
// three rows as a progress reading: done / current / pending).
export type StepMark = "done" | "current" | "pending";

type StepStripProps = {
  steps: string[];
  marks: StepMark[];
};

export function StepStrip({ steps, marks }: StepStripProps) {
  return (
    <div>
      {steps.map((label, index) => {
        const mark = marks[index] ?? "pending";
        return (
          <div key={label} className="flex min-h-tap items-center gap-3.5">
            <StepDisc mark={mark} index={index + 1} />
            <div
              className={cn(
                "flex-1 text-body",
                mark === "pending" ? "text-[#75798c]" : "text-foreground"
              )}
            >
              {label}
            </div>
            {mark === "current" && (
              <div className="flex-none rounded-chip bg-accent px-[9px] py-[5px] text-micro font-medium tracking-[0.04em] text-[#b5abfc]">
                waiting
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepDisc({ mark, index }: { mark: StepMark; index: number }) {
  if (mark === "done") {
    return (
      <div className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary shadow-[0_0_0_1.5px_#9184d9]">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.5l3 3L12.5 5"
            stroke="#161826"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  const current = mark === "current";
  return (
    <div
      className={cn(
        "grid h-7 w-7 flex-none place-items-center rounded-full",
        current
          ? "shadow-[0_0_0_1.5px_#9184d9]"
          : "shadow-[0_0_0_1.5px_#383a46]"
      )}
    >
      <span
        className={cn(
          "text-[15px] font-medium leading-none tabular-nums",
          current ? "text-[#b5abfc]" : "text-[#75798c]"
        )}
      >
        {index}
      </span>
    </div>
  );
}
