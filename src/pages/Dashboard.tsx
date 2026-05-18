import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              DrinkSmart
            </h1>
            <p className="text-muted-foreground text-sm">
              Plan your buzz, drink smart.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="plan">Plan</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Profile />
            </TabsContent>

            <TabsContent value="plan">
              <PlanTab onPlanReady={() => setActiveTab("timeline")} />
            </TabsContent>

            <TabsContent value="timeline">
              <TimelineTab />
            </TabsContent>
          </Tabs>
        </div>
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
