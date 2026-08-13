import { useCallback, useEffect, useRef, useState } from "react";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { useEstablishments } from "@/hooks/useEstablishments";
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
import type { ParsedDrink, PhotoItem, ScanFailure } from "@/components/scanner/types";
import {
  classifyScanError,
  toEstablishmentDrinkInsert,
} from "@/components/scanner/scanner-model";

type ScannerScreen = "capture" | "waiting" | "review" | "failed";

type ParseMenuResponse = {
  suggestedName?: string | null;
  drinks?: ParsedDrink[];
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
          const drinks = data?.drinks ?? [];
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
          if (screenRef.current === "waiting") showScreen("review");
          onTaskChange?.("ready");
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

  const commitDrink = (index: number, key: ReviewField, value: number | null) => {
    setParsedDrinks((prev) =>
      prev.map((drink, i) => {
        if (i !== index) return drink;
        if (key === "abv") return { ...drink, abv: value };
        if (key === "serve") {
          return { ...drink, volume: value, volumeUnit: value === null ? drink.volumeUnit : "ml" };
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

        const { data: estData, error: estError } = await supabase
          .from("establishments")
          .insert({ name: venueName, user_id: session.user.id })
          .select("id")
          .single();

        if (estError) throw estError;

        const { error: drinksError } = await supabase
          .from("establishment_drinks")
          .insert(
            parsedDrinks.map((drink) =>
              toEstablishmentDrinkInsert(drink, estData.id, session.user.id),
            ),
          );

        if (drinksError) throw drinksError;

        await refetch();
        savedEstablishmentId = estData.id;
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
        <ScannerWaiting onLeave={onLeave ?? onNext} onCancel={handleCancel} onClose={handleClose} />
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
