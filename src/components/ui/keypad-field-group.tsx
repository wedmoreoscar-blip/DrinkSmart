import * as React from "react";

import { cn } from "@/lib/utils";

export type KeypadField = {
  key: string;
  unit: string; // "%", "ml", "£"
  value: number | null; // null renders the amber gap well
  max?: number;
  integer?: boolean;
};

export type KeypadFieldGroupProps = {
  fields: KeypadField[];
  onCommit: (key: string, value: number | null) => void;
  onAdvance?: () => void; // called on submit when no gap remains in this group
  emptyIsAllowed?: boolean; // 4i saves with gaps left; 4f does not
  title?: string; // group card heading, e.g. "Camden Hells"
  note?: string; // 13px right-aligned status, e.g. "price unread"
  focusKey?: string | null;
  focusRequest?: number;
  fieldLayout?: "row" | "custom-drink";
  className?: string;
};

const CLAMP_TABLE: Record<string, readonly [number, number]> = {
  abv: [0, 60],
  serve: [25, 1000],
  price: [0, 999],
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function KeypadFieldGroup({
  fields,
  onCommit,
  onAdvance,
  title,
  note,
  focusKey,
  focusRequest,
  fieldLayout = "row",
  className,
}: KeypadFieldGroupProps) {
  const [focusedKey, setFocusedKey] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState<Record<string, string>>({});
  const fieldRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const focusedField = fields.find((field) => field.key === focusedKey) ?? null;
  const gapsLeft = fields.reduce((count, field) => count + (field.value === null ? 1 : 0), 0);

  const commitField = (field: KeypadField, text: string) => {
    if (text === "") {
      onCommit(field.key, null);
      return;
    }
    const parsed = Number.parseFloat(text);
    if (Number.isNaN(parsed)) {
      onCommit(field.key, null);
      return;
    }
    const range = CLAMP_TABLE[field.key];
    let value = parsed;
    if (range) value = Math.max(value, range[0]);
    if (field.max !== undefined) value = Math.min(value, field.max);
    else if (range) value = Math.min(value, range[1]);
    onCommit(field.key, value);
  };

  const focusField = (field: KeypadField) => {
    setFocusedKey(field.key);
    setWorking((current) =>
      current[field.key] !== undefined
        ? current
        : { ...current, [field.key]: field.value === null ? "" : String(field.value) },
    );
  };

  React.useEffect(() => {
    if (!focusKey) return;
    const field = fields.find((candidate) => candidate.key === focusKey);
    if (!field) return;
    focusField(field);
    fieldRefs.current[field.key]?.focus();
    // focusRequest deliberately retriggers focus for the same key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, focusRequest]);

  const pressKey = (key: string) => {
    const field = focusedField;
    if (!field) return;
    const current = working[field.key] ?? "";
    let next: string;
    if (key === "⌫") {
      next = current.slice(0, -1);
    } else if (key === ".") {
      if (field.integer) return;
      next = `${current}.`;
    } else {
      next = `${current}${key}`;
    }
    setWorking((state) => ({ ...state, [field.key]: next }));
    commitField(field, next);
  };

  const submit = () => {
    const count = fields.length;
    if (count === 0) {
      onAdvance?.();
      return;
    }
    const focusedIndex = focusedKey ? fields.findIndex((field) => field.key === focusedKey) : -1;
    for (let offset = 1; offset <= count; offset++) {
      const field = fields[(focusedIndex + offset) % count];
      if (field.value === null) {
        setFocusedKey(field.key);
        return;
      }
    }
    onAdvance?.();
  };

  return (
    <div className={cn("rounded-lg bg-card px-4 pb-4 pt-3.5", className)}>
      {(title ?? note) && (
        <div className="flex items-center justify-between gap-2.5">
          {title ? <div className="text-lead text-foreground">{title}</div> : null}
          {note ? <div className="text-micro text-[#75798c]">{note}</div> : null}
        </div>
      )}
      <div className={cn("mt-3 gap-2", fieldLayout === "custom-drink" ? "grid grid-cols-2" : "flex")}>
        {fields.map((field) => {
          const focused = focusedKey === field.key;
          const valueText = focused
            ? (working[field.key] ?? "")
            : field.value === null
              ? "—"
              : String(field.value);
          return (
            <button
              key={field.key}
              ref={(element) => {
                fieldRefs.current[field.key] = element;
              }}
              type="button"
              aria-label={`${field.key} ${field.unit}`}
              aria-current={focused ? "true" : undefined}
              onFocus={() => focusField(field)}
              onClick={() => focusField(field)}
              className={cn(
                "flex min-h-tap flex-1 items-center justify-center gap-px rounded-ctl bg-field text-body tabular-nums",
                fieldLayout === "custom-drink" && field.key === "price" && "col-span-2",
                focused
                  ? "shadow-[0_0_0_2px_#9184d9]"
                  : field.value === null
                    ? "shadow-[0_0_0_1px_#d29a51]"
                    : "shadow-[0_0_0_1px_#383a46]",
              )}
            >
              <span className={focused || field.value !== null ? "text-foreground" : "text-warning"}>
                {valueText}
              </span>
              {focused ? <span aria-hidden="true" className="h-6 w-0.5 bg-primary" /> : null}
            </button>
          );
        })}
      </div>
      <div className={cn("mt-1.5 gap-2", fieldLayout === "custom-drink" ? "grid grid-cols-2" : "flex")}>
        {fields.map((field) => (
          <div
            key={field.key}
            className={cn(
              "flex-1 text-center text-micro text-[#75798c]",
              fieldLayout === "custom-drink" && field.key === "price" && "col-span-2",
            )}
          >
            {field.unit}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            disabled={key === "." && (focusedField?.integer ?? false)}
            onClick={() => pressKey(key)}
            className="flex min-h-act items-center justify-center rounded-ctl bg-field text-title leading-none tabular-nums shadow-[0_0_0_1px_#383a46] disabled:pointer-events-none disabled:opacity-50"
          >
            <span className={key === "⌫" ? "text-muted-foreground" : "text-foreground"}>{key}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={submit}
        className="mt-2.5 flex min-h-act w-full items-center justify-center rounded-lg border border-primary text-lead font-medium text-[#b5abfc]"
      >
        {gapsLeft > 0 ? "Next gap" : "Done"}
      </button>
    </div>
  );
}
