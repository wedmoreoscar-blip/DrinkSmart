import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEstablishments, type EstablishmentDrink } from "@/hooks/useEstablishments";
import { cn } from "@/lib/utils";

export type EstablishmentsScreenProps = {
  selectedId: string | null;
  onSelect: (establishmentId: string) => void;
  onScanMenu: () => void;
  onBack: () => void;
};

const VENUE_COPY = {
  title: "Where are you",
  search: "Search by name",
  here: "HERE NOW",
  yoursTag: "yours",
  countSub: (n: number) => n + " drinks",
  cta: "Scan a menu",
  footnote: "A scan makes the bar you are in one of these.",
};

const VENUE_EMPTY_COPY = {
  title: "No bars of your own yet",
  body: "Scan a menu and the bar you are in joins this list, with its real prices.",
  footnote: "Until then, Generic pub is a fair guess at any pub.",
};

const money = (p: number) => (p === 0 ? "£0" : "£" + p.toFixed(2).replace(/\.00$/, ""));

const venuePreview = (drinks: EstablishmentDrink[]) =>
  drinks
    .slice(0, 3)
    .map((d) => (d.price == null ? d.drink_name : d.drink_name + " " + money(d.price)))
    .join(" · ");

export const EstablishmentsScreen = ({
  selectedId,
  onSelect,
  onScanMenu,
  onBack,
}: EstablishmentsScreenProps) => {
  const { establishments, loading, getEstablishmentDrinks } = useEstablishments();
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const own = establishments.filter((e) => !e.isGlobal);
    const seeds = establishments
      .filter((e) => e.isGlobal)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const hereFirst = establishments.filter((e) => e.id === selectedId);
    return [...hereFirst, ...own.filter((e) => e.id !== selectedId), ...seeds.filter((e) => e.id !== selectedId)];
  }, [establishments, selectedId]);

  const normalized = query.trim().toLowerCase();
  const visible = useMemo(
    () => (normalized ? sorted.filter((e) => e.name.toLowerCase().includes(normalized)) : sorted),
    [sorted, normalized],
  );

  const hasOwnVenues = establishments.some((e) => !e.isGlobal);
  const footnote = hasOwnVenues ? VENUE_COPY.footnote : VENUE_EMPTY_COPY.footnote;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background px-5 pt-[22px] text-foreground">
      <div className="flex min-h-tap flex-none items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={onBack}
          className="relative flex h-[22px] w-[22px] flex-none items-center justify-center text-foreground before:absolute before:-inset-[17px] before:content-['']"
        >
          <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={1.8} />
        </button>
        <h1 className="text-title font-medium">{VENUE_COPY.title}</h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden pt-1.5">
        <div className="relative flex-none">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#75798c]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={VENUE_COPY.search}
            className="pl-12 placeholder:text-[#75798c]"
          />
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto">
            {visible.map((est) => {
              const isHere = est.id === selectedId;
              const drinks = getEstablishmentDrinks(est.id);
              const preview = venuePreview(drinks);
              return (
                <button
                  type="button"
                  key={est.id}
                  onClick={() => onSelect(est.id)}
                  className={cn(
                    "flex min-h-[72px] flex-none flex-col gap-1 rounded-lg bg-[#232532] px-[18px] py-[14px] text-left",
                    isHere && "shadow-[0_0_0_2px_#9184d9]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <span className="truncate text-lead text-foreground">{est.name}</span>
                      {!est.isGlobal && (
                        <span className="flex-none rounded-md bg-secondary px-[9px] py-[5px] text-micro font-medium tracking-[0.04em] text-muted-foreground">
                          {VENUE_COPY.yoursTag}
                        </span>
                      )}
                    </div>
                    {isHere ? (
                      <span className="flex-none text-micro font-medium tracking-[0.04em] text-primary-hover">
                        {VENUE_COPY.here}
                      </span>
                    ) : (
                      <span className="flex-none text-[15px] leading-[1.2] text-[#75798c]">
                        {VENUE_COPY.countSub(drinks.length)}
                      </span>
                    )}
                  </div>
                  {preview && (
                    <div className="truncate text-[15px] leading-[1.35] text-muted-foreground">{preview}</div>
                  )}
                </button>
              );
            })}

            {!hasOwnVenues && (
              <div className="flex flex-none flex-col items-center rounded-lg bg-field px-[18px] py-8 text-center">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="mb-4">
                  <path d="M8 38V16l14-8 14 8v22z" stroke="#3f424d" strokeWidth="1.8" />
                  <path d="M18 38V26h8v12" stroke="#3f424d" strokeWidth="1.8" />
                </svg>
                <div className="text-lead font-medium text-foreground">{VENUE_EMPTY_COPY.title}</div>
                <p className="mt-1.5 text-note text-muted-foreground">{VENUE_EMPTY_COPY.body}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-none pt-3">
        <Button size="act" className="w-full" onClick={onScanMenu}>
          {VENUE_COPY.cta}
        </Button>
        <p className="mt-2.5 text-center text-micro text-[#75798c]">{footnote}</p>
      </div>
    </div>
  );
};
