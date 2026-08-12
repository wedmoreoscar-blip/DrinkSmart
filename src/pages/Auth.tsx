import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, Upload, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { isAnonymousSession } from "@/lib/anonymousAuth";
import { cn } from "@/lib/utils";
import { WhatComesWithYou } from "@/components/auth/WhatComesWithYou";
import { StepStrip, type StepMark } from "@/components/auth/StepStrip";
import type { Session } from "@supabase/supabase-js";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(2, "Username must be at least 2 characters").optional(),
});

// ── 4m / 4n §G — literal copy from the design handoff. Use verbatim. ────────
const AUTH_COPY = {
  title: "Make this a real account",
  body: "You are already signed in, anonymously. This adds an email to that same account — nothing moves, nothing is copied.",
  stepsHeader: "It takes two emails",
  steps: ["You give us an email", "Tap the link that confirms it", "A second link sets a password"],
  why: "Confirming and setting a password cannot share a step.",
  cta: "Send the first link",
  footnote: "Until you finish, the app works exactly as it does now.",
};

const AUTH_WAIT_COPY = {
  title: (email: string) => "Check " + email,
  body: "The link in it confirms the address. The password link is the one after that.",
  stepsHeader: "Where you are",
  steps: ["Email given", "Confirm link sent", "Password link"],
  notPaused: "Nothing is paused. Tonight's plan, your stats and the timeline all work while this sits here.",
  since: (d: Date) =>
    "Signed in as this account since " + fmtDate(d) + ". Finishing changes nothing about it except the password.",
  leave: "Back to tonight",
  resend: "Send it again",
  resendCooldown: (s: number) =>
    "in " + Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"),
  change: "Another email",
};

function fmtDate(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return d.getDate() + " " + months[d.getMonth()];
}

// The waiting state can last days and is reachable from Profile, so it is
// persisted (versioned key, per the repo's localStorage convention).
const WAIT_KEY = "drinksmart.auth.upgradeWaiting.v1";
const RESEND_COOLDOWN_S = 60;

type UpgradeWaiting = { email: string; userId: string | null; sentAt: number };

function loadUpgradeWaiting(): UpgradeWaiting | null {
  try {
    const raw = window.localStorage.getItem(WAIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.email !== "string" || typeof parsed.sentAt !== "number") return null;
    return {
      email: parsed.email,
      userId: typeof parsed.userId === "string" ? parsed.userId : null,
      sentAt: parsed.sentAt,
    };
  } catch {
    return null;
  }
}

function saveUpgradeWaiting(waiting: UpgradeWaiting): void {
  window.localStorage.setItem(WAIT_KEY, JSON.stringify(waiting));
}

