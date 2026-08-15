import { supabase } from "@/integrations/supabase/client";
import type { AuthError, Session } from "@supabase/supabase-js";

export type EnsureSessionResult =
  | { session: Session; error: null }
  | { session: null; error: AuthError | { message: string } };

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
 * Ensures a server-refreshed Supabase session exists. A cached session is
 * refreshed once before routes mount; its local expiry metadata is not trusted.
 * If none exists, signs the user in anonymously. Idempotent — safe to call on
 * every app mount.
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
