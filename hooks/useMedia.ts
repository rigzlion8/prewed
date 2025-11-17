import { useState, useEffect } from 'react';
import { createChunkedUploader } from '@/lib/chunkedUpload';

export interface MediaItem {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  publicId: string;
  type: 'photo' | 'video';
  size: number;
  uploadedBy?: string;
  caption?: string;
  tags?: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResponse {
  success: boolean;
  data?: MediaItem[];
  message?: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const useMedia = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all media
  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/media');
      const result = await response.json();
      
      if (result.success) {
        setMedia(result.data);
      } else {
        setError(result.error || 'Failed to fetch media');
      }
    } catch (err) {
      setError('Network error while fetching media');
    } finally {
      setLoading(false);
    }
  };

  // Upload media files with progress tracking
  const uploadMedia = async (
    files: FileList,
    uploadedBy: string = 'guest',
    caption: string = '',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const fileArray = Array.from(files);
      const largeFileThreshold = 10 * 1024 * 1024; // 10MB threshold for individual files
      const totalSizeThreshold = 4 * 1024 * 1024; // 4MB total size threshold (stays under Vercel's 4.5MB limit)
      
      const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
      
      console.log('File sizes:', fileArray.map(f => ({ name: f.name, size: f.size, sizeMB: (f.size / 1024 / 1024).toFixed(2) })));
      console.log('Total size:', (totalSize / 1024 / 1024).toFixed(2), 'MB');
      console.log('Large file threshold:', largeFileThreshold, 'bytes');
      console.log('Total size threshold:', totalSizeThreshold, 'bytes');
      
      // Use chunked upload if:
      // 1. Any individual file is > 10MB, OR
      // 2. Total size of all files > 4MB (to stay under Vercel's 4.5MB request body limit)
      const hasLargeFiles = fileArray.some(file => file.size > largeFileThreshold);
      const exceedsTotalThreshold = totalSize > totalSizeThreshold;
      
      console.log('Has large files:', hasLargeFiles);
      console.log('Exceeds total threshold:', exceedsTotalThreshold);
      
      if (hasLargeFiles || exceedsTotalThreshold) {
        console.log('Using chunked upload (large file or total size exceeds threshold)...');
        return await uploadLargeFiles(fileArray, uploadedBy, caption, onProgress);
      }
      
      console.log('Using regular upload for small files...');
      
      // Regular upload for smaller files
      const formData = new FormData();
      
      // Add all files to form data
      fileArray.forEach((file) => {
        formData.append('files', file);
      });
      
      formData.append('uploadedBy', uploadedBy);
      formData.append('caption', caption);

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Client-side timeout triggered after 5 minutes');
        controller.abort();
      }, 300000); // 5 minutes timeout (matches Vercel hobby plan limit)

      console.log('Starting upload request...');
      const startTime = Date.now();
      
      try {
        const response = await fetch('/api/media', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });

        const endTime = Date.now();
        console.log(`Upload request completed in ${(endTime - startTime) / 1000} seconds`);
        
        clearTimeout(timeoutId);
        
        // Handle specific HTTP status codes
        if (response.status === 413) {
          const errorMessage = 'Upload too large! Try uploading fewer photos or videos at once or use a lower quality setting.';
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }

        if (!response.ok) {
          const errorMessage = `Upload failed with status ${response.status}. Please try again.`;
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }

        const result = await response.json();
        
        if (result.success) {
          // Refresh media list
          await fetchMedia();
          return result;
        } else {
          setError(result.error || 'Upload failed');
          return result;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          const errorMessage = 'Upload timeout - file may be too large or connection too slow. Please try again or use a smaller file.';
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
        
        const errorMessage = `Upload failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      let errorMessage = 'Network error during upload';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Upload timeout - file may be too large or connection too slow. Please try again or use a smaller file.';
        } else {
          errorMessage = `Upload failed: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Upload large files using chunked upload
  const uploadLargeFiles = async (
    files: File[],
    uploadedBy: string = 'guest',
    caption: string = '',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> => {
    try {
      const uploadedMedia: MediaItem[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Uploading large file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        const uploader = createChunkedUploader(file, (progress) => {
          onProgress?.({
            loaded: (progress / 100) * file.size,
            total: file.size,
            percentage: progress
          });
        }, uploadedBy, caption);
        
        const result = await uploader.upload();
        
        if (!result.success) {
          throw new Error(result.error || 'Chunked upload failed');
        }
        
        // Fetch the uploaded media from the database
        const response = await fetch('/api/media');
        const mediaResult = await response.json();
        
        if (mediaResult.success) {
          // Find the most recently uploaded item (should be our file)
          const recentMedia = mediaResult.data[0];
          if (recentMedia) {
            uploadedMedia.push(recentMedia);
          }
        }
      }
      
      return {
        success: true,
        data: uploadedMedia,
        message: `Successfully uploaded ${uploadedMedia.length} large file(s) using chunked upload`
      };
      
    } catch (error) {
      const errorMessage = `Chunked upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Update media
  const updateMedia = async (id: string, updates: Partial<MediaItem>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        setMedia(prev => prev.map(item => 
          item._id === id ? { ...item, ...result.data } : item
        ));
        return result;
      } else {
        setError(result.error || 'Update failed');
        return result;
      }
    } catch (err) {
      const errorMessage = 'Network error during update';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete media
  const deleteMedia = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        // Remove from local state
        setMedia(prev => prev.filter(item => item._id !== id));
        return result;
      } else {
        setError(result.error || 'Delete failed');
        return result;
      }
    } catch (err) {
      const errorMessage = 'Network error during deletion';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Load media on mount
  useEffect(() => {
    fetchMedia();
  }, []);

  return {
    media,
    loading,
    error,
    fetchMedia,
    uploadMedia,
    updateMedia,
    deleteMedia,
  };
};
