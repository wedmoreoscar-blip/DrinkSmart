import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Session } from "@supabase/supabase-js";
import { isAnonymousSession } from "@/lib/anonymousAuth";
import { AdminGroup } from "@/components/profile/AdminGroup";

type AccountCardProps = {
  session: Session | null;
  isAdmin: boolean;
  username: string | null;
  avatarUrl: string | null;
  onAddEmail: () => void;
  onSignOut: () => void;
  onAdminNavigate: (path: string) => void;
};

export const AccountCard = ({
  session,
  isAdmin,
  username,
  avatarUrl,
  onAddEmail,
  onSignOut,
  onAdminNavigate,
}: AccountCardProps) => {
  const isAnonymous = isAnonymousSession(session);

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
      <AdminGroup isAdmin={isAdmin} onNavigate={onAdminNavigate} />
    </div>
  );
};
