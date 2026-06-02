import { supabase } from "@/integrations/supabase/client";
import type { AuthError, Session } from "@supabase/supabase-js";

export type EnsureSessionResult =
  | { session: Session; error: null }
  | { session: null; error: AuthError | { message: string } };

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

  if (session) {
    return { session, error: null };
  }

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

export function isAnonymousSession(session: Session | null | undefined): boolean {
  return Boolean(session?.user?.is_anonymous);
}
