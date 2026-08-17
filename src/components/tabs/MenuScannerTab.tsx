import { useCallback, useEffect, useRef, useState } from "react";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useDrinkOverrides } from "@/hooks/useDrinkOverrides";
import { useEstablishments, type EstablishmentDrink } from "@/hooks/useEstablishments";
import { databaseVolumeMl } from "@/components/picker/picker-model";
import { supabase } from "@/integrations/supabase/client";
import {
  isNativePlatform,
  takePhoto,
  pickFromGallery,
  fileToBase64,
  getMimeType,
} from "@/lib/cameraService";
import { ScannerCapture } from "@/components/scanner/ScannerCapture";
import { ScannerWaiting } from "@/components/scanner/ScannerWaiting";
import { ScannerReview, type ReviewField } from "@/components/scanner/ScannerReview";
import { ScannerFailed } from "@/components/scanner/ScannerFailed";
import { SCAN_WAIT_COPY } from "@/components/scanner/copy";
import type { ParsedDrink, PhotoItem, RawParsedDrink, ScanFailure } from "@/components/scanner/types";
import {
  classifyScanError,
  normalizeParsedDrinks,
  toEstablishmentDrinkInsert,
} from "@/components/scanner/scanner-model";

type ScannerScreen = "capture" | "waiting" | "review" | "failed";

type ParseMenuResponse = {
  suggestedName?: string | null;
  drinks?: RawParsedDrink[];
  error?: string;
};

type MenuScannerTabProps = {
  onNext: () => void;
  onClose?: () => void;
  onLeave?: () => void;
  onReviewReady?: () => void;
  onSaved?: (establishmentId: string) => void;
  onTaskChange?: (task: "parsing" | "ready" | "failed") => void;
};

const VENUE_NAME_FALLBACK = "Scanned menu";

/**
 * The volume a scanned price is the price of. A price with no volume cannot
 * become a rung, so it is not written at all rather than guessed at.
 */
function scannedVolumeMl(drink: ParsedDrink): number | null {
  return databaseVolumeMl({
    volume: drink.volume,
    volume_unit: drink.volumeUnit,
  } as EstablishmentDrink);
}

