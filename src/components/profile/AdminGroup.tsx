import { ChevronRight } from "lucide-react";

type AdminGroupProps = {
  isAdmin: boolean;
  onNavigate: (path: string) => void;
};

export const AdminGroup = ({ isAdmin, onNavigate }: AdminGroupProps) => {
  if (!isAdmin) return null;

  return (
    <>
      <div className="mt-0.5 h-px bg-[linear-gradient(to_right,transparent,rgba(233,233,237,.16)_30px,rgba(233,233,237,.16)_calc(100%-30px),transparent)]" />
      <div className="flex items-center gap-2.5 pt-3">
        <span className="text-micro font-medium uppercase tracking-[0.09em] text-muted-foreground">
          Admin
        </span>
        <span className="flex-none rounded-md bg-accent px-[9px] py-[5px] text-micro font-medium tracking-[0.04em] text-primary-hover">
          admin only
        </span>
      </div>
      <button
        type="button"
        onClick={() => onNavigate("/admin/feedback")}
        className="flex h-tap w-full items-center justify-between text-left"
      >
        <span className="text-body text-foreground">Manage feedback</span>
        <ChevronRight className="h-[18px] w-[18px] text-[#75798c]" strokeWidth={1.8} />
      </button>
    </>
  );
};
