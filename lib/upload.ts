// File operations moved to API route to avoid client-side fs/promises issues

export function getFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const UPLOAD_LIMITS = {
  maxFileSize: 500 * 1024 * 1024, // 500MB - significantly increased for large files
  maxVideoSize: 200 * 1024 * 1024, // 200MB for videos (separate limit)
  maxFilesPerUpload: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
};

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check if it's a video file
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? UPLOAD_LIMITS.maxVideoSize : UPLOAD_LIMITS.maxFileSize;
  
  if (file.size > maxSize) {
    const fileType = isVideo ? 'video' : 'file';
    return { valid: false, error: `${fileType} size must be less than ${getFileSize(maxSize)}` };
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
