import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {isDark ? (
          <Moon className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Sun className="h-5 w-5 text-muted-foreground" />
        )}
        <Label htmlFor="theme-toggle" className="cursor-pointer">
          Dark Mode
        </Label>
      </div>
      <Switch
        id="theme-toggle"
        checked={isDark}
        onCheckedChange={handleToggle}
      />
    </div>
  );
};

export default ThemeToggle;
