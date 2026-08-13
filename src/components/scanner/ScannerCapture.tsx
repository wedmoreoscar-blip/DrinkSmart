import { Button } from "@/components/ui/button";

import { SCAN_CAPTURE_COPY } from "./copy";
import { ScannerHeader } from "./ScannerHeader";
import { ScannerSkeletonRows } from "./ScannerSkeletonRows";

type ScannerCaptureProps = {
  onShutter: () => void;
  onPick: () => void;
  onClose: () => void;
};

export const ScannerCapture = ({ onShutter, onPick, onClose }: ScannerCaptureProps) => (
  <div className="flex h-full min-h-0 flex-col bg-background px-5 pt-[22px] text-foreground">
    <ScannerHeader title={SCAN_CAPTURE_COPY.title} onClose={onClose} />
    <div className="relative mt-2 flex min-h-0 flex-1 flex-col justify-end overflow-hidden rounded-lg bg-field p-[18px]">
      <div className="pointer-events-none absolute inset-[26px]">
        <span className="absolute left-0 top-0 h-[34px] w-[34px] rounded-tl-md border-l-2 border-t-2 border-[#e9e9ed]" />
        <span className="absolute right-0 top-0 h-[34px] w-[34px] rounded-tr-md border-r-2 border-t-2 border-[#e9e9ed]" />
        <span className="absolute bottom-0 left-0 h-[34px] w-[34px] rounded-bl-md border-b-2 border-l-2 border-[#e9e9ed]" />
        <span className="absolute bottom-0 right-0 h-[34px] w-[34px] rounded-br-md border-b-2 border-r-2 border-[#e9e9ed]" />
      </div>
      <ScannerSkeletonRows variant="capture" />
      <div className="relative rounded-lg bg-[rgba(10,11,18,.72)] px-4 py-3.5">
        <p className="text-note text-[#e9e9ed]">{SCAN_CAPTURE_COPY.guidance}</p>
      </div>
    </div>
    <div className="flex-none pt-3.5">
      <Button size="act" className="w-full" onClick={onShutter}>
        {SCAN_CAPTURE_COPY.shutter}
      </Button>
      <button
        type="button"
        onClick={onPick}
        className="mt-2 flex h-tap w-full items-center justify-center text-body text-muted-foreground"
      >
        {SCAN_CAPTURE_COPY.pick}
      </button>
      <p className="pb-3 pt-1 text-center text-micro text-[#75798c]">{SCAN_CAPTURE_COPY.privacy}</p>
    </div>
  </div>
);
