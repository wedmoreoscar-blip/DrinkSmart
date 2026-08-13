import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { KeypadFieldGroup } from "@/components/ui/keypad-field-group";
import { cn } from "@/lib/utils";
import { CUSTOM_COPY, CUSTOM_ERRORS } from "./picker-copy";

export type CustomDrinkDraft = {
  name: string;
  abv: number | null;
  serve: number | null;
  price: number | null;
  keepIt: boolean;
};

type CustomDrinkSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string | null;
  targetMl: number | null;
  onAdd: (draft: CustomDrinkDraft) => void;
};

const EMPTY_VALUES: Record<string, number | null> = { abv: null, serve: null, price: null };

export const CustomDrinkSheet = ({
  open,
  onOpenChange,
  venueName,
  targetMl,
  onAdd,
}: CustomDrinkSheetProps) => {
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, number | null>>(EMPTY_VALUES);
  const [keepIt, setKeepIt] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setName("");
      setValues(EMPTY_VALUES);
      setKeepIt(false);
      setErrors({});
    }
  }, [open]);

  const abv = values.abv ?? null;
  const serve = values.serve ?? null;
  const price = values.price ?? null;
  const ml = ((serve ?? 0) * (abv ?? 0)) / 100;
  const pct = targetMl && targetMl > 0 ? (ml / targetMl) * 100 : 0;

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

  const attemptAdd = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = CUSTOM_ERRORS.name;
    if (abv == null) next.abv = CUSTOM_ERRORS.abv;
    if (serve == null) next.serve = CUSTOM_ERRORS.serve;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onAdd({ name: name.trim(), abv, serve, price, keepIt });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl overflow-y-auto">
        <div className="text-[24px] font-medium leading-[1.15] tracking-[-0.015em] text-foreground">
          {CUSTOM_COPY.title}
        </div>
        <div className="mt-4 flex flex-col gap-3.5">
          <div>
            <Label className={cn(errors.name && "text-warning")}>{CUSTOM_COPY.fields.name}</Label>
            <Input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearError("name");
              }}
              className={cn("mt-2", errors.name && "border-warning")}
            />
            {errors.name && <div className="mt-2 text-note text-warning">{errors.name}</div>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Label>{CUSTOM_COPY.fields.abv}</Label>
            <Label>{CUSTOM_COPY.fields.serve}</Label>
            <Label>{CUSTOM_COPY.fields.price}</Label>
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
            className="bg-transparent px-0 pb-0 pt-0"
          />
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
          <div className="text-note text-muted-foreground">{CUSTOM_COPY.computed(ml, pct)}</div>
          <Button variant="default" size="act" className="mt-3.5 w-full" onClick={attemptAdd}>
            {CUSTOM_COPY.cta}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
