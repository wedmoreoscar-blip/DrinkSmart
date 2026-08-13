import { X } from "lucide-react";

type ScannerHeaderProps = {
  title: string;
  onClose: () => void;
};

export const ScannerHeader = ({ title, onClose }: ScannerHeaderProps) => (
  <div className="flex min-h-tap flex-none items-center gap-3">
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="flex h-tap w-tap flex-none items-center justify-center text-foreground"
    >
      <X className="h-[22px] w-[22px]" strokeWidth={1.8} />
    </button>
    <div className="text-body text-foreground">{title}</div>
  </div>
);
