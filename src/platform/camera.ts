/**
 * Camera module: capture and compress photos for finds.
 * Platform abstraction for photo capture via file input + canvas compression.
 * Photos are stored as blobs in IndexedDB, keyed by UUID.
 *
 * Compression strategy:
 * - Read file from input capture
 * - Draw to canvas at max 1600px on the longest side
 * - Export as JPEG with quality ~0.7
 * - Store blob in IndexedDB with a UUID key
 */

export type PhotoKey = string; // UUID key for a photo blob

/**
 * Capture and compress a photo from the device camera or file input.
 * Returns a Blob and a unique key for storage in IndexedDB.
 *
 * @param file - File from input[capture=environment]
 * @returns { blob, key } - compressed blob and its IndexedDB key
 */
export async function captureAndCompressPhoto(file: File): Promise<{ blob: Blob; key: PhotoKey }> {
  const key = generatePhotoKey();
  const blob = await compressPhoto(file);
  return { blob, key };
}

/**
 * Compress a photo file to a reasonable size for mobile.
 * Max dimension 1600px, JPEG quality 0.7.
 *
 * @param file - Image file to compress
 * @returns compressed Blob
 */
async function compressPhoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1600;
        let width = img.width;
        let height = img.height;

        // Scale down if necessary
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            resolve(blob);
          },
          'image/jpeg',
          0.7
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate a unique key for a photo blob.
 * Used as the IndexedDB key when storing compressed photos.
 */
function generatePhotoKey(): PhotoKey {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Read a compressed photo blob from IndexedDB.
 * (This is a placeholder; actual storage is handled by the finds module.)
 */
export async function getPhotoBlob(_key: PhotoKey): Promise<Blob | null> {
  // Implementation would be in the finds module, accessing IndexedDB
  // This is just a type definition for the interface.
  return null;
}

/**
 * Estimate the size of a photo blob in MB.
 * Useful for displaying storage usage to the user.
 */
export function estimatePhotoSize(blob: Blob): number {
  return blob.size / (1024 * 1024); // MB
}
