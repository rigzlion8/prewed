import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Media from '@/models/Media';
import Chunk from '@/models/Chunk';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Set max duration for chunk assembly
export const maxDuration = 300; // 5 minutes for assembly

// POST - Assemble chunks into final file
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { chunkIds, fileName, fileType, uploadedBy, caption } = await request.json();

    if (!chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No chunk IDs provided' }, { status: 400 });
    }

    const uploadsDir = join('/tmp', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    console.log('Server: Starting chunk assembly...');
    console.log('Server: Looking for chunks:', chunkIds);

    // Fetch chunks from MongoDB
    const chunkDocs = await Chunk.find({ chunkId: { $in: chunkIds } }).sort({ chunkIndex: 1 });
    
    console.log(`Server: Found ${chunkDocs.length} chunks in database`);

    if (chunkDocs.length !== chunkIds.length) {
      const foundIds = chunkDocs.map(doc => doc.chunkId);
      const missingIds = chunkIds.filter(id => !foundIds.includes(id));
      console.error('Server: Missing chunks:', missingIds);
      return NextResponse.json(
        { success: false, error: `Missing chunks: ${missingIds.join(', ')}` },
        { status: 500 }
      );
    }

    // Prepare chunk data
    const chunkData: { index: number; data: Buffer }[] = chunkDocs.map(doc => ({
      index: doc.chunkIndex,
      data: doc.data
    }));

    // Sort chunks by index
    chunkData.sort((a, b) => a.index - b.index);

    // Concatenate chunks
    const totalSize = chunkData.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const assembledBuffer = Buffer.alloc(totalSize);
    
    let offset = 0;
    for (const chunk of chunkData) {
      chunk.data.copy(assembledBuffer, offset);
      offset += chunk.data.length;
    }

    console.log(`Server: Assembled file size: ${(assembledBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    // Save assembled file temporarily
    const uniqueFilename = `${uuidv4()}_${fileName}`;
    const filePath = join(uploadsDir, uniqueFilename);
    await writeFile(filePath, assembledBuffer);

    // Upload to Cloudinary
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: fileType.startsWith('video/') ? 'video' : 'image',
      folder: 'ayie-ceremony',
      public_id: uniqueFilename.replace(/\.[^/.]+$/, ''),
    });

    // Save to database
    const mediaData = {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      fileName: fileName,
      fileType: fileType,
      uploadedBy: uploadedBy || 'guest',
      caption: caption || '',
      isPublic: true,
    };

    const media = new Media(mediaData);
    await media.save();

    // Clean up chunks from database
    await Chunk.deleteMany({ chunkId: { $in: chunkIds } });

    // Clean up temporary file
    try {
      const { unlink } = require('fs/promises');
      await unlink(filePath);
    } catch (error) {
      console.warn('Could not delete temporary file:', error);
    }

    console.log('Server: Chunk assembly completed successfully');

    return NextResponse.json({
      success: true,
      data: media,
      message: 'File assembled and uploaded successfully'
    });

  } catch (error) {
    console.error('Error assembling chunks:', error);
    return NextResponse.json(
      { success: false, error: 'Assembly failed' },
      { status: 500 }
    );
  }
}