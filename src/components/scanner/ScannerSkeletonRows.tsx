import { cn } from "@/lib/utils";

type SkeletonVariant = "capture" | "waiting" | "failed";

type ScannerSkeletonRowsProps = {
  variant: SkeletonVariant;
};

const CAPTURE_WIDTHS = [154, 126, 168, 105, 140, 119, 161, 112];
const WAITING_WIDTHS = [143, 117, 156, 97.5, 130, 110.5, 149.5, 104, 136.5, 123.5];

/** The quiet menu-shaped content shown while a camera result is pending. */
export const ScannerSkeletonRows = ({ variant }: ScannerSkeletonRowsProps) => {
  const widths = variant === "capture" ? CAPTURE_WIDTHS : WAITING_WIDTHS;
  const isCapture = variant === "capture";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute flex flex-col",
        isCapture ? "left-[60px] right-[60px] top-[120px] gap-3.5 opacity-50" : "left-10 right-10 top-[70px] gap-[13px]",
        variant === "waiting" ? "opacity-[.18]" : variant === "failed" ? "opacity-[.16]" : "",
      )}
    >
      {widths.map((width, index) => (
        <div key={`${variant}-${index}`} className="flex items-center justify-between gap-4">
          <span
            className={cn("h-[11px] rounded-[3px] bg-[#3f424d]", index % 3 === 0 && "h-[13px]")}
            style={{ width }}
          />
          <span className="h-[11px] w-[34px] rounded-[3px] bg-[#383a46]" />
        </div>
      ))}
    </div>
  );
};
