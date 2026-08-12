import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about this project's font-size scale.
 *
 * It classifies a `text-*` class by looking at the suffix: stock t-shirt sizes
 * (`text-sm`, `text-xl`) are recognised as font-size, and anything else falls
 * through to the text-colour group. Our scale is named rather than sized —
 * `text-body`, `text-title`, `text-micro` — so every one of them was being read
 * as a colour, and a colour later in the same call silently evicted it:
 *
 *     twMerge("text-body text-foreground")   // => "text-foreground"  (19px lost)
 *     twMerge("text-title text-muted-foreground") // => "text-muted-foreground"
 *     twMerge("text-sm text-foreground")     // => "text-sm text-foreground" (fine)
 *
 * In the app a dropped size inherits `body`'s 19px rather than disappearing, so
 * `text-body` survived by luck and the visible damage was small. The hazard is
 * the other direction: `text-title` collapsing 28px to 19px, or `text-micro`
 * inflating 13px to 19px, with nothing in the component to show why.
 *
 * Registering the scale here fixes every call site at once. Keep this list in
 * step with `fontSize` in tailwind.config.ts — a token missing from it is a
 * token that can be silently dropped again.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["micro", "label", "note", "body", "lead", "title", "display", "hero"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
