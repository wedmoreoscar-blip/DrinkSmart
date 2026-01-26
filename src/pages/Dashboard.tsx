import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppProvider } from "@/contexts/AppContext";
import UserInfoTab from "@/components/tabs/UserInfoTab";
import InebriationLevelTab from "@/components/tabs/InebriationLevelTab";
import DrinksTab from "@/components/tabs/DrinksTab";
import TimelineTab from "@/components/tabs/TimelineTab";
import ResultsTab from "@/components/tabs/ResultsTab";
import MenuScannerTab from "@/components/tabs/MenuScannerTab";
import FeedbackTab from "@/components/tabs/FeedbackTab";
import GraphicsSheet from "@/components/settings/GraphicsSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings, User, Monitor, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("target-buzz");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AppProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Settings className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-2">
                    <button 
                      onClick={() => navigate("/account")}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted transition-colors"
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
                      <span>Account</span>
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => navigate("/admin/feedback")}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted transition-colors"
                      >
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                    <GraphicsSheet>
                      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted transition-colors">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                        <span>Graphics</span>
                      </button>
                    </GraphicsSheet>
                  </div>
                </SheetContent>
              </Sheet>
              {isAuthenticated === false && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 cursor-pointer"
                  onClick={() => navigate("/auth")}
                >
                  Sign up
                </Badge>
              )}
            </div>
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                DrinkSmart Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your drinking responsibly with personalized insights
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="target-buzz">Target Buzz</TabsTrigger>
              <TabsTrigger value="user-info">User Info</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="menu-scanner">Menu Scanner</TabsTrigger>
              <TabsTrigger value="drinks">Drinks</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>

            <TabsContent value="target-buzz">
              <InebriationLevelTab onNext={() => setActiveTab("user-info")} />
            </TabsContent>

            <TabsContent value="user-info">
              <UserInfoTab onNext={() => setActiveTab("results")} />
            </TabsContent>

            <TabsContent value="results">
              <ResultsTab onNavigateToDrinks={() => setActiveTab("menu-scanner")} />
            </TabsContent>

            <TabsContent value="menu-scanner">
              <MenuScannerTab onNext={() => setActiveTab("drinks")} />
            </TabsContent>

            <TabsContent value="drinks">
              <DrinksTab onNext={() => setActiveTab("timeline")} />
            </TabsContent>

            <TabsContent value="timeline">
              <TimelineTab onNext={() => setActiveTab("results")} />
            </TabsContent>

            <TabsContent value="feedback">
              <FeedbackTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppProvider>
  );
};

export default Dashboard;
