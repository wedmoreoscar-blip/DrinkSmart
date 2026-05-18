import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * Ensures a Supabase session exists. If none, signs the user in anonymously.
 * Idempotent — safe to call on every app mount.
 */
export async function ensureSession(): Promise<Session | null> {
  const { data: { session }, error: getError } = await supabase.auth.getSession();

  if (getError) {
    console.error("Failed to get session:", getError);
    return null;
  }

  if (session) {
    return session;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    console.error("Failed to sign in anonymously:", error);
    return null;
  }

  return data.session;
}

export function isAnonymousSession(session: Session | null | undefined): boolean {
  return Boolean(session?.user?.is_anonymous);
}
