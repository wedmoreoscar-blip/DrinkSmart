import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Session } from "@supabase/supabase-js";
import { isAnonymousSession } from "@/lib/anonymousAuth";

type AccountCardProps = {
  session: Session | null;
  username: string | null;
  avatarUrl: string | null;
  onAddEmail: () => void;
  onSignOut: () => void;
};

export const AccountCard = ({
  session,
  username,
  avatarUrl,
  onAddEmail,
  onSignOut,
}: AccountCardProps) => {
  const isAnonymous = isAnonymousSession(session);

  // A null session means "not known yet", not "signed in". Falling through to
  // the signed-in branch flashed an avatar, an email and a Sign out button on
  // every visit to this tab before the session resolved, and then swapped them
  // for the anonymous card. Nothing is claimed about the account until one is
  // actually loaded.
  if (!session) {
    return (
      <div className="rounded-lg bg-card p-4">
        <div className="mb-1.5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
          Account
        </div>
        <div className="text-lead text-muted-foreground">Checking…</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-1.5 text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
        Account
      </div>
      {isAnonymous ? (
        <>
          <div className="text-lead text-foreground">Anonymous — this phone only</div>
          <div className="mt-1 text-note text-muted-foreground">
            An email carries your stats and your nights to another phone.
          </div>
          <Button size="act" className="mt-3.5 w-full" onClick={onAddEmail}>
            Add an email
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-16 w-16 rounded-full border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-lead text-foreground">{username || "User"}</p>
              <p className="truncate text-note text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
          <Button variant="destructive" className="mt-3.5 w-full gap-2" onClick={onSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </>
      )}
    </div>
  );
};
