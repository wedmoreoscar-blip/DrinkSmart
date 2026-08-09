import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, GlassWater, GitCommitVertical } from "lucide-react";
import { AppProvider } from "@/contexts/AppContext";
import PlanTab from "@/components/tabs/PlanTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import Profile from "@/pages/Profile";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { useUserMetrics } from "@/hooks/useUserMetrics";
import { MetricsSync } from "@/components/MetricsSync";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("plan");
  const { isOnboarded, loading: metricsLoading, refetch } = useUserMetrics();
  const [onboardingClosed, setOnboardingClosed] = useState(false);

  const showOnboarding = !metricsLoading && !isOnboarded && !onboardingClosed;

  return (
    <AppProvider>
      <MetricsSync />
      <div className="flex h-[calc(100dvh-env(safe-area-inset-bottom))] flex-col bg-background">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col min-h-0"
        >
          <TabsContent value="profile" className="flex-1 overflow-y-auto p-4 md:p-6">
            <Profile />
          </TabsContent>

          <TabsContent value="plan" className="flex-1 overflow-y-auto">
            <PlanTab onPlanReady={() => setActiveTab("timeline")} />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 overflow-y-auto">
            <TimelineTab onNext={() => setActiveTab("plan")} />
          </TabsContent>

          <TabsList>
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
