import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatsForm } from "./StatsForm";
import { PreferencesPicker } from "./PreferencesPicker";
import { ONBOARD1_COPY, ONBOARD2_COPY } from "./onboardingCopy";
import { useUserMetrics, type UserMetricsData } from "@/hooks/useUserMetrics";
import { defaultPreferences, type PreferenceData } from "@/lib/preferences";
import { useToast } from "@/hooks/use-toast";

type OnboardingModalProps = {
  open: boolean;
  onComplete: () => void;
};

type StepHeaderProps = {
  step: string;
  title: string;
  body: string;
};

const StepHeader = ({ step, title, body }: StepHeaderProps) => (
  <DialogHeader className="items-start gap-0 space-y-0 text-left">
    <p className="text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
      {step}
    </p>
    <DialogTitle className="mt-2.5 text-title font-medium leading-[1.15] tracking-[-0.015em]">
      {title}
    </DialogTitle>
    <DialogDescription className="mt-2 text-body leading-[1.45] text-muted-foreground">
      {body}
    </DialogDescription>
  </DialogHeader>
);

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [stats, setStats] = useState<UserMetricsData | null>(null);
  const [statsValid, setStatsValid] = useState(false);
  const [statsAttempted, setStatsAttempted] = useState(false);
  const [prefs, setPrefs] = useState<PreferenceData>(defaultPreferences);
  const [submitting, setSubmitting] = useState(false);
  const { completeOnboarding, isLoggedIn } = useUserMetrics();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const className = "onboarding-modal-open";
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [open]);

  const handleStatsChange = useCallback(
    (metrics: UserMetricsData, valid: boolean) => {
      setStats(metrics);
      setStatsValid(valid);
    },
    []
  );

  const handleContinueClick = () => {
    if (!statsValid) {
      setStatsAttempted(true);
      return;
    }
    setStatsAttempted(false);
    setStep(2);
  };

  const handleFinishClick = async (finalPrefs: PreferenceData) => {
    if (!stats) return;
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
    const ok = await completeOnboarding(stats, finalPrefs);
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

  const handleSkipClick = () => handleFinishClick(defaultPreferences);

  return (
    <>
      <style>{`
        body.onboarding-modal-open [data-state="open"].fixed.inset-0 {
          background: #0a0b12 !important;
        }
      `}</style>
      <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="left-4 right-4 top-auto bottom-4 mx-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-sheet bg-popover p-6 shadow-lg [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {step === 1 ? (
          <>
            <StepHeader
              step={ONBOARD1_COPY.step}
              title={ONBOARD1_COPY.title}
              body={ONBOARD1_COPY.body}
            />
            <div className="mt-5">
              <StatsForm
                initial={stats}
                onChange={handleStatsChange}
                hideSubmit
                showErrors={statsAttempted}
              />
            </div>
            <div className="mt-5">
              <Button
                type="button"
                size="act"
                className="w-full"
                onClick={handleContinueClick}
              >
                {ONBOARD1_COPY.cta}
              </Button>
              <p className="mt-3 text-center text-micro text-[#75798c]">
                {ONBOARD1_COPY.footnote}
              </p>
            </div>
          </>
        ) : (
          <>
            <StepHeader
              step={ONBOARD2_COPY.step}
              title={ONBOARD2_COPY.title}
              body={ONBOARD2_COPY.body}
            />
            <div className="mt-5">
              <PreferencesPicker
                initial={prefs}
                onChange={setPrefs}
                onSubmit={handleFinishClick}
                submitLabel={ONBOARD2_COPY.cta}
                submitting={submitting}
                onSkip={handleSkipClick}
              />
            </div>
          </>
        )}
      </DialogContent>
      </Dialog>
    </>
  );
};
