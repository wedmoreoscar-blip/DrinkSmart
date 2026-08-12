import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useSavedDrinks } from "@/hooks/useSavedDrinks";
import { useUserMetrics, type UserMetricsData } from "@/hooks/useUserMetrics";
import { useUserRole } from "@/hooks/useUserRole";
import { Moon, Sun, Trash2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import type { PreferenceData } from "@/lib/preferences";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import FeedbackTab from "@/components/tabs/FeedbackTab";
import { BodyCard } from "@/components/profile/BodyCard";
import { StatsSheet } from "@/components/profile/StatsSheet";
import { PreferencesCard } from "@/components/profile/PreferencesCard";
import { AccountCard } from "@/components/profile/AccountCard";
import { countMovedDrinks } from "@/components/profile/replan";

type ProfileRow = {
  username: string | null;
  avatar_url: string | null;
};

// The app ships dark-only: the light palette in index.css is derived rather
// than designed, so it is not exposed. Flip this to true once Claude Design
// delivers a real light theme, and drop forcedTheme from the provider in
// main.tsx at the same time. The theme plumbing below stays wired either way.
const LIGHT_THEME_AVAILABLE = false;

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { savedDrinks, loading: drinksLoading, deleteDrink } = useSavedDrinks();
  const { isAdmin } = useUserRole();
  const {
    savedMetrics,
    preferences,
    theme: profileTheme,
    saveMetrics,
    savePreferences,
    saveTheme,
    loading: metricsLoading,
  } = useUserMetrics();

  const [session, setSession] = useState<Session | null>(null);
  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      if (!s?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", s.user.id)
        .maybeSingle();

      setProfileRow(data ?? null);
    };
    fetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync persisted theme into next-themes on first load. Skipped while the app
  // is dark-only, so a stored "light" is left untouched rather than being
  // written over — it comes back intact when light mode ships.
  useEffect(() => {
    if (!LIGHT_THEME_AVAILABLE) return;
    if (!metricsLoading && profileTheme && profileTheme !== theme) {
      setTheme(profileTheme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsLoading, profileTheme]);

  const isDark = theme === "dark";

  const handleMetricsSave = async (metrics: UserMetricsData) => {
    setSavingMetrics(true);
    const ok = await saveMetrics(metrics);
    setSavingMetrics(false);
    if (!ok) return;
    setStatsOpen(false);
    const moved = savedMetrics ? countMovedDrinks(savedMetrics, metrics) : null;
    if (moved !== null && moved > 0) {
      toast({ title: `Timeline re-planned — ${moved} drinks moved`, variant: "destructive" });
    } else {
      toast({ title: "Stats saved" });
    }
  };

  const handlePreferencesChange = (prefs: PreferenceData) => {
    // Auto-save preferences on change (debounce by relying on user moving sliders/chips quickly)
    savePreferences(prefs);
  };

  const handleThemeChange = (next: boolean) => {
    const t = next ? "dark" : "light";
    setTheme(t);
    saveTheme(t);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/auth");
  };

  return (
    <div className="-m-4 animate-in space-y-2.5 px-5 pt-5 fade-in duration-500 md:-m-6">
      <div className="text-label font-medium uppercase text-muted-foreground">Profile</div>

      {/* Body — stats as figures, not a settings list */}
      <BodyCard
        metrics={savedMetrics}
        loading={metricsLoading}
        onEdit={() => setStatsOpen(true)}
      />

      {/* Preferences — two rows, both sheet-backed */}
      <PreferencesCard preferences={preferences} onChange={handlePreferencesChange} />

      {/* Account — a fact, never a nag */}
      <AccountCard
        session={session}
        isAdmin={isAdmin}
        username={profileRow?.username ?? null}
        avatarUrl={profileRow?.avatar_url ?? null}
        onAddEmail={() => navigate("/auth")}
        onSignOut={handleSignOut}
        onAdminNavigate={(path) => navigate(path)}
      />

      {/* Theme. Hidden while the app is dark-only — a switch that cannot
          change anything is worse than no switch. See LIGHT_THEME_AVAILABLE. */}
      {LIGHT_THEME_AVAILABLE && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="profile-theme-toggle" className="cursor-pointer">
                Dark mode
              </Label>
              <Switch
                id="profile-theme-toggle"
                checked={isDark}
                onCheckedChange={handleThemeChange}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback (everyone can submit) */}
      <div className="rounded-lg bg-card p-4">
        <div className="mb-0.5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
          Feedback
        </div>
        <Sheet open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              Send feedback
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Send feedback</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FeedbackTab />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Saved drinks */}
      <div className="rounded-lg bg-card p-4">
        <div className="mb-0.5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
          Saved custom drinks
        </div>
        {drinksLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : savedDrinks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No saved drinks yet. Create a custom drink and check "Save this drink" to add it here.
          </p>
        ) : (
          <div className="space-y-2">
            {savedDrinks.map((drink) => (
              <div
                key={drink.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium">{drink.drink_name}</p>
                  <p className="text-sm text-muted-foreground">{drink.abv}% ABV</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteDrink(drink.id)}
                  className="hover:bg-destructive/20 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <StatsSheet
        open={statsOpen}
        onOpenChange={setStatsOpen}
        initial={savedMetrics}
        saving={savingMetrics}
        onSave={handleMetricsSave}
      />
    </div>
  );
};

export default Profile;
