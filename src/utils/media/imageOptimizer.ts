import {
  MAX_IMAGE_DIMENSION,
  IMAGE_COMPRESSION_QUALITY
} from "../../config/mediaLimits";
import type { ImageOptimizationResult } from "../../types/media";

/**
 * Checks if a canvas context contains transparent pixels
 */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, width, height).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] < 250) {
        return true;
      }
    }
  } catch {
    // If getImageData fails due to security / tainting, assume transparent for safety
    return true;
  }
  return false;
}

/**
 * Decodes a File or Blob into an HTMLImageElement
 */
function loadImageElement(fileOrBlob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image file."));
    };

    img.src = url;
  });
}

/**
 * Optimizes an image File using HTML5 Canvas:
 * 1. Decodes image and reads natural dimensions
 * 2. Downscales if long edge > MAX_IMAGE_DIMENSION (2048px), preserves natural size otherwise
 * 3. Re-encodes on fresh canvas (stripping EXIF metadata including GPS)
 * 4. Preserves transparency for PNGs where needed, uses WebP / JPEG otherwise
 * 5. Returns optimized File and size comparison statistics
 */
export async function optimizeImage(
  file: File,
  maxDimension: number = MAX_IMAGE_DIMENSION,
  quality: number = IMAGE_COMPRESSION_QUALITY
): Promise<ImageOptimizationResult> {
  const originalSize = file.size;
  const img = await loadImageElement(file);

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (!origWidth || !origHeight) {
    throw new Error("Unable to read image dimensions.");
  }

  // Calculate target dimensions
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (origWidth > maxDimension || origHeight > maxDimension) {
    if (origWidth >= origHeight) {
      targetWidth = maxDimension;
      targetHeight = Math.round((origHeight * maxDimension) / origWidth);
    } else {
      targetHeight = maxDimension;
      targetWidth = Math.round((origWidth * maxDimension) / origHeight);
    }
  }

  // Draw onto canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas context is unavailable.");
  }

  // Smooth scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Determine optimal output format
  const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
  let mimeType = "image/webp";
  let outputQuality = quality;

  if (isPng) {
    const isTransparent = hasTransparency(ctx, targetWidth, targetHeight);
    if (isTransparent) {
      // WebP supports lossless/lossy alpha transparency
      mimeType = "image/webp";
    }
  }

  // Convert canvas to Blob
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, outputQuality);
  });

  if (!blob) {
    // Fallback to JPEG if WebP encoding failed in older browser
    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", outputQuality);
    });

    if (!jpegBlob) {
      throw new Error("Failed to encode optimized image.");
    }

    const ext = "jpg";
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const optimizedFile = new File([jpegBlob], `${baseName}.${ext}`, {
      type: "image/jpeg",
      lastModified: Date.now()
    });

    const previewUrl = URL.createObjectURL(optimizedFile);

    return {
      optimizedFile,
      width: targetWidth,
      height: targetHeight,
      originalSize,
      optimizedSize: optimizedFile.size,
      previewUrl,
      mimeType: "image/jpeg"
    };
  }

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const optimizedFile = new File([blob], `${baseName}.${ext}`, {
    type: mimeType,
    lastModified: Date.now()
  });

  const previewUrl = URL.createObjectURL(optimizedFile);

  return {
    optimizedFile,
    width: targetWidth,
    height: targetHeight,
    originalSize,
    optimizedSize: optimizedFile.size,
    previewUrl,
    mimeType
  };
}
