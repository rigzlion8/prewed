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

  constructor(file: File, options: ChunkUploadOptions, onProgress?: (progress: number) => void) {
    this.file = file;
    this.options = options;
    this.onProgress = onProgress;
  }

  async upload(): Promise<ChunkUploadResult> {
    const totalChunks = Math.ceil(this.file.size / this.options.chunkSize);
    const uploadedChunks: string[] = [];

    try {
      // Upload each chunk
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
        const response = await fetch('/api/media/chunk', {
          method: 'POST',
          body: formData,
        });

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
          return { 
            success: false, 
            error: `Chunk ${chunkIndex} upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private async assembleChunks(chunkIds: string[], fileName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/media/assemble', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunkIds,
          fileName,
          fileType: this.file.type
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error: `Assembly failed: ${error}` };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Assembly failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

// Helper function to create chunked uploader
export function createChunkedUploader(
  file: File, 
  onProgress?: (progress: number) => void
): ChunkedUploader {
  const options: ChunkUploadOptions = {
    chunkSize: 1 * 1024 * 1024, // 1MB chunks (safe for Vercel free tier)
    maxRetries: 3,
    retryDelay: 1000 // 1 second
  };

  return new ChunkedUploader(file, options, onProgress);
}
