import { useState, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DrinkFilters = {
  abvRange: { min: number; max: number };
  selectedCategories: string[];
};

type DrinkFilterPopoverProps = {
  filters: DrinkFilters;
  onFiltersChange: (filters: DrinkFilters) => void;
  availableCategories: string[];
  trigger?: ReactNode;
};

const DEFAULT_ABV_MIN = 0;
const DEFAULT_ABV_MAX = 100;

export const DrinkFilterPopover = ({
  filters,
  onFiltersChange,
  availableCategories,
  trigger,
}: DrinkFilterPopoverProps) => {
  const [open, setOpen] = useState(false);

  const hasActiveFilters = useMemo(() => {
    const hasAbvFilter = filters.abvRange.min > DEFAULT_ABV_MIN || filters.abvRange.max < DEFAULT_ABV_MAX;
    const hasCategoryFilter = filters.selectedCategories.length > 0 && 
      filters.selectedCategories.length < availableCategories.length;
    return hasAbvFilter || hasCategoryFilter;
  }, [filters, availableCategories.length]);

  const handleAbvChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      abvRange: { min: values[0], max: values[1] },
    });
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const newCategories = checked
      ? [...filters.selectedCategories, category]
      : filters.selectedCategories.filter((c) => c !== category);
    
    onFiltersChange({
      ...filters,
      selectedCategories: newCategories,
    });
  };

  const handleSelectAllCategories = () => {
    onFiltersChange({
      ...filters,
      selectedCategories: [...availableCategories],
    });
  };

  const handleClearAllCategories = () => {
    onFiltersChange({
      ...filters,
      selectedCategories: [],
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      abvRange: { min: DEFAULT_ABV_MIN, max: DEFAULT_ABV_MAX },
      selectedCategories: [...availableCategories],
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "shrink-0 relative",
              hasActiveFilters && "border-primary text-primary"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-background z-50" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Filter Drinks</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>

          {/* ABV Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">ABV Range</Label>
            <div className="px-2">
              <Slider
                value={[filters.abvRange.min, filters.abvRange.max]}
                onValueChange={handleAbvChange}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{filters.abvRange.min}%</span>
              <span>{filters.abvRange.max}%</span>
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Categories</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllCategories}
                  className="h-6 text-xs px-2"
                >
                  All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllCategories}
                  className="h-6 text-xs px-2"
                >
                  None
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableCategories.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={filters.selectedCategories.includes(category)}
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(category, !!checked)
                    }
                  />
                  <Label
                    htmlFor={`category-${category}`}
                    className="text-xs font-normal cursor-pointer truncate"
                    title={category}
                  >
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
              {filters.abvRange.min > 0 || filters.abvRange.max < 100 ? (
                <span>ABV: {filters.abvRange.min}% - {filters.abvRange.max}%</span>
              ) : null}
              {filters.selectedCategories.length > 0 && 
               filters.selectedCategories.length < availableCategories.length && (
                <span className="block">
                  {filters.selectedCategories.length} of {availableCategories.length} categories
                </span>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DrinkFilterPopover;
