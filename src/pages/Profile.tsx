import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  User,
  LogOut,
  Trash2,
  Wine,
  Sparkles,
  MessageSquare,
  Shield,
  Moon,
  Sun,
  Activity,
  Heart,
} from "lucide-react";
import { isAnonymousSession } from "@/lib/anonymousAuth";
import type { Session } from "@supabase/supabase-js";
import { StatsForm } from "@/components/onboarding/StatsForm";
import { PreferencesPicker } from "@/components/onboarding/PreferencesPicker";
import type { PreferenceData } from "@/lib/preferences";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import FeedbackTab from "@/components/tabs/FeedbackTab";

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

  const isAnonymous = isAnonymousSession(session);
  const isDark = theme === "dark";

  const handleStatsSubmit = async (metrics: UserMetricsData) => {
    setSavingMetrics(true);
    const ok = await saveMetrics(metrics);
    setSavingMetrics(false);
    if (ok) {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              {isAnonymous
                ? "You're using a guest account. Sign up to save across devices."
                : session?.user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              {profileRow?.avatar_url ? (
                <img
                  src={profileRow.avatar_url}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">
                  {profileRow?.username || (isAnonymous ? "Guest" : "User")}
                </p>
                {isAnonymous && (
                  <p className="text-xs text-muted-foreground">Anonymous session</p>
                )}
              </div>
            </div>
            {isAnonymous ? (
              <Button onClick={() => navigate("/auth")} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                Save your progress
              </Button>
            ) : (
              <Button onClick={handleSignOut} variant="destructive" className="w-full gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            )}
          </CardContent>
        </Card>

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

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Your stats
            </CardTitle>
            <CardDescription>
              Used to compute how much alcohol gets you to your buzz target.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <StatsForm
                initial={savedMetrics}
                onSubmit={handleStatsSubmit}
                submitLabel="Save stats"
                submitting={savingMetrics}
              />
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Drink preferences
            </CardTitle>
            <CardDescription>
              We'll lean into what you like and skip what you don't.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesPicker
              initial={preferences}
              onChange={handlePreferencesChange}
            />
          </CardContent>
        </Card>

        {/* Feedback (everyone can submit) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback
            </CardTitle>
            <CardDescription>Found a bug or have an idea? Tell us.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Saved drinks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wine className="h-5 w-5" />
              Saved custom drinks
            </CardTitle>
            <CardDescription>Your library of custom drinks.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Admin (admins only) */}
        {isAdmin && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin
              </CardTitle>
              <CardDescription>Restricted area — admins only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/admin/feedback")}
              >
                <MessageSquare className="h-4 w-4" />
                Manage feedback
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
