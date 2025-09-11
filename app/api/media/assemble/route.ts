import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Media from '@/models/Media';
import Chunk from '@/models/Chunk';
import { writeFile, mkdir, readFile } from 'fs/promises';
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

    // Upload to Cloudinary using signed upload (same as main media route)
    const cloudinaryFormData = new FormData();
    const arrayBuffer = assembledBuffer.buffer.slice(assembledBuffer.byteOffset, assembledBuffer.byteOffset + assembledBuffer.byteLength);
    const fileBlob = new Blob([arrayBuffer], { type: fileType });
    cloudinaryFormData.append('file', fileBlob, fileName);
    cloudinaryFormData.append('upload_preset', 'ml_default');
    cloudinaryFormData.append('folder', 'nikita-kevin-ayie-ceremony');
    
    // Add API key and timestamp for signature
    const timestamp = Math.round(new Date().getTime() / 1000);
    cloudinaryFormData.append('timestamp', timestamp.toString());
    cloudinaryFormData.append('api_key', process.env.CLOUDINARY_API_KEY!);
    
    // Generate signature for signed upload
    const crypto = require('crypto');
    const params = `folder=nikita-kevin-ayie-ceremony&timestamp=${timestamp}&upload_preset=ml_default`;
    const signature = crypto
      .createHash('sha1')
      .update(params + process.env.CLOUDINARY_SECRET)
      .digest('hex');
    cloudinaryFormData.append('signature', signature);

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_NAME}/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text();
      console.error('Cloudinary upload failed:', cloudinaryResponse.status, errorText);
      throw new Error(`Cloudinary upload failed: ${cloudinaryResponse.status} - ${errorText}`);
    }

    const uploadResult = await cloudinaryResponse.json();
    console.log('Cloudinary upload successful:', uploadResult.public_id);

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