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
import type { Session } from "@supabase/supabase-js";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(2, "Username must be at least 2 characters").optional(),
});

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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect to dashboard only when the session belongs to a real (non-anonymous) user.
    // Anonymous users stay on this page to upgrade their account.
    const handleSession = (session: Session | null) => {
      if (!session?.user) return;
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
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      if (isSignUp) {
        if (isUpgrade) {
          // Anonymous → permanent upgrade is a two-step process per Supabase docs:
          //   1. updateUser({ email }) links the email identity and sends a verification link.
          //   2. After verification, updateUser({ password }) can set a password.
          // Trying to set both in one call fails because the password can't be set
          // before the email is verified. We do step 1 here, then send a password-set
          // email so the user can complete step 2 from their inbox.
          const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            email,
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
              throw updateError;
            }
            setLoading(false);
            return;
          }

          const userId = updateData.user?.id;
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

          // Send a password-set email so the user can set a password after
          // verifying. They click the verification link in email #1, then the
          // password-reset link in email #2. (No password is captured here.)
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });

          toast({
            title: "Check your email",
            description: `We've sent a verification link to ${email}. After verifying, follow the password-set link to finish.`,
          });
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