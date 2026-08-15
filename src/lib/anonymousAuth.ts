import { supabase } from "@/integrations/supabase/client";
import type { AuthError, Session } from "@supabase/supabase-js";

export type EnsureSessionResult =
  | { session: Session; error: null }
  | { session: null; error: AuthError | { message: string } };

const SESSION_EXPIRY_SKEW_SECONDS = 60;

const isExpiredOrExpiring = (session: Session): boolean =>
  typeof session.expires_at !== "number" ||
  session.expires_at <= Math.floor(Date.now() / 1000) + SESSION_EXPIRY_SKEW_SECONDS;

async function createAnonymousSession(): Promise<EnsureSessionResult> {
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    console.error("Failed to sign in anonymously:", error);
    return { session: null, error };
  }

  if (!data.session) {
    return {
      session: null,
      error: { message: "signInAnonymously returned no session" },
    };
  }

  return { session: data.session, error: null };
}

/**
 * Ensures a Supabase session exists. If none, signs the user in anonymously.
 * Idempotent — safe to call on every app mount.
 *
 * Returns an explicit { session, error } tuple so the caller can render a
 * visible error if anon auth is disabled or otherwise fails.
 */
export async function ensureSession(): Promise<EnsureSessionResult> {
  const { data: { session }, error: getError } = await supabase.auth.getSession();

  if (getError) {
    console.error("Failed to get session:", getError);
    return { session: null, error: getError };
  }

  if (session && !isExpiredOrExpiring(session)) {
    return { session, error: null };
  }

  if (session) {
    const { data, error } = await supabase.auth.refreshSession();
    if (data.session) return { session: data.session, error: null };

    if (!isAnonymousSession(session)) {
      const refreshError = error ?? { message: "Session refresh returned no session" };
      console.error("Failed to refresh authenticated session:", refreshError);
      return { session: null, error: refreshError };
    }
  }

  return createAnonymousSession();
}

export function isAnonymousSession(session: Session | null | undefined): boolean {
  return Boolean(session?.user?.is_anonymous);
}
