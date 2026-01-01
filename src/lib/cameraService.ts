import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface PhotoResult {
  base64Data: string;
  format: string;
}

/**
 * Check if we're running on a native platform (iOS/Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Take a photo using native camera or web file picker
 */
export const takePhoto = async (): Promise<PhotoResult | null> => {
  if (isNativePlatform()) {
    return takeNativePhoto();
  }
  return null; // Web uses file input instead
};

/**
 * Take a photo using native camera (iOS/Android)
 */
const takeNativePhoto = async (): Promise<PhotoResult | null> => {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });

    if (photo.base64String) {
      return {
        base64Data: photo.base64String,
        format: photo.format || 'jpeg',
      };
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

/**
 * Pick a photo from gallery using native picker
 */
export const pickFromGallery = async (): Promise<PhotoResult | null> => {
  if (isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });

      if (photo.base64String) {
        return {
          base64Data: photo.base64String,
          format: photo.format || 'jpeg',
        };
      }
      return null;
    } catch (error) {
      console.error('Error picking photo:', error);
      return null;
    }
  }
  return null; // Web uses file input instead
};

/**
 * Convert a File object to base64 (for web file input)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Get MIME type from file extension or format
 */
export const getMimeType = (format: string): string => {
  const formatLower = format.toLowerCase();
  switch (formatLower) {
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
};
