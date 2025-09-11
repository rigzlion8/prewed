import { useState, useEffect } from 'react';

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
      const formData = new FormData();
      
      // Add all files to form data
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      
      formData.append('uploadedBy', uploadedBy);
      formData.append('caption', caption);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

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
    } catch (err) {
      const errorMessage = 'Network error during upload';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
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
