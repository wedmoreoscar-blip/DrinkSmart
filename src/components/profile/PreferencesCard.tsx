import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { PreferenceData } from "@/lib/preferences";
import { TASTE_WORDS } from "@/components/profile/tasteWords";
import { TasteSheet } from "@/components/profile/TasteSheet";
import { RemindersSheet } from "@/components/profile/RemindersSheet";

const REMINDERS_KEY = "web-drink-reminders";

const Row = ({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-tap w-full items-center justify-between gap-3 text-left"
  >
    <span className="text-body text-foreground">{label}</span>
    <span className="flex items-center gap-2.5">
      <span className="text-body text-muted-foreground">{value}</span>
      <ChevronRight className="h-[18px] w-[18px] text-[#75798c]" strokeWidth={1.8} />
    </span>
  </button>
);

type PreferencesCardProps = {
  preferences: PreferenceData;
  onChange: (prefs: PreferenceData) => void;
};

export const PreferencesCard = ({ preferences, onChange }: PreferencesCardProps) => {
  const [tasteOpen, setTasteOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(REMINDERS_KEY) === "true"
  );

  const handleRemindersToggle = (enabled: boolean) => {
    setRemindersEnabled(enabled);
    window.localStorage.setItem(REMINDERS_KEY, enabled ? "true" : "false");
  };

  const tasteStop = Math.round(preferences.sweet * 4) / 4;

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-0.5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
        Preferences
      </div>
      <Row
        label="Taste"
        value={TASTE_WORDS[tasteStop] ?? "middling"}
        onClick={() => setTasteOpen(true)}
      />
      <div className="h-px bg-secondary" />
      <Row
        label="Reminders"
        value={remindersEnabled ? "drinks only" : "off"}
        onClick={() => setRemindersOpen(true)}
      />
      <TasteSheet
        open={tasteOpen}
        onOpenChange={setTasteOpen}
        initial={preferences}
        onChange={onChange}
      />
      <RemindersSheet
        open={remindersOpen}
        onOpenChange={setRemindersOpen}
        enabled={remindersEnabled}
        onToggle={handleRemindersToggle}
      />
    </div>
  );
};
