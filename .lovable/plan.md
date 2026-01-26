

## Fix: Proper Multi-Format Image Support

### Problem
The current implementation assumes all images are JPEG when sending to the AI, even though the upload accepts all image types (PNG, WebP, GIF, etc.). While AI models often auto-detect formats, this could cause reliability issues with certain image types.

### Solution
Pass the actual MIME type from the frontend to the edge function, so each image is correctly labeled.

---

### Changes Required

**1. Update MenuScannerTab.tsx**
- Modify the `PhotoItem` interface to include the MIME type:
```typescript
interface PhotoItem {
  id: string;
  base64: string;
  thumbnail: string;
  mimeType: string;  // NEW: Store actual MIME type
}
```

- Update `handleFileSelect` to capture the file's MIME type:
```typescript
const handleFileSelect = async (event) => {
  // ...
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      const base64 = await fileToBase64(file);
      addPhoto(base64, file.type);  // Pass MIME type
    }
  }
};
```

- Update `addPhoto` to accept and store MIME type:
```typescript
const addPhoto = (base64: string, mimeType: string = 'image/jpeg') => {
  // ...
  setPhotos((prev) => [...prev, {
    id,
    base64,
    thumbnail: `data:${mimeType};base64,${base64}`,
    mimeType,
  }]);
};
```

- Update `handleScanMenu` to send MIME types with images:
```typescript
const { data, error } = await supabase.functions.invoke("parse-menu", {
  body: {
    images: photos.map((p) => ({
      base64: p.base64,
      mimeType: p.mimeType,
    })),
  },
});
```

**2. Update parse-menu Edge Function**
- Change the request interface to accept objects instead of strings:
```typescript
interface ImageData {
  base64: string;
  mimeType: string;
}

interface ParseMenuRequest {
  images: ImageData[];  // Changed from string[]
}
```

- Use the actual MIME type when constructing the data URL:
```typescript
const mimeType = imageData.mimeType || 'image/jpeg';
url: imageData.base64.startsWith('data:') 
  ? imageData.base64 
  : `data:${mimeType};base64,${imageData.base64}`
```

**3. Update Native Camera Handlers (Optional Enhancement)**
- For Capacitor camera/gallery, use the returned format to determine MIME type:
```typescript
const handleTakePhoto = async () => {
  const result = await takePhoto();
  if (result) {
    const mimeType = getMimeType(result.format);
    addPhoto(result.base64Data, mimeType);
  }
};
```

---

### Supported Formats After Fix

| Format | Extension | MIME Type | Status |
|--------|-----------|-----------|--------|
| JPEG | .jpg, .jpeg | image/jpeg | ✅ Supported |
| PNG | .png | image/png | ✅ Supported |
| WebP | .webp | image/webp | ✅ Supported |
| GIF | .gif | image/gif | ✅ Supported |
| HEIC | .heic | image/heic | ⚠️ Limited (browser dependent) |

### Files to Modify
- `src/components/tabs/MenuScannerTab.tsx` - Store and pass MIME types
- `supabase/functions/parse-menu/index.ts` - Accept and use MIME types

