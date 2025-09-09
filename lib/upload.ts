// File operations moved to API route to avoid client-side fs/promises issues

export function getFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const UPLOAD_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFilesPerUpload: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
};

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > UPLOAD_LIMITS.maxFileSize) {
    return { valid: false, error: `File size must be less than ${getFileSize(UPLOAD_LIMITS.maxFileSize)}` };
  }
  
  if (!UPLOAD_LIMITS.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported. Please upload images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM)' };
  }
  
  return { valid: true };
}

export function validateFiles(files: FileList): { valid: boolean; error?: string } {
  if (files.length > UPLOAD_LIMITS.maxFilesPerUpload) {
    return { valid: false, error: `Maximum ${UPLOAD_LIMITS.maxFilesPerUpload} files allowed per upload` };
  }
  
  for (let i = 0; i < files.length; i++) {
    const validation = validateFile(files[i]);
    if (!validation.valid) {
      return validation;
    }
  }
  
  return { valid: true };
}
