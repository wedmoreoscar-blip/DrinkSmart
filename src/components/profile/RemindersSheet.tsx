import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type RemindersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
};

export const RemindersSheet = ({ open, onOpenChange, enabled, onToggle }: RemindersSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom">
      <SheetHeader>
        <SheetTitle className="text-title font-medium">Reminders</SheetTitle>
      </SheetHeader>
      <div className="mt-4 flex h-tap items-center justify-between">
        <Label
          htmlFor="profile-drink-reminders"
          className="cursor-pointer text-body font-normal normal-case text-foreground"
        >
          Drink reminders
        </Label>
        <Switch
          id="profile-drink-reminders"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>
    </SheetContent>
  </Sheet>
);
