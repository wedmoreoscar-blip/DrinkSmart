import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Monitor } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface GraphicsSheetProps {
  children: React.ReactNode;
}

const GraphicsSheet = ({ children }: GraphicsSheetProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-[280px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Graphics Settings
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GraphicsSheet;
