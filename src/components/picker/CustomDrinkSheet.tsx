import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  NO_NUMBER_SPINNER,
  NUMERIC_FIELD_INPUT_MODE,
  numericFieldText,
  parseNumericField,
  type NumericFieldKey,
} from "@/lib/numericField";
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

// Tab order, and the order Enter walks: strength, serve, then price submits.
const FIELD_ORDER: NumericFieldKey[] = ["abv", "serve", "price"];

const EMPTY_VALUES: Record<NumericFieldKey, number | null> = { abv: null, serve: null, price: null };
const EMPTY_TEXTS: Record<NumericFieldKey, string> = { abv: "", serve: "", price: "" };

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
  const [values, setValues] = useState<Record<NumericFieldKey, number | null>>(EMPTY_VALUES);
  // The committed number is clamped on every keystroke, so the raw text is kept
  // alongside it: without this a half-typed "4." or a below-minimum "5" would be
  // rewritten under the user mid-entry.
  const [texts, setTexts] = useState<Record<NumericFieldKey, string>>(EMPTY_TEXTS);
  const [keepIt, setKeepIt] = useState(false);
  const [saveToAccount, setSaveToAccount] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedListOpen, setSavedListOpen] = useState(false);
  const fieldRefs = useRef<Partial<Record<NumericFieldKey, HTMLInputElement | null>>>({});

  useEffect(() => {
    if (open) {
      setName("");
      setValues(EMPTY_VALUES);
      setTexts(EMPTY_TEXTS);
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

  const handleChange = (key: NumericFieldKey, text: string) => {
    setTexts((current) => ({ ...current, [key]: text }));
    setValues((current) => ({ ...current, [key]: parseNumericField(key, text) }));
    clearError(key);
  };

  // Resolve the divergence the per-keystroke clamp allows: once the user leaves
  // the field, show them the number that was actually committed.
  const normalizeField = (key: NumericFieldKey) => {
    setTexts((current) => ({
      ...current,
      [key]: numericFieldText(parseNumericField(key, current[key])),
    }));
  };

  const handleFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>, key: NumericFieldKey) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const next = FIELD_ORDER[FIELD_ORDER.indexOf(key) + 1];
    if (next) fieldRefs.current[next]?.focus();
    else attemptAdd();
  };

  const applySaved = (drink: SavedDrink) => {
    setName(drink.drink_name);
    const savedPrice = drink.price ?? null;
    setValues({ abv: drink.abv, serve: drink.serving_ml, price: savedPrice });
    setTexts({
      abv: numericFieldText(drink.abv),
      serve: numericFieldText(drink.serving_ml),
      price: numericFieldText(savedPrice),
    });
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
            {/* Geometry is load-bearing: the label and unit overlays above are
                absolutely positioned against this exact grid — 26px of top
                padding, two 56px rows 40px apart, price spanning both columns. */}
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-10 pt-[26px]">
              {FIELD_ORDER.map((key) => (
                <Input
                  key={key}
                  ref={(element) => {
                    fieldRefs.current[key] = element;
                  }}
                  type="number"
                  inputMode={NUMERIC_FIELD_INPUT_MODE[key]}
                  aria-label={CUSTOM_COPY.fields[key]}
                  value={texts[key]}
                  onChange={(event) => handleChange(key, event.target.value)}
                  onBlur={() => normalizeField(key)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onKeyDown={(event) => handleFieldKeyDown(event, key)}
                  className={cn(
                    "pr-8 text-[22px] tabular-nums",
                    NO_NUMBER_SPINNER,
                    key === "price" && "col-span-2",
                    errors[key] && "border-warning",
                  )}
                />
              ))}
            </div>
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
