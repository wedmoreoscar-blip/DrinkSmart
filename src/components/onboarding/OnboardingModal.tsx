import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
  const [prefs, setPrefs] = useState<PreferenceData>(defaultPreferences);
  const [submitting, setSubmitting] = useState(false);
  const { completeOnboarding, isLoggedIn } = useUserMetrics();
  const { toast } = useToast();

  const handleStatsSubmit = (metrics: UserMetricsData) => {
    setStats(metrics);
    setStep("preferences");
  };

  const handleFinishClick = async () => {
    if (!stats) {
      toast({
        title: "Missing info",
        description: "Please fill out the stats step first.",
        variant: "destructive",
      });
      setStep("stats");
      return;
    }
    if (!isLoggedIn) {
      toast({
        title: "Not signed in",
        description: "Anonymous session hasn't been bootstrapped — refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const ok = await completeOnboarding(stats, prefs);
    setSubmitting(false);

    if (ok) {
      toast({
        title: "You're all set",
        description: "Pick your buzz and we'll plan the rest.",
      });
      onComplete();
    } else {
      // completeOnboarding returns false on caught error; the hook already
      // surfaces a destructive toast via useMutation's onError. Add a hint here
      // so the user knows their click registered.
      toast({
        title: "Couldn't save",
        description: "Try again — if it keeps failing, check the browser console.",
        variant: "destructive",
      });
    }
  };

  const progressValue = step === "stats" ? 50 : 100;

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissable */ }}>
      <DialogContent
        // Flex column with fixed header + scrollable body + sticky footer so
        // the action button is always visible and clickable regardless of how
        // tall the body content gets.
        className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4">
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

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {step === "stats" && (
            <StatsForm
              initial={stats}
              onSubmit={handleStatsSubmit}
              submitLabel="Next"
            />
          )}
          {step === "preferences" && (
            <PreferencesPicker
              initial={prefs}
              onChange={setPrefs}
              // No onSubmit — the Finish button lives in the sticky footer below
            />
          )}
        </div>

        {step === "preferences" && (
          <div className="p-6 pt-3 border-t bg-background">
            <Button
              type="button"
              className="w-full"
              disabled={submitting}
              onClick={handleFinishClick}
            >
              {submitting ? "Saving…" : "Finish"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
