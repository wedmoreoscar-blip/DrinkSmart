import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { SCAN_CAPTURE_COPY, SCAN_WAIT_COPY } from "./copy";
import { ScannerHeader } from "./ScannerHeader";
import { ScannerSkeletonRows } from "./ScannerSkeletonRows";

type ScannerWaitingProps = {
  onLeave: () => void;
  onCancel: () => void;
  onClose: () => void;
};

export const ScannerWaiting = ({ onLeave, onCancel, onClose }: ScannerWaitingProps) => {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 20000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background px-5 pt-[22px] text-foreground">
      <ScannerHeader title={SCAN_CAPTURE_COPY.title} onClose={onClose} />
      <div className="relative mt-2 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-lg bg-field px-6 py-6">
        <ScannerSkeletonRows variant="waiting" />
        <div className="relative h-[52px] w-[52px] rounded-full shadow-[0_0_0_2px_#292b31]">
          <svg
            className="absolute inset-0 h-[52px] w-[52px] animate-[spin_1.8s_linear_infinite]"
            viewBox="0 0 52 52"
            fill="none"
          >
            <path d="M26 2a24 24 0 0 1 24 24" stroke="#9184d9" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>
        <div className="relative mt-5 text-[24px] font-medium leading-[1.2] tracking-[-0.015em] text-foreground">
          {SCAN_WAIT_COPY.title}
        </div>
        <p className="relative mt-2 max-w-[280px] text-center text-note text-muted-foreground">
          {slow ? SCAN_WAIT_COPY.slowNote : SCAN_WAIT_COPY.estimate}
        </p>
      </div>
      <div className="flex-none pt-3.5">
        <Button size="act" className="w-full" onClick={onLeave}>
          {SCAN_WAIT_COPY.leave}
        </Button>
        <p className="mt-2.5 text-center text-note text-muted-foreground">{SCAN_WAIT_COPY.reassure}</p>
        <button
          type="button"
          onClick={onCancel}
          className="mt-1.5 flex h-tap w-full items-center justify-center text-body text-muted-foreground"
        >
          {SCAN_WAIT_COPY.cancel}
        </button>
      </div>
    </div>
  );
};
