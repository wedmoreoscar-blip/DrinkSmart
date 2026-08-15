import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, GlassWater, GitCommitVertical } from "lucide-react";
import { AppProvider } from "@/contexts/AppContext";
import PlanTab from "@/components/tabs/PlanTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import Profile from "@/pages/Profile";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricsSync } from "@/components/MetricsSync";
import { useEstablishments } from "@/hooks/useEstablishments";
import { buildActiveVenueCatalog } from "@/lib/planCatalog";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("plan");
  const [planFullScreen, setPlanFullScreen] = useState(false);
  const [swapDrinkId, setSwapDrinkId] = useState<string | null>(null);
  const { isOnboarded, loading: metricsLoading, refetch } = useUserMetrics();
  const { activeVenue, getEstablishmentDrinks } = useEstablishments();
  const [onboardingClosed, setOnboardingClosed] = useState(false);

  const activeVenueDrinks = useMemo(
    () => (activeVenue ? getEstablishmentDrinks(activeVenue.id) : []),
    [activeVenue, getEstablishmentDrinks],
  );
  const replanCatalog = useMemo(
    () => buildActiveVenueCatalog(activeVenue, activeVenueDrinks),
    [activeVenue, activeVenueDrinks],
  );

  const showOnboarding = !metricsLoading && !isOnboarded && !onboardingClosed;

  return (
    <AppProvider>
      <MetricsSync />
      <div className="flex h-[calc(100dvh-env(safe-area-inset-bottom))] flex-col bg-background">
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value !== "plan") setSwapDrinkId(null);
            setActiveTab(value);
          }}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col min-h-0"
        >
          {/* 4a is drawn at padding:20px 20px 0. p-4 gave 16px and md:p-6 introduced a
              24px jump the design does not have -- these frames are a fixed 402px. */}
          <TabsContent value="profile" className="flex-1 overflow-y-auto px-5 pb-0 pt-5">
            <Profile />
          </TabsContent>

          <TabsContent
            value="plan"
            className={planFullScreen ? "min-h-0 flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}
          >
            <PlanTab
              onPlanReady={() => {
                setSwapDrinkId(null);
                setActiveTab("timeline");
              }}
              onFullScreenChange={setPlanFullScreen}
              swapDrinkId={swapDrinkId}
              onSwapComplete={() => setSwapDrinkId(null)}
            />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 overflow-y-auto">
            <TimelineTab
              onNext={() => setActiveTab("plan")}
              replanCatalog={replanCatalog}
              onSwapRequest={(drinkId) => {
                setSwapDrinkId(drinkId);
                setActiveTab("plan");
              }}
            />
          </TabsContent>

          <TabsList data-wind-down-tab-bar className={planFullScreen ? "hidden" : undefined}>
            <TabsTrigger value="profile">
              <User className="h-[22px] w-[22px]" strokeWidth={1.6} />
              Profile
            </TabsTrigger>
            <TabsTrigger value="plan">
              <GlassWater
                className={
                  activeTab === "plan"
                    ? "h-[22px] w-[22px] [&>path:last-child]:fill-current"
                    : "h-[22px] w-[22px]"
                }
                strokeWidth={1.6}
              />
              Plan
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <GitCommitVertical
                className={
                  activeTab === "timeline"
                    ? "h-[22px] w-[22px] [&>circle]:fill-current"
                    : "h-[22px] w-[22px]"
                }
                strokeWidth={1.6}
              />
              Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <OnboardingModal
        open={showOnboarding}
        onComplete={() => {
          setOnboardingClosed(true);
          refetch();
        }}
      />
    </AppProvider>
  );
};

export default Dashboard;