const MenuScannerTab = ({
  onNext,
  onClose,
  onLeave,
  onReviewReady,
  onSaved,
  onTaskChange,
}: MenuScannerTabProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addSessionEstablishment, refetch, isLoggedIn } = useEstablishments();
  const { setDrinkPrice } = useDrinkOverrides();

  const [screen, setScreen] = useState<ScannerScreen>("capture");
  const [photo, setPhoto] = useState<PhotoItem | null>(null);
  const [parsedDrinks, setParsedDrinks] = useState<ParsedDrink[]>([]);
  const [establishmentName, setEstablishmentName] = useState("");
  const [failure, setFailure] = useState<ScanFailure>("refused");
  const [isSaving, setIsSaving] = useState(false);

  const screenRef = useRef<ScannerScreen>("capture");
  const scanIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const showScreen = useCallback((next: ScannerScreen) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  useEffect(
    () => () => {
      scanIdRef.current += 1;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClose = () => {
    if (onClose) onClose();
    else onNext();
  };

  const startParse = useCallback(
    (photoItem: PhotoItem) => {
      const id = ++scanIdRef.current;
      showScreen("waiting");
      onTaskChange?.("parsing");

      const timer = window.setTimeout(() => {
        if (scanIdRef.current === id && screenRef.current === "waiting") {
          setFailure("timeout");
          showScreen("failed");
          onTaskChange?.("failed");
        }
      }, 45000);
      timerRef.current = timer;

      void supabase.functions
        .invoke<ParseMenuResponse>("parse-menu", {
          body: {
            images: [{ base64: photoItem.base64, mimeType: photoItem.mimeType }],
          },
        })
        .then(({ data, error }) => {
          if (scanIdRef.current !== id) return;
          window.clearTimeout(timer);
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          // The Edge Function output is raw model output; normalize it to
          // absolute ml with deterministic fallbacks before review state.
          const drinks = normalizeParsedDrinks(data?.drinks ?? []);
          if (drinks.length === 0) {
            if (screenRef.current === "waiting") {
              setFailure("nothing");
              showScreen("failed");
              onTaskChange?.("failed");
            }
            return;
          }
          setParsedDrinks(drinks);
          if (data?.suggestedName) setEstablishmentName(data.suggestedName);
          const wasWaiting = screenRef.current === "waiting";
          if (wasWaiting) showScreen("review");
          onTaskChange?.("ready");
          if (!wasWaiting) {
            toast({
              title: SCAN_WAIT_COPY.doneToast(drinks.length),
              action: (
                <ToastAction
                  altText="Check"
                  onClick={() => {
                    showScreen("review");
                    onReviewReady?.();
                  }}
                >
                  Check
                </ToastAction>
              ),
            });
          }
        })
        .catch((err) => {
          if (scanIdRef.current !== id) return;
          window.clearTimeout(timer);
          if (screenRef.current !== "waiting") return;
          setFailure(
            classifyScanError(err, typeof navigator === "undefined" ? true : navigator.onLine),
          );
          showScreen("failed");
          onTaskChange?.("failed");
        });
    },
    [onReviewReady, onTaskChange, showScreen, toast],
  );

  const addPhoto = (base64: string, mimeType: string) => {
    const photoItem: PhotoItem = {
      id: `photo-${Date.now()}`,
      base64,
      thumbnail: `data:${mimeType};base64,${base64}`,
      mimeType,
    };
    setPhoto(photoItem);
    startParse(photoItem);
  };

  const handleShutter = async () => {
    if (isNativePlatform()) {
      const result = await takePhoto();
      if (result) {
        addPhoto(result.base64Data, getMimeType(result.format));
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handlePick = async () => {
    if (isNativePlatform()) {
      const result = await pickFromGallery();
      if (result) {
        addPhoto(result.base64Data, getMimeType(result.format));
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        try {
          const base64 = await fileToBase64(file);
          addPhoto(base64, file.type);
        } catch (error) {
          console.error("Error converting file:", error);
          toast({
            title: "Error",
            description: `Failed to process ${file.name}`,
          });
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    scanIdRef.current += 1;
    setPhoto(null);
    showScreen("capture");
  };

  const handleLeave = () => {
    // Keep the request alive while the user returns to planning. If it resolves
    // after this point, the result is delivered through the global toast rather
    // than navigating a hidden scanner back to review.
    showScreen("capture");
    if (onLeave) onLeave();
    else onNext();
  };

  const commitDrink = (index: number, key: ReviewField, value: number | null) => {
    setParsedDrinks((prev) =>
      prev.map((drink, i) => {
        if (i !== index) return drink;
        if (key === "abv") return { ...drink, abv: value, abvEstimated: false };
        if (key === "serve") {
          return {
            ...drink,
            volume: value,
            volumeUnit: value === null ? drink.volumeUnit : "ml",
            volumeEstimated: false,
          };
        }
        return { ...drink, price: value };
      }),
    );
  };

  const handleSave = async () => {
    if (parsedDrinks.length === 0) return;

    const invalidDrinks = parsedDrinks.filter((d) => !d.name.trim());
    if (invalidDrinks.length > 0) {
      toast({
        title: "Invalid drinks",
        description: "All drinks must have a name",
      });
      return;
    }

    const venueName = establishmentName.trim() || VENUE_NAME_FALLBACK;
    setIsSaving(true);

    try {
      let savedEstablishmentId: string;
      if (isLoggedIn) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("Not authenticated");
        const userId = session.user.id;

        // Re-scanning a venue updates it instead of duplicating it: reuse the
        // user's existing venue with the same trimmed name (case-insensitive);
        // insert only when none is found.
        const { data: userVenues, error: venuesError } = await supabase
          .from("establishments")
          .select("id, name")
          .eq("user_id", userId);
        if (venuesError) throw venuesError;

        const venueNameKey = venueName.toLowerCase();
        const existingVenue = (userVenues ?? []).find(
          (venue) => venue.name.trim().toLowerCase() === venueNameKey,
        );

        if (existingVenue) {
          savedEstablishmentId = existingVenue.id;
        } else {
          const { data: estData, error: estError } = await supabase
            .from("establishments")
            .insert({ name: venueName, user_id: userId })
            .select("id")
            .single();
          if (estError) throw estError;
          savedEstablishmentId = estData.id;
        }

        // Re-scanning a drink updates its row (abv, volume, volume_unit) rather
        // than adding a duplicate; only genuinely new names are inserted. A
        // scanned price is written as an override, never onto an existing row.
        try {
          const { data: existingDrinks, error: existingError } = await supabase
            .from("establishment_drinks")
            .select("id, drink_name")
            .eq("establishment_id", savedEstablishmentId);
          if (existingError) throw existingError;

          const drinkIdByKey = new Map<string, string>();
          for (const row of existingDrinks ?? []) {
            drinkIdByKey.set(row.drink_name.trim().toLowerCase(), row.id);
          }

          const newDrinks = parsedDrinks.filter(
            (drink) => !drinkIdByKey.has(drink.name.trim().toLowerCase()),
          );
          const existingMatches = parsedDrinks.filter((drink) =>
            drinkIdByKey.has(drink.name.trim().toLowerCase()),
          );

          const writeTasks: Promise<void>[] = [];

          for (const drink of existingMatches) {
            const drinkId = drinkIdByKey.get(drink.name.trim().toLowerCase());
            if (!drinkId) continue;
            writeTasks.push(
              (async () => {
                const { error: updateError } = await supabase
                  .from("establishment_drinks")
                  .update({
                    abv: drink.abv,
                    volume: drink.volume,
                    volume_unit: drink.volumeUnit,
                  })
                  .eq("id", drinkId);
                if (updateError) throw updateError;
                // A scanned price is the price of the scanned serving, so it
                // is stored as a rung at that volume. It used to go to
                // user_drink_overrides.price, which nothing reads any more —
                // every scanned price was written and silently lost.
                const scannedMl = scannedVolumeMl(drink);
                if (drink.price !== null && scannedMl != null) {
                  await setDrinkPrice(drinkId, scannedMl, drink.price);
                }
              })(),
            );
          }

          if (newDrinks.length > 0) {
            const { data: insertedRows, error: insertError } = await supabase
              .from("establishment_drinks")
              .insert(
                newDrinks.map((drink) =>
                  toEstablishmentDrinkInsert(drink, savedEstablishmentId, userId),
                ),
              )
              .select("id, drink_name");
            if (insertError) throw insertError;
            // Match returned rows by name, not by array index. Row order on a
            // bulk insert is a property of the driver, not a guarantee, and
            // getting it wrong attaches each scanned price to the wrong drink
            // — silently, and only for users who scan.
            const insertedIdByKey = new Map<string, string>();
            for (const row of insertedRows ?? []) {
              insertedIdByKey.set(row.drink_name.trim().toLowerCase(), row.id);
            }
            for (const drink of newDrinks) {
              const insertedId = insertedIdByKey.get(drink.name.trim().toLowerCase());
              const scannedMl = scannedVolumeMl(drink);
              if (drink.price !== null && insertedId && scannedMl != null) {
                writeTasks.push(setDrinkPrice(insertedId, scannedMl, drink.price));
              }
            }
          }

          const settled = await Promise.allSettled(writeTasks);
          const failures = settled.filter((result) => result.status === "rejected");
          if (failures.length > 0) throw failures[0].reason;
        } catch (drinkWriteError) {
          console.error("Some drinks failed to save:", drinkWriteError);
          toast({
            title: "Scan partially saved",
            description: "Some drinks couldn't be saved. Tap Save to try again.",
          });
          return;
        }

        await refetch();
      } else {
        savedEstablishmentId = addSessionEstablishment(
          venueName,
          parsedDrinks.map((drink) => ({
            drink_name: drink.name.trim(),
            abv: drink.abv,
            category: drink.category,
            category_label: drink.categoryLabel,
            price: drink.price,
            volume: drink.volume,
            volume_unit: drink.volumeUnit,
          })),
        );
      }

      onSaved?.(savedEstablishmentId);
      onNext();
    } catch (error) {
      console.error("Error saving establishment:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save menu",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    if (photo) startParse(photo);
  };

  const venueName = establishmentName.trim() || VENUE_NAME_FALLBACK;

  return (
    <>
      {screen === "capture" && (
        <ScannerCapture onShutter={handleShutter} onPick={handlePick} onClose={handleClose} />
      )}
      {screen === "waiting" && (
        <ScannerWaiting onLeave={handleLeave} onCancel={handleCancel} onClose={handleClose} />
      )}
      {screen === "review" && (
        <ScannerReview
          drinks={parsedDrinks}
          venueName={venueName}
          onCommit={commitDrink}
          onSave={handleSave}
          onClose={handleClose}
          isSaving={isSaving}
        />
      )}
      {screen === "failed" && photo && (
        <ScannerFailed
          failure={failure}
          photoThumbnail={photo.thumbnail}
          onRetry={handleRetry}
          onReshoot={handleCancel}
          onManual={onNext}
          onClose={handleClose}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
};

export default MenuScannerTab;