function clearUpgradeWaiting(): void {
  window.localStorage.removeItem(WAIT_KEY);
}

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpgrade, setIsUpgrade] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>({});
  const [session, setSession] = useState<Session | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [waiting, setWaiting] = useState<UpgradeWaiting | null>(() => loadUpgradeWaiting());
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect to dashboard only when the session belongs to a real (non-anonymous) user.
    // Anonymous users stay on this page to upgrade their account.
    const handleSession = (session: Session | null) => {
      if (!session?.user) return;
      setSession(session);
      if (isAnonymousSession(session)) {
        setIsUpgrade(true);
        setIsSignUp(true);
      } else {
        navigate("/dashboard");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // The 4n cooldown reads a live clock so "in 0:42" ticks down while waiting.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile);

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // The first-link send: updateUser({ email }) links the identity and sends the
  // verification email; resetPasswordForEmail sends the password-set link. Both
  // steps are load-bearing — the password cannot be set before the email is
  // verified — so they are kept exactly as they were.
  const sendUpgradeEmails = async (emailAddress: string): Promise<{ ok: boolean; userId: string | null }> => {
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      email: emailAddress,
    });

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("already exists")) {
        toast({
          title: "Email already in use",
          description: "That email is already linked to another account. Try signing in instead.",
          variant: "destructive",
        });
      } else if (msg.includes("manual linking") || msg.includes("identity linking")) {
        toast({
          title: "Manual linking is disabled",
          description: "Enable 'Manual identity linking' in your Supabase Auth settings, then try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: updateError.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
      return { ok: false, userId: null };
    }

    await supabase.auth.resetPasswordForEmail(emailAddress, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { ok: true, userId: updateData.user?.id ?? null };
  };

  const handleResend = async () => {
    if (!waiting) return;
    setResending(true);
    try {
      const result = await sendUpgradeEmails(waiting.email);
      if (result.ok) {
        const next = { ...waiting, sentAt: Date.now() };
        setWaiting(next);
        saveUpgradeWaiting(next);
      }
    } finally {
      setResending(false);
    }
  };

  const handleAnotherEmail = () => {
    clearUpgradeWaiting();
    setWaiting(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const emailValidation = z.string().email("Invalid email address").safeParse(email);
      
      if (!emailValidation.success) {
        setErrors({ email: emailValidation.error.errors[0].message });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link. Please check your inbox.",
      });

      setIsForgotPassword(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // For anonymous upgrade we only collect the email; the password is set
      // later via the password-reset email flow (see handleSubmit upgrade branch).
      const validation = authSchema.safeParse({
        email,
        password: isUpgrade ? "placeholder-not-used" : password,
        username: isSignUp ? username : undefined,
      });

      if (!validation.success) {
        const fieldErrors: typeof errors = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof typeof errors] = err.message;
          }
        });
        if (isUpgrade) {
          // 1l error copy names what is needed, never what the user did wrong.
          if (fieldErrors.email) {
            const trimmed = email.trim();
            fieldErrors.email =
              trimmed.length === 0
                ? "Needs an email address"
                : trimmed.endsWith("@")
                  ? `Needs a domain — ${trimmed}example.com`
                  : "Needs a domain — name@example.com";
          }
          if (fieldErrors.username) {
            fieldErrors.username = "Needs at least 2 characters";
          }
        }
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      if (isSignUp) {
        if (isUpgrade) {
          const sent = await sendUpgradeEmails(email);
          if (!sent.ok) {
            setLoading(false);
            return;
          }

          const userId = sent.userId;
          if (userId) {
            let avatarUrl: string | null = null;
            if (avatarFile) {
              avatarUrl = await uploadAvatar(userId);
            }

            const { error: profileError } = await supabase.from("profiles").upsert(
              {
                user_id: userId,
                username,
                ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
              },
              { onConflict: "user_id" }
            );

            if (profileError) {
              console.error("Profile upsert error:", profileError);
            }
          }

          // Move to the waiting state — it reads back the user's position in
          // the flow and can last days, so it is persisted.
          const next = { email, userId: userId ?? session?.user?.id ?? null, sentAt: Date.now() };
          setWaiting(next);
          saveUpgradeWaiting(next);
        } else {
          const redirectUrl = `${window.location.origin}/dashboard`;

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectUrl,
            },
          });

          if (error) {
            if (error.message.includes("already registered")) {
              toast({
                title: "Account exists",
                description: "This email is already registered. Please sign in instead.",
                variant: "destructive",
              });
            } else {
              throw error;
            }
            setLoading(false);
            return;
          }

          if (data.user) {
            let avatarUrl: string | null = null;
            if (avatarFile) {
              avatarUrl = await uploadAvatar(data.user.id);
            }

            const { error: profileError } = await supabase.from("profiles").insert({
              user_id: data.user.id,
              username,
              avatar_url: avatarUrl,
            });

            if (profileError) {
              console.error("Profile creation error:", profileError);
            }
          }

          toast({
            title: "Check your email!",
            description: "We've sent you a verification link. Please check your inbox to verify your account.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Invalid credentials",
              description: "The email or password you entered is incorrect.",
              variant: "destructive",
            });
          } else if (error.message.includes("Email not confirmed")) {
            toast({
              title: "Email not verified",
              description: "Please check your inbox and verify your email before signing in.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
          setLoading(false);
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cooldownRemaining = waiting
    ? Math.max(0, RESEND_COOLDOWN_S - Math.floor((now - waiting.sentAt) / 1000))
    : 0;

  // 4m / 4n — the anonymous-upgrade branch only. Sign-in, sign-up and
  // forgot-password keep their existing markup below.
  if (isUpgrade) {
    const effectiveWaiting =
      waiting && waiting.userId === session?.user?.id ? waiting : null;

    const topBar = (
      <div className="flex h-tap flex-none items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          aria-label="Back"
          className="grid h-tap w-tap flex-none place-items-center"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M13 4.5L6.5 11l6.5 6.5" stroke="#e9e9ed" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex-1 text-body text-foreground">Account</div>
      </div>
    );

    const fieldError = (message: string) => (
      <div className="mt-2 flex items-start gap-2.5">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 flex-none">
          <circle cx="10" cy="10" r="8" stroke="#d29a51" strokeWidth="1.6" />
          <path d="M10 6v5" stroke="#d29a51" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="10" cy="14" r="1" fill="#d29a51" />
        </svg>
        <p className="text-note text-warning">{message}</p>
      </div>
    );

    if (effectiveWaiting) {
      const since = session?.user?.created_at ? new Date(session.user.created_at) : null;
      return (
        <div className="flex min-h-screen flex-col bg-background px-5 pt-[22px]">
          {topBar}
          <div className="flex flex-1 flex-col overflow-y-auto pb-2">
            <h1 className="text-title text-foreground">{AUTH_WAIT_COPY.title(effectiveWaiting.email)}</h1>
            <p className="mt-2 text-note text-muted-foreground">{AUTH_WAIT_COPY.body}</p>
            <div className="mt-5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
              {AUTH_WAIT_COPY.stepsHeader}
            </div>
            <div className="mt-0.5">
              <StepStrip steps={AUTH_WAIT_COPY.steps} marks={["done", "current", "pending"] as StepMark[]} />
            </div>
            <div
              className="mx-0 my-3 h-px"
              style={{
                background:
                  "linear-gradient(to right,transparent,rgba(233,233,237,.16) 48px,rgba(233,233,237,.16) calc(100% - 48px),transparent)",
              }}
            />
            <div className="rounded-lg bg-card p-[18px]">
              <p className="text-body text-foreground">{AUTH_WAIT_COPY.notPaused}</p>
            </div>
            {since && !Number.isNaN(since.getTime()) && (
              <p className="mt-4 text-micro text-[#75798c]">{AUTH_WAIT_COPY.since(since)}</p>
            )}
          </div>
          <div className="flex-none pt-3">
            <Button size="act" className="w-full" onClick={() => navigate("/dashboard")}>
              {AUTH_WAIT_COPY.leave}
            </Button>
            <div className="mt-2.5 flex gap-2.5">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="flex h-tap flex-1 flex-col items-center justify-center gap-0.5 rounded-ctl shadow-[0_0_0_1px_#383a46] disabled:opacity-50"
              >
                <span className="text-body text-foreground">{AUTH_WAIT_COPY.resend}</span>
                {cooldownRemaining > 0 && (
                  <span className="text-micro tabular-nums text-[#75798c]">
                    {AUTH_WAIT_COPY.resendCooldown(cooldownRemaining)}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleAnotherEmail}
                className="flex h-tap flex-1 items-center justify-center rounded-ctl text-body text-foreground shadow-[0_0_0_1px_#383a46]"
              >
                {AUTH_WAIT_COPY.change}
              </button>
            </div>
            <div className="h-3" />
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="flex min-h-screen flex-col bg-background px-5 pt-[22px]">
        {topBar}
        <div className="flex flex-1 flex-col overflow-y-auto pb-2">
          <h1 className="text-title text-foreground">{AUTH_COPY.title}</h1>
          <p className="mt-2 text-note text-muted-foreground">{AUTH_COPY.body}</p>
          <div className="mt-4">
            <WhatComesWithYou userId={session?.user?.id ?? null} />
          </div>
          <div className="mt-[18px] text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
            {AUTH_COPY.stepsHeader}
          </div>
          <div className="mt-0.5">
            <StepStrip steps={AUTH_COPY.steps} marks={["pending", "pending", "pending"] as StepMark[]} />
          </div>
          <p className="mb-1 mt-1 text-micro text-[#75798c]">{AUTH_COPY.why}</p>
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="upgrade-username"
                className={cn(
                  usernameFocused && !errors.username && "text-primary-hover",
                  errors.username ? "text-warning" : ""
                )}
              >
                Username
              </Label>
              <Input
                id="upgrade-username"
                className="placeholder:text-[#75798c]"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                aria-invalid={!!errors.username}
              />
              {errors.username && fieldError(errors.username)}
            </div>
            <div>
              <Label
                htmlFor="upgrade-email"
                className={cn(
                  emailFocused && !errors.email && "text-primary-hover",
                  errors.email ? "text-warning" : ""
                )}
              >
                Email
              </Label>
              <Input
                id="upgrade-email"
                type="email"
                className="placeholder:text-[#75798c]"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                aria-invalid={!!errors.email}
              />
              {errors.email && fieldError(errors.email)}
            </div>
          </div>
        </div>
        <div className="flex-none pt-3">
          <Button type="submit" size="act" className="w-full" disabled={loading}>
            {loading ? "Sending…" : AUTH_COPY.cta}
          </Button>
          <p className="mt-2.5 text-center text-micro text-[#75798c]">{AUTH_COPY.footnote}</p>
          <div className="h-3" />
        </div>
      </form>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => isForgotPassword ? setIsForgotPassword(false) : navigate("/dashboard")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">
              {isForgotPassword
                ? "Reset Password"
                : isUpgrade && isSignUp
                  ? "Save your progress"
                  : isSignUp
                    ? "Create an account"
                    : "Welcome back"}
            </CardTitle>
          </div>
          <CardDescription>
            {isForgotPassword
              ? "Enter your email to receive a reset link"
              : isUpgrade && isSignUp
                ? "Create a permanent account to keep your stats, preferences, and history across devices."
                : isSignUp
                  ? "Enter your details to create your account"
                  : "Enter your credentials to sign in"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="username"
                          placeholder="Choose a username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {errors.username && (
                        <p className="text-sm text-destructive">{errors.username}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Profile Picture (optional)</Label>
                      <div className="flex items-center gap-4">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="h-16 w-16 rounded-full object-cover border"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border">
                            <User className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <Label
                          htmlFor="avatar"
                          className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          Upload Photo
                        </Label>
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                {!isUpgrade && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                )}
                {isUpgrade && (
                  <p className="text-xs text-muted-foreground -mt-2">
                    You'll set a password from a separate email after verifying your address.
                  </p>
                )}

                {!isSignUp && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        />
                        <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                          Remember me
                        </Label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm">
                {isSignUp ? (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                ) : (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Create one
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;