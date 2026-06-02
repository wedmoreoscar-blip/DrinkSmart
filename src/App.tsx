import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import AdminFeedback from "./pages/AdminFeedback";
import NotFound from "./pages/NotFound";
import { ensureSession } from "./lib/anonymousAuth";

const queryClient = new QueryClient();

type SessionState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

const App = () => {
  const [sessionState, setSessionState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    ensureSession().then(({ session, error }) => {
      if (session) {
        setSessionState({ status: "ready" });
      } else {
        setSessionState({
          status: "error",
          message: error?.message ?? "Failed to create a Supabase session.",
        });
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {sessionState.status === "ready" && (
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account" element={<Account />} />
              <Route path="/admin/feedback" element={<AdminFeedback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        )}
        {sessionState.status === "loading" && (
          <div className="min-h-screen bg-background" />
        )}
        {sessionState.status === "error" && (
          <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-card border rounded-lg p-6 space-y-4">
              <div>
                <h1 className="text-xl font-semibold">Can't reach Supabase</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  We couldn't create an anonymous session. The app can't continue
                  until this is fixed.
                </p>
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1">Error from Supabase:</p>
                <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap break-all">
                  {sessionState.message}
                </pre>
              </div>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">Likely fixes:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    In the Supabase dashboard, go to{" "}
                    <span className="font-mono">Authentication → Sign In / Up → Providers</span>
                    {" "}and ensure <strong>Anonymous Sign-Ins</strong> is enabled and saved.
                  </li>
                  <li>
                    Verify <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
                    <span className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</span> in{" "}
                    <span className="font-mono">.env</span> match the project you're configuring.
                  </li>
                  <li>
                    If you have CAPTCHA enabled for anon sign-ins, disable it during dev.
                  </li>
                </ol>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-primary-foreground rounded-md py-2 text-sm font-medium hover:opacity-90"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
