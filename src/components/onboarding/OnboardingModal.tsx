import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatsForm } from "./StatsForm";
import { PreferencesPicker } from "./PreferencesPicker";
import { useUserMetrics, type UserMetricsData } from "@/hooks/useUserMetrics";
import { defaultPreferences, type PreferenceData } from "@/lib/preferences";
import { useToast } from "@/hooks/use-toast";

type OnboardingModalProps = {
  open: boolean;
  onComplete: () => void;
};

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [stats, setStats] = useState<UserMetricsData | null>(null);
  const [statsValid, setStatsValid] = useState(false);
  const [prefs, setPrefs] = useState<PreferenceData>(defaultPreferences);
  const [submitting, setSubmitting] = useState(false);
  const { completeOnboarding, isLoggedIn } = useUserMetrics();
  const { toast } = useToast();

  const handleStatsChange = useCallback(
    (metrics: UserMetricsData, valid: boolean) => {
      setStats(metrics);
      setStatsValid(valid);
    },
    []
  );

  const handleFinishClick = async () => {
    if (!stats || !statsValid) {
      toast({
        title: "Missing info",
        description: "Please fill out all required fields above.",
        variant: "destructive",
      });
      return;
    }
    if (!isLoggedIn) {
      toast({
        title: "Not signed in",
        description:
          "Anonymous session hasn't been bootstrapped — refresh the page.",
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
      toast({
        title: "Couldn't save",
        description: "Try again — if it keeps failing, check the browser console.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Set up your profile</DialogTitle>
          <DialogDescription>
            We use your stats to calculate safe intake, and your preferences to
            pick drinks you'll enjoy.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
          <div>
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              About you
            </Label>
            <div className="mt-2">
              <StatsForm
                initial={stats}
                onChange={handleStatsChange}
                hideSubmit
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Drink preferences
            </Label>
            <div className="mt-2">
              <PreferencesPicker initial={prefs} onChange={setPrefs} />
            </div>
          </div>
        </div>

        <div className="p-6 pt-3 border-t bg-background">
          <Button
            type="button"
            className="w-full"
            disabled={submitting || !statsValid}
            onClick={handleFinishClick}
          >
            {submitting ? "Saving..." : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
