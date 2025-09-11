import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Chunk from '@/models/Chunk';
import { v4 as uuidv4 } from 'uuid';

// Set max duration for chunk uploads
export const maxDuration = 60; // 1 minute should be enough for 1MB chunks

// POST - Upload a single chunk
export async function POST(request: NextRequest) {
  try {
    console.log('Server: Starting chunk upload...');
    await connectDB();
    
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

    // Generate unique chunk ID
    const chunkId = `${uuidv4()}_${chunkIndex}`;

    // Convert chunk to buffer
    const chunkBuffer = await chunk.arrayBuffer();

    // Store chunk in MongoDB
    const chunkDoc = new Chunk({
      chunkId,
      chunkIndex,
      totalChunks,
      fileName,
      fileType,
      data: Buffer.from(chunkBuffer),
      size: chunk.size
    });

    await chunkDoc.save();

    console.log(`Server: Chunk ${chunkIndex + 1}/${totalChunks} saved to database`);

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
