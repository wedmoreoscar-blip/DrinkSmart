import { Button } from "@/components/ui/button";

import { SCAN_CAPTURE_COPY, SCAN_FAIL_COPY } from "./copy";
import { ScannerHeader } from "./ScannerHeader";
import type { ScanFailure } from "./types";

type ScannerFailedProps = {
  failure: ScanFailure;
  photoThumbnail: string;
  onRetry: () => void;
  onReshoot: () => void;
  onManual: () => void;
  onClose: () => void;
};

export const ScannerFailed = ({
  failure,
  photoThumbnail,
  onRetry,
  onReshoot,
  onManual,
  onClose,
}: ScannerFailedProps) => {
  const failCopy = SCAN_FAIL_COPY[failure];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background px-5 pt-[22px] text-foreground">
      <ScannerHeader title={SCAN_CAPTURE_COPY.title} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto pt-2">
        <div className="relative flex-none">
          <img
            src={photoThumbnail}
            alt="Your menu photo"
            className="h-[150px] w-full rounded-lg bg-field object-cover"
          />
          <span className="absolute bottom-3.5 left-3.5 flex-none rounded-md bg-[rgba(10,11,18,.72)] px-[9px] py-[5px] text-micro font-medium tracking-[0.04em] text-muted-foreground">
            your photo
          </span>
        </div>
        <div className="pt-6">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <path d="M10 6h16l8 8v24H10z" stroke="#3f424d" strokeWidth="1.8" />
            <path d="M15 21h14M15 28h9" stroke="#3f424d" strokeWidth="1.8" />
          </svg>
          <div className="mt-4 text-title font-medium text-foreground">{failCopy.title}</div>
          <p className="mt-2 text-note text-muted-foreground">{failCopy.body}</p>
        </div>
      </div>
      <div className="flex-none">
        <Button size="act" className="w-full" onClick={onRetry}>
          {SCAN_FAIL_COPY.retry}
        </Button>
        <button
          type="button"
          onClick={onReshoot}
          className="mt-2.5 flex h-tap w-full items-center justify-center rounded-ctl text-body text-foreground shadow-[0_0_0_1px_#383a46]"
        >
          {SCAN_FAIL_COPY.reshoot}
        </button>
        <button
          type="button"
          onClick={onManual}
          className="mt-0.5 flex h-tap w-full items-center justify-center text-body text-muted-foreground"
        >
          {SCAN_FAIL_COPY.manual}
        </button>
        <p className="pb-3 pt-1 text-center text-micro text-[#75798c]">{SCAN_FAIL_COPY.kept}</p>
      </div>
    </div>
  );
};
