import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  quality: number;
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 8, // Increased for HD photos
  maxWidthOrHeight: 3840, // 4K resolution support
  useWebWorker: true, // Use web worker for better performance
  quality: 0.85, // Higher default quality
};

export const HIGH_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 15, // Allow larger files for HD photos
  maxWidthOrHeight: 4096, // 4K+ resolution support
  useWebWorker: true,
  quality: 0.95, // Very high quality
};

export const MEDIUM_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 8,
  maxWidthOrHeight: 2560, // 2K resolution
  useWebWorker: true,
  quality: 0.85, // Good quality
};

export const LOW_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 3,
  maxWidthOrHeight: 1920, // Full HD
  useWebWorker: true,
  quality: 0.75, // Acceptable quality
};

export const ULTRA_HIGH_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 30, // Allow very large files for HD photos
  maxWidthOrHeight: 6144, // 6K resolution support
  useWebWorker: true,
  quality: 0.98, // Near-lossless quality
};

export interface CompressionResult {
  originalFile: File;
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  savedBytes: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<CompressionResult> {
  try {
    // Only compress image files
    if (!file.type.startsWith('image/')) {
      return {
        originalFile: file,
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        savedBytes: 0,
      };
    }

    const compressedBlob = await imageCompression(file, options);
    
    // Ensure we have a proper File object
    const compressedFile = new File([compressedBlob], file.name, {
      type: compressedBlob.type || file.type,
      lastModified: Date.now(),
    });
    
    const originalSize = file.size;
    const compressedSize = compressedFile.size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
    const savedBytes = originalSize - compressedSize;

    return {
      originalFile: file,
      compressedFile,
      originalSize,
      compressedSize,
      compressionRatio,
      savedBytes,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file if compression fails
    return {
      originalFile: file,
      compressedFile: file,
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
      savedBytes: 0,
    };
  }
}

export async function compressImages(
  files: FileList,
  options: CompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<CompressionResult[]> {
  const compressionPromises = Array.from(files).map(file => compressImage(file, options));
  return Promise.all(compressionPromises);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getCompressionQualityLabel(options: CompressionOptions): string {
  if (options.quality >= 0.95) return 'Ultra High Quality';
  if (options.quality >= 0.9) return 'High Quality';
  if (options.quality >= 0.8) return 'Medium Quality';
  if (options.quality >= 0.6) return 'Low Quality';
  return 'Very Low Quality';
}
