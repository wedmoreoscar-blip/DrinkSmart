import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEstablishments } from "@/hooks/useEstablishments";
import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform, takePhoto, pickFromGallery, fileToBase64, getMimeType } from "@/lib/cameraService";
import {
  Camera,
  Upload,
  X,
  Loader2,
  ArrowRight,
  Save,
  Plus,
  Trash2,
  ImagePlus,
  ScanLine,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedDrink {
  name: string;
  abv: number;
  category: string;
  categoryLabel: string;
  price: number | null;
  volume: number | null;
  volumeUnit: string | null;
}

interface PhotoItem {
  id: string;
  base64: string;
  thumbnail: string;
  mimeType: string;
}

const CATEGORY_OPTIONS = [
  { value: "lager", label: "Lager" },
  { value: "ale", label: "Ale" },
  { value: "ipa", label: "IPA" },
  { value: "stout", label: "Stout" },
  { value: "beer", label: "Beer" },
  { value: "cider", label: "Cider" },
  { value: "wine", label: "Wine" },
  { value: "red-wine", label: "Red Wine" },
  { value: "white-wine", label: "White Wine" },
  { value: "rose-wine", label: "Rosé Wine" },
  { value: "spirits", label: "Spirits" },
  { value: "vodka", label: "Vodka" },
  { value: "gin", label: "Gin" },
  { value: "rum", label: "Rum" },
  { value: "whiskey", label: "Whiskey" },
  { value: "tequila", label: "Tequila" },
  { value: "brandy", label: "Brandy" },
  { value: "cocktails", label: "Cocktails" },
  { value: "shots", label: "Shots" },
];

const VOLUME_UNIT_OPTIONS = [
  { value: "ml", label: "ml" },
  { value: "oz", label: "oz" },
  { value: "pint", label: "Pint" },
  { value: "half-pint", label: "Half Pint" },
  { value: "shot", label: "Shot" },
  { value: "glass", label: "Glass" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
];

const MenuScannerTab = ({ onNext }: { onNext: () => void }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addSessionEstablishment, refetch, isLoggedIn } = useEstablishments();

  // Photo queue state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  
  // Results state
  const [parsedDrinks, setParsedDrinks] = useState<ParsedDrink[]>([]);
  const [suggestedName, setSuggestedName] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [hasScanned, setHasScanned] = useState(false);
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Handle native camera photo
  const handleTakePhoto = async () => {
    const result = await takePhoto();
    if (result) {
      const mimeType = getMimeType(result.format);
      addPhoto(result.base64Data, mimeType);
    }
  };

  // Handle native gallery pick
  const handlePickFromGallery = async () => {
    const result = await pickFromGallery();
    if (result) {
      const mimeType = getMimeType(result.format);
      addPhoto(result.base64Data, mimeType);
    }
  };

  // Handle web file input
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        try {
          const base64 = await fileToBase64(file);
          addPhoto(base64, file.type);
        } catch (error) {
          console.error("Error converting file:", error);
          toast({
            title: "Error",
            description: `Failed to process ${file.name}`,
            variant: "destructive",
          });
        }
      }
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Add a photo to the queue
  const addPhoto = (base64: string, mimeType: string = 'image/jpeg') => {
    if (photos.length >= 10) {
      toast({
        title: "Maximum photos reached",
        description: "You can upload up to 10 photos per menu",
        variant: "destructive",
      });
      return;
    }

    const id = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setPhotos((prev) => [
      ...prev,
      {
        id,
        base64,
        thumbnail: `data:${mimeType};base64,${base64}`,
        mimeType,
      },
    ]);
  };

  // Remove a photo from the queue
  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Clear all photos
  const clearPhotos = () => {
    setPhotos([]);
    setParsedDrinks([]);
    setHasScanned(false);
    setSuggestedName("");
    setEstablishmentName("");
  };

  // Scan menu with AI
  const handleScanMenu = async () => {
    if (photos.length === 0) {
      toast({
        title: "No photos",
        description: "Please add at least one menu photo",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(`Analyzing ${photos.length} page${photos.length > 1 ? "s" : ""}...`);

    try {
      const { data, error } = await supabase.functions.invoke("parse-menu", {
        body: {
          images: photos.map((p) => ({
            base64: p.base64,
            mimeType: p.mimeType,
          })),
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Set results
      setParsedDrinks(data.drinks || []);
      if (data.suggestedName) {
        setSuggestedName(data.suggestedName);
        if (!establishmentName) {
          setEstablishmentName(data.suggestedName);
        }
      }
      setHasScanned(true);

      // Show any warnings
      if (data.errors && data.errors.length > 0) {
        toast({
          title: "Scan completed with warnings",
          description: data.errors.join(", "),
          duration: 5000,
        });
      } else {
        toast({
          title: "Menu scanned!",
          description: `Found ${data.drinks?.length || 0} drinks`,
        });
      }
    } catch (error) {
      console.error("Error scanning menu:", error);
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Failed to scan menu",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      setScanProgress("");
    }
  };

  // Update a drink in the results
  const updateDrink = (index: number, field: keyof ParsedDrink, value: string | number | null) => {
    setParsedDrinks((prev) =>
      prev.map((drink, i) => (i === index ? { ...drink, [field]: value } : drink))
    );
  };

  // Remove a drink from results
  const removeDrink = (index: number) => {
    setParsedDrinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a new empty drink row
  const addDrinkRow = () => {
    setParsedDrinks((prev) => [
      ...prev,
      {
        name: "",
        abv: 5,
        category: "beer",
        categoryLabel: "Beer",
        price: null,
        volume: null,
        volumeUnit: null,
      },
    ]);
  };

  // Save establishment
  const handleSave = async () => {
    if (!establishmentName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for this establishment",
        variant: "destructive",
      });
      return;
    }

    if (parsedDrinks.length === 0) {
      toast({
        title: "No drinks",
        description: "Please add at least one drink before saving",
        variant: "destructive",
      });
      return;
    }

    // Validate drinks
    const invalidDrinks = parsedDrinks.filter((d) => !d.name.trim());
    if (invalidDrinks.length > 0) {
      toast({
        title: "Invalid drinks",
        description: "All drinks must have a name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (isLoggedIn) {
        // Save to database for logged-in users
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("Not authenticated");

        // Insert establishment
        const { data: estData, error: estError } = await supabase
          .from("establishments")
          .insert({
            name: establishmentName.trim(),
            user_id: session.user.id,
          })
          .select("id")
          .single();

        if (estError) throw estError;

        // Insert drinks
        const drinksToInsert = parsedDrinks.map((drink) => ({
          establishment_id: estData.id,
          drink_name: drink.name.trim(),
          abv: drink.abv,
          category: drink.category,
          category_label: drink.categoryLabel,
          price: drink.price,
          volume: drink.volume,
          volume_unit: drink.volumeUnit,
          user_id: session.user.id,
        }));

        const { error: drinksError } = await supabase
          .from("establishment_drinks")
          .insert(drinksToInsert);

        if (drinksError) throw drinksError;

        // Refetch establishments to include new one
        await refetch();

        toast({
          title: "Menu saved!",
          description: `${establishmentName} with ${parsedDrinks.length} drinks saved to your account`,
        });
      } else {
        // Save to session for guests
        addSessionEstablishment(
          establishmentName.trim(),
          parsedDrinks.map((drink) => ({
            drink_name: drink.name.trim(),
            abv: drink.abv,
            category: drink.category,
            category_label: drink.categoryLabel,
            price: drink.price,
            volume: drink.volume,
            volume_unit: drink.volumeUnit,
          }))
        );

        toast({
          title: "Menu saved for this session",
          description: "Log in to save menus permanently",
        });
      }

      // Clear the scanner after saving
      clearPhotos();
    } catch (error) {
      console.error("Error saving establishment:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save menu",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isNative = isNativePlatform();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Menu Scanner
        </h2>
        <p className="text-muted-foreground">
          Upload photos of a menu and AI will extract the drinks for you
        </p>
      </div>

      {/* Photo Upload Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-medium">Menu Photos</Label>
          {photos.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearPhotos}>
              Clear All
            </Button>
          )}
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {photos.map((photo, index) => (
              <div key={photo.id} className="relative group aspect-square">
                <img
                  src={photo.thumbnail}
                  alt={`Menu page ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border"
                />
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-1 left-1 bg-background/80 text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Upload Buttons */}
        <div className="flex flex-wrap gap-3">
          {isNative ? (
            <>
              <Button variant="outline" onClick={handleTakePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button variant="outline" onClick={handlePickFromGallery}>
                <Upload className="h-4 w-4 mr-2" />
                Choose from Gallery
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {photos.length > 0 ? "Add More Photos" : "Upload Photos"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}

          {photos.length > 0 && photos.length < 10 && (
            <span className="text-sm text-muted-foreground self-center">
              {photos.length}/10 photos
            </span>
          )}
        </div>

        {/* Scan Button */}
        {photos.length > 0 && (
          <Button
            className="w-full"
            onClick={handleScanMenu}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {scanProgress}
              </>
            ) : (
              <>
                <ScanLine className="h-4 w-4 mr-2" />
                Scan Menu
              </>
            )}
          </Button>
        )}
      </Card>

      {/* Results Section */}
      {hasScanned && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-medium">Extracted Drinks</Label>
            <Button variant="outline" size="sm" onClick={addDrinkRow}>
              <Plus className="h-4 w-4 mr-1" />
              Add Drink
            </Button>
          </div>

          {parsedDrinks.length === 0 ? (
            <Alert>
              <AlertDescription>
                No drinks were found. Try uploading a clearer image or add drinks manually.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-20">ABV %</TableHead>
                    <TableHead className="w-24">Volume</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-20">Price</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedDrinks.map((drink, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={drink.name}
                          onChange={(e) => updateDrink(index, "name", e.target.value)}
                          placeholder="Drink name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={drink.abv}
                          onChange={(e) => updateDrink(index, "abv", parseFloat(e.target.value) || 0)}
                          min={0}
                          max={100}
                          step={0.1}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={drink.volume ?? ""}
                          onChange={(e) =>
                            updateDrink(index, "volume", e.target.value ? parseFloat(e.target.value) : null)
                          }
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={drink.volumeUnit || ""}
                          onValueChange={(value) => updateDrink(index, "volumeUnit", value || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {VOLUME_UNIT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={drink.price ?? ""}
                          onChange={(e) =>
                            updateDrink(index, "price", e.target.value ? parseFloat(e.target.value) : null)
                          }
                          placeholder="—"
                          step={0.01}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={drink.category}
                          onValueChange={(value) => {
                            const label = CATEGORY_OPTIONS.find((c) => c.value === value)?.label || value;
                            updateDrink(index, "category", value);
                            updateDrink(index, "categoryLabel", label);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDrink(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Establishment Name */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Establishment Name</Label>
            <Input
              value={establishmentName}
              onChange={(e) => setEstablishmentName(e.target.value)}
              placeholder="e.g., The Local Pub"
            />
            {suggestedName && suggestedName !== establishmentName && (
              <p className="text-xs text-muted-foreground">
                Suggested: {suggestedName}
              </p>
            )}
          </div>

          {/* Guest notice */}
          {!isLoggedIn && (
            <Alert>
              <AlertDescription>
                You're not logged in. This menu will only be saved for this session.
                Log in to save menus permanently.
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving || parsedDrinks.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Menu
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onNext}
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip to Drinks
        </Button>
        {hasScanned && parsedDrinks.length > 0 && (
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            onClick={async () => {
              if (establishmentName.trim() && parsedDrinks.length > 0) {
                await handleSave();
              }
              onNext();
            }}
          >
            Continue to Drinks
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MenuScannerTab;
