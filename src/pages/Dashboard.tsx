import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppProvider } from "@/contexts/AppContext";
import UserInfoTab from "@/components/tabs/UserInfoTab";
import InebriationLevelTab from "@/components/tabs/InebriationLevelTab";
import DrinksTab from "@/components/tabs/DrinksTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import ResultsTab from "@/components/tabs/ResultsTab";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("target-buzz");

  return (
    <AppProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              DrinkSmart Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your drinking responsibly with personalized insights
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="target-buzz">Target Buzz</TabsTrigger>
              <TabsTrigger value="user-info">User Info</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="drinks">Drinks</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="target-buzz">
              <InebriationLevelTab onNext={() => setActiveTab("user-info")} />
            </TabsContent>

            <TabsContent value="user-info">
              <UserInfoTab onNext={() => setActiveTab("results")} />
            </TabsContent>

            <TabsContent value="results">
              <ResultsTab onNavigateToDrinks={() => setActiveTab("drinks")} />
            </TabsContent>

            <TabsContent value="drinks">
              <DrinksTab onNext={() => setActiveTab("timeline")} />
            </TabsContent>

            <TabsContent value="timeline">
              <TimelineTab onNext={() => setActiveTab("results")} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppProvider>
  );
};

export default Dashboard;
