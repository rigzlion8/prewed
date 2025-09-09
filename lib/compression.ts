import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  quality: number;
}

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 2, // Maximum file size in MB
  maxWidthOrHeight: 1920, // Maximum width or height in pixels
  useWebWorker: true, // Use web worker for better performance
  quality: 0.8, // Compression quality (0.1 to 1.0)
};

export const HIGH_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 5,
  maxWidthOrHeight: 2560,
  useWebWorker: true,
  quality: 0.9,
};

export const MEDIUM_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  quality: 0.8,
};

export const LOW_QUALITY_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1280,
  useWebWorker: true,
  quality: 0.6,
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

    const compressedFile = await imageCompression(file, options);
    
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
  if (options.quality >= 0.9) return 'High Quality';
  if (options.quality >= 0.8) return 'Medium Quality';
  if (options.quality >= 0.6) return 'Low Quality';
  return 'Very Low Quality';
}
