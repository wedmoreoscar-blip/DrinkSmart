import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { StatsForm } from "./StatsForm";
import { PreferencesPicker } from "./PreferencesPicker";
import { useUserMetrics, type UserMetricsData } from "@/hooks/useUserMetrics";
import { defaultPreferences, type PreferenceData } from "@/lib/preferences";
import { useToast } from "@/hooks/use-toast";

type OnboardingModalProps = {
  open: boolean;
  onComplete: () => void;
};

type Step = "stats" | "preferences";

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [step, setStep] = useState<Step>("stats");
  const [stats, setStats] = useState<UserMetricsData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { completeOnboarding } = useUserMetrics();
  const { toast } = useToast();

  const handleStatsSubmit = (metrics: UserMetricsData) => {
    setStats(metrics);
    setStep("preferences");
  };

  const handlePreferencesSubmit = async (prefs: PreferenceData) => {
    if (!stats) return;
    setSubmitting(true);
    const ok = await completeOnboarding(stats, prefs);
    setSubmitting(false);
    if (ok) {
      toast({
        title: "You're all set",
        description: "Pick your buzz and we'll plan the rest.",
      });
      onComplete();
    }
  };

  const progressValue = step === "stats" ? 50 : 100;

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissable */ }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {step === "stats" ? "Tell us about you" : "What do you like to drink?"}
          </DialogTitle>
          <DialogDescription>
            {step === "stats"
              ? "We use these to calculate how much you can drink to hit your buzz."
              : "Helps us pick drinks you'll actually enjoy."}
          </DialogDescription>
          <Progress value={progressValue} className="h-1 mt-2" />
        </DialogHeader>

        <div className="mt-4">
          {step === "stats" && (
            <StatsForm
              initial={stats}
              onSubmit={handleStatsSubmit}
              submitLabel="Next"
            />
          )}
          {step === "preferences" && (
            <PreferencesPicker
              initial={defaultPreferences}
              onSubmit={handlePreferencesSubmit}
              submitLabel="Finish"
              submitting={submitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
