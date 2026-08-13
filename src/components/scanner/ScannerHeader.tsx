import { X } from "lucide-react";

type ScannerHeaderProps = {
  title: string;
  onClose: () => void;
};

export const ScannerHeader = ({ title, onClose }: ScannerHeaderProps) => (
  <div className="flex min-h-tap flex-none items-center gap-3">
    {/* The 56px touch target must not drive layout. A 56-wide button put the icon
        at x=37 and the title at x=88; the drawings place a 22px icon at x=20 and
        the title at x=54. So the button occupies the icon's 22px in flow and grows
        its hit area outward with a -17px inset pseudo-element (22 + 17*2 = 56),
        which keeps the tap floor without moving anything beside it. */}
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="relative flex h-[22px] w-[22px] flex-none items-center justify-center text-foreground before:absolute before:-inset-[17px] before:content-['']"
    >
      <X className="h-[22px] w-[22px]" strokeWidth={1.8} />
    </button>
    <div className="text-body text-foreground">{title}</div>
  </div>
);
