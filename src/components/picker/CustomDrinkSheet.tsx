import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KeypadFieldGroup } from "@/components/ui/keypad-field-group";
import { cn } from "@/lib/utils";
import type { SavedDrink } from "@/hooks/useSavedDrinks";
import { CUSTOM_COPY, CUSTOM_ERRORS } from "./picker-copy";

export type CustomDrinkDraft = {
  name: string;
  abv: number | null;
  serve: number | null;
  price: number | null;
  keepIt: boolean;
  saveToAccount: boolean;
};

type CustomDrinkSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string | null;
  targetMl: number | null;
  onAdd: (draft: CustomDrinkDraft) => void;
  committedMl?: number;
  ceilingMl?: number | null;
  canSaveToAccount: boolean;
  savedDrinks: SavedDrink[];
};

const EMPTY_VALUES: Record<string, number | null> = { abv: null, serve: null, price: null };

const ChevronIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-none">
    <path d="M6.5 4L12 9l-5.5 5" stroke="#75798c" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const CustomDrinkSheet = ({
  open,
  onOpenChange,
  venueName,
  targetMl,
  onAdd,
  committedMl = 0,
  ceilingMl = null,
  canSaveToAccount,
  savedDrinks,
}: CustomDrinkSheetProps) => {
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, number | null>>(EMPTY_VALUES);
  const [keepIt, setKeepIt] = useState(false);
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedListOpen, setSavedListOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setValues(EMPTY_VALUES);
      setKeepIt(false);
      setSaveToAccount(false);
      setErrors({});
      setSavedListOpen(false);
    }
  }, [open]);

  const abv = values.abv ?? null;
  const serve = values.serve ?? null;
  const price = values.price ?? null;
  const ml = ((serve ?? 0) * (abv ?? 0)) / 100;
  const pct = targetMl && targetMl > 0 ? (ml / targetMl) * 100 : 0;

  const overCeiling = ceilingMl != null && ml > 0 && committedMl + ml > ceilingMl;

  const clearError = (key: string) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleCommit = (key: string, value: number | null) => {
    setValues((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  const applySaved = (drink: SavedDrink) => {
    setName(drink.drink_name);
    setValues({ abv: drink.abv, serve: drink.serving_ml, price: null });
    setErrors({});
    setSavedListOpen(false);
  };

  const attemptAdd = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = CUSTOM_ERRORS.name;
    if (abv == null) next.abv = CUSTOM_ERRORS.abv;
    if (serve == null) next.serve = CUSTOM_ERRORS.serve;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onAdd({ name: name.trim(), abv, serve, price, keepIt, saveToAccount });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-2xl overflow-y-auto"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <SheetTitle className="text-[24px] font-medium leading-[1.15] tracking-[-0.015em]">
          {CUSTOM_COPY.title}
        </SheetTitle>
        <div className="mt-4 flex flex-col gap-3.5">
          <div>
            <Label className={cn("block leading-[1.2]", errors.name && "text-warning")}>{CUSTOM_COPY.fields.name}</Label>
            <div className="relative mt-2">
              <Input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearError("name");
                }}
                className={cn("pr-14", errors.name && "border-warning")}
              />
              {savedDrinks.length > 0 && (
                <Popover open={savedListOpen} onOpenChange={setSavedListOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Choose a saved drink"
                      className="absolute right-0 top-0 flex h-tap w-14 items-center justify-center"
                    >
                      <ChevronIcon />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={4}
                    className="max-h-72 w-80 overflow-y-auto p-1"
                  >
                    {savedDrinks.map((drink) => (
                      <button
                        key={drink.id}
                        type="button"
                        onClick={() => applySaved(drink)}
                        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-md px-3 text-left hover:bg-accent"
                      >
                        <span className="truncate text-body text-foreground">{drink.drink_name}</span>
                        <span className="flex-none text-[15px] leading-[1.3] tabular-nums text-muted-foreground">
                          {CUSTOM_COPY.savedRow(drink.abv, drink.serving_ml)}
                        </span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {errors.name && <div className="mt-2 text-note text-warning">{errors.name}</div>}
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 text-label leading-[1.2] uppercase text-muted-foreground">
              <div className="absolute left-0 top-0">{CUSTOM_COPY.fields.abv}</div>
              <div className="absolute left-[calc(50%+5px)] top-0">{CUSTOM_COPY.fields.serve}</div>
              <div className="absolute left-0 top-24">{CUSTOM_COPY.fields.price}</div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 text-body leading-none text-muted-foreground tabular-nums">
              <div className="absolute left-0 top-11 w-[calc(50%-5px)] text-right">%</div>
              <div className="absolute left-[calc(50%+5px)] top-11 w-[calc(50%-5px)] text-right">ml</div>
              <div className="absolute left-0 top-[8.75rem] w-full text-right">£</div>
            </div>
            <KeypadFieldGroup
              fields={[
                { key: "abv", unit: "%", value: abv },
                { key: "serve", unit: "ml", value: serve, integer: true },
                { key: "price", unit: "£", value: price },
              ]}
              onCommit={handleCommit}
              onAdvance={attemptAdd}
              emptyIsAllowed={false}
              fieldLayout="custom-drink"
              className="bg-transparent px-0 pb-0 pt-[26px] [&>div:first-of-type]:mt-0 [&>div:first-of-type]:gap-x-2.5 [&>div:first-of-type]:gap-y-10 [&>div:first-of-type>button]:justify-between [&>div:first-of-type>button]:px-4 [&>div:first-of-type>button]:text-[22px] [&>div:nth-of-type(2)]:hidden"
            />
          </div>
          {(errors.abv || errors.serve) && (
            <div className="flex flex-col gap-1">
              {errors.abv && <div className="text-note text-warning">{errors.abv}</div>}
              {errors.serve && <div className="text-note text-warning">{errors.serve}</div>}
            </div>
          )}
          <div className="flex min-h-14 items-center gap-3.5">
            <Checkbox
              id="keep-it"
              checked={keepIt}
              onCheckedChange={(checked) => setKeepIt(!!checked)}
            />
            <Label
              htmlFor="keep-it"
              className="text-body font-normal normal-case tracking-normal leading-[1.3] text-foreground"
            >
              {CUSTOM_COPY.keepIt(venueName ?? "this venue")}
            </Label>
          </div>
          <div className="flex min-h-14 items-center gap-3.5">
            <Checkbox
              id="save-to-account"
              checked={saveToAccount}
              disabled={!canSaveToAccount}
              onCheckedChange={(checked) => setSaveToAccount(!!checked)}
            />
            <Label
              htmlFor="save-to-account"
              className={cn(
                "text-body font-normal normal-case tracking-normal leading-[1.3] text-foreground",
                !canSaveToAccount && "text-muted-foreground",
              )}
            >
              {CUSTOM_COPY.saveToAccount}
            </Label>
          </div>
          <div className="-mt-[10px] text-note text-muted-foreground">{CUSTOM_COPY.computed(ml, pct)}</div>
          <Button variant="default" size="act" className="w-full" disabled={overCeiling} onClick={attemptAdd}>
            {CUSTOM_COPY.cta}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
