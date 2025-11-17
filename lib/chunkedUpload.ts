// Chunked upload implementation for Vercel free tier limitations
export interface ChunkUploadOptions {
  chunkSize: number; // Size of each chunk in bytes
  maxRetries: number; // Number of retry attempts
  retryDelay: number; // Delay between retries in ms
}

export interface ChunkUploadResult {
  success: boolean;
  error?: string;
  uploadedChunks?: number;
  totalChunks?: number;
}

export class ChunkedUploader {
  private file: File;
  private options: ChunkUploadOptions;
  private onProgress?: (progress: number) => void;
  private uploadedBy?: string;
  private caption?: string;

  constructor(
    file: File,
    options: ChunkUploadOptions,
    onProgress?: (progress: number) => void,
    uploadedBy?: string,
    caption?: string
  ) {
    this.file = file;
    this.options = options;
    this.onProgress = onProgress;
    this.uploadedBy = uploadedBy;
    this.caption = caption;
  }

  async upload(): Promise<ChunkUploadResult> {
    const totalChunks = Math.ceil(this.file.size / this.options.chunkSize);
    const uploadedChunks: string[] = [];

    try {
      // Upload each chunk with delays to avoid overwhelming the server
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.options.chunkSize;
        const end = Math.min(start + this.options.chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);

        const chunkResult = await this.uploadChunk(chunk, i, totalChunks);
        
        if (!chunkResult.success) {
          throw new Error(chunkResult.error || 'Chunk upload failed');
        }

        uploadedChunks.push(chunkResult.chunkId!);
        
        // Update progress
        const progress = ((i + 1) / totalChunks) * 100;
        this.onProgress?.(progress);
        
        // Add small delay between chunks to avoid rate limiting (except for last chunk)
        if (i < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        }
      }

      // Assemble chunks on server
      const assembleResult = await this.assembleChunks(uploadedChunks, this.file.name);
      
      if (!assembleResult.success) {
        throw new Error(assembleResult.error || 'Failed to assemble chunks');
      }

      return {
        success: true,
        uploadedChunks: uploadedChunks.length,
        totalChunks
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        uploadedChunks: uploadedChunks.length,
        totalChunks
      };
    }
  }

  private async uploadChunk(chunk: Blob, chunkIndex: number, totalChunks: number): Promise<{ success: boolean; error?: string; chunkId?: string }> {
    console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}, size: ${(chunk.size / 1024 / 1024).toFixed(2)}MB`);
    
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileName', this.file.name);
    formData.append('fileType', this.file.type);

    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        // Add timeout to fetch request (30 seconds per chunk)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch('/api/media/chunk', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          return { success: true, chunkId: result.chunkId };
        } else {
          const error = await response.text();
          if (attempt === this.options.maxRetries - 1) {
            return { success: false, error: `Chunk ${chunkIndex} upload failed: ${error}` };
          }
        }
      } catch (error) {
        if (attempt === this.options.maxRetries - 1) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          // Check if it's a timeout/abort error
          if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
            return { 
              success: false, 
              error: `Chunk ${chunkIndex} upload timed out. Please try again with a smaller file or check your connection.` 
            };
          }
          return { 
            success: false, 
            error: `Chunk ${chunkIndex} upload failed: ${errorMessage}` 
          };
        }
      }

      // Exponential backoff: wait longer with each retry
      const backoffDelay = this.options.retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private async assembleChunks(chunkIds: string[], fileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Add timeout for assembly (5 minutes for large files)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes
      
      const response = await fetch('/api/media/assemble', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunkIds,
          fileName,
          fileType: this.file.type,
          uploadedBy: this.uploadedBy,
          caption: this.caption,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error: `Assembly failed: ${error}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('aborted') || errorMessage.includes('timeout')) {
        return { 
          success: false, 
          error: 'Assembly timed out. The file may be too large. Please try again or contact support.' 
        };
      }
      return { 
        success: false, 
        error: `Assembly failed: ${errorMessage}` 
      };
    }
  }
}

// Helper function to create chunked uploader
export function createChunkedUploader(
  file: File, 
  onProgress?: (progress: number) => void,
  uploadedBy?: string,
  caption?: string
): ChunkedUploader {
  // Use 4MB chunks for better performance with large files (stays under 4.5MB Vercel limit)
  // This reduces number of chunks: 150MB file = ~38 chunks instead of 150 chunks
  const chunkSize = 4 * 1024 * 1024; // 4MB chunks
  
  const options: ChunkUploadOptions = {
    chunkSize,
    maxRetries: 5, // Increased retries for better reliability
    retryDelay: 2000 // 2 seconds between retries
  };

  return new ChunkedUploader(file, options, onProgress, uploadedBy, caption);
}
