/**
 * Whether an email address already belongs to the account asking about it.
 *
 * This decides a routing choice on the anonymous → account upgrade: linking an
 * address for the first time (`updateUser`) versus reissuing the verification
 * for one already linked (`resend`). Getting it wrong in the permissive
 * direction would offer to re-send someone else's verification, so the match is
 * exact apart from case and surrounding whitespace — never a prefix or domain
 * comparison.
 *
 * A pending upgrade lives in `new_email` until the link is clicked; `email` is
 * the confirmed address. Both count as the account's own.
 */

/** A shape-only view of the fields consulted, so callers need no Supabase types. */
export type AccountEmails = {
  email?: string | null;
  new_email?: string | null;
};

export function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isOwnEmail(user: AccountEmails | null | undefined, emailAddress: string): boolean {
  if (!user) return false;
  return sameAddress(user.new_email, emailAddress) || sameAddress(user.email, emailAddress);
}
