import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Media from '@/models/Media';
import { readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// POST - Assemble chunks into final file
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { chunkIds, fileName, fileType } = await request.json();

    if (!chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No chunk IDs provided' }, { status: 400 });
    }

    const chunksDir = join('/tmp', 'chunks');
    const uploadsDir = join('/tmp', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Read and sort chunks by index
    const chunkData: { index: number; data: Buffer }[] = [];
    
    for (const chunkId of chunkIds) {
      const metadataPath = join(chunksDir, `${chunkId}.meta`);
      const chunkPath = join(chunksDir, chunkId);
      
      try {
        const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
        const chunkBuffer = await readFile(chunkPath);
        
        chunkData.push({
          index: metadata.chunkIndex,
          data: chunkBuffer
        });
      } catch (error) {
        console.error(`Error reading chunk ${chunkId}:`, error);
        return NextResponse.json({ success: false, error: `Failed to read chunk ${chunkId}` }, { status: 500 });
      }
    }

    // Sort chunks by index
    chunkData.sort((a, b) => a.index - b.index);

    // Assemble file
    const assembledBuffer = Buffer.concat(chunkData.map(chunk => chunk.data));
    const uniqueFileName = `${uuidv4()}_${fileName}`;
    const filePath = join(uploadsDir, uniqueFileName);

    await writeFile(filePath, assembledBuffer);

    // Save to database
    const mediaData = {
      filename: uniqueFileName,
      originalName: fileName,
      url: `/uploads/${uniqueFileName}`,
      publicId: `chunked-${uuidv4()}`,
      type: fileType.startsWith('video/') ? 'video' : 'photo',
      size: assembledBuffer.length,
      uploadedBy: 'chunked-upload',
      caption: `Chunked upload: ${fileName}`,
      tags: ['chunked-upload'],
      isPublic: true,
    };

    const media = new Media(mediaData);
    await media.save();

    // Clean up chunks
    for (const chunkId of chunkIds) {
      try {
        await unlink(join(chunksDir, chunkId));
        await unlink(join(chunksDir, `${chunkId}.meta`));
      } catch (error) {
        console.warn(`Failed to clean up chunk ${chunkId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: media,
      message: 'File assembled and uploaded successfully'
    });

  } catch (error) {
    console.error('Error assembling chunks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assemble chunks' },
      { status: 500 }
    );
  }
}
