import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set max duration for chunk uploads
export const maxDuration = 60; // 1 minute should be enough for 1MB chunks

// POST - Upload a single chunk
export async function POST(request: NextRequest) {
  try {
    console.log('Server: Starting chunk upload...');
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const fileType = formData.get('fileType') as string;

    console.log(`Server: Chunk ${chunkIndex + 1}/${totalChunks}, size: ${(chunk.size / 1024 / 1024).toFixed(2)}MB`);

    if (!chunk) {
      return NextResponse.json({ success: false, error: 'No chunk provided' }, { status: 400 });
    }

    // Create chunks directory in /tmp (Vercel serverless environment)
    const chunksDir = join('/tmp', 'chunks');
    await mkdir(chunksDir, { recursive: true });

    // Generate unique chunk ID
    const chunkId = `${uuidv4()}_${chunkIndex}`;
    const chunkPath = join(chunksDir, chunkId);

    // Save chunk to disk
    const chunkBuffer = await chunk.arrayBuffer();
    await writeFile(chunkPath, Buffer.from(chunkBuffer));

    // Store chunk metadata
    const metadata = {
      chunkId,
      chunkIndex,
      totalChunks,
      fileName,
      fileType,
      size: chunk.size,
      timestamp: Date.now()
    };

    const metadataPath = join(chunksDir, `${chunkId}.meta`);
    await writeFile(metadataPath, JSON.stringify(metadata));

    return NextResponse.json({ 
      success: true, 
      chunkId,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`
    });

  } catch (error) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}
