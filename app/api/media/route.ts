import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Media from '@/models/Media';
import { validateFiles } from '@/lib/upload';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Set max duration for large file uploads (5 minutes)
export const maxDuration = 300;

// GET - Fetch all media
export async function GET() {
  try {
    await connectDB();
    const media = await Media.find({ isPublic: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: media });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}

// POST - Upload new media
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const uploadedBy = formData.get('uploadedBy') as string || 'guest';
    const caption = formData.get('caption') as string || '';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate all files first
    const validation = validateFiles(files as unknown as FileList);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const uploadedMedia = [];

    for (const file of files) {

      let fileUrl: string;
      let publicId: string;
      let filename: string;

      try {
        // Try Cloudinary upload first
        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append('file', file);
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

        if (cloudinaryResponse.ok) {
          const cloudinaryData = await cloudinaryResponse.json();
          fileUrl = cloudinaryData.secure_url;
          publicId = cloudinaryData.public_id;
          filename = cloudinaryData.public_id;
          console.log('Cloudinary upload successful:', cloudinaryData.public_id);
        } else {
          const errorText = await cloudinaryResponse.text();
          console.error('Cloudinary upload failed:', cloudinaryResponse.status, errorText);
          throw new Error(`Cloudinary upload failed: ${cloudinaryResponse.status} - ${errorText}`);
        }
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, falling back to local storage:', cloudinaryError);
        
        // Fallback to local storage
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadsDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const extension = file.name.split('.').pop();
        const uniqueFilename = `${timestamp}-${randomString}.${extension}`;
        
        const filepath = join(uploadsDir, uniqueFilename);
        await writeFile(filepath, buffer);
        
        const localUrl = `/uploads/${uniqueFilename}`;
        fileUrl = localUrl;
        publicId = localUrl;
        filename = file.name;
      }

      // Save to database
      const mediaData = {
        filename: filename,
        originalName: file.name,
        url: fileUrl,
        publicId: publicId,
        type: file.type.startsWith('video/') ? 'video' : 'photo',
        size: file.size,
        uploadedBy,
        caption,
        isPublic: true,
      };

      const media = new Media(mediaData);
      await media.save();
      uploadedMedia.push(media);
    }

    return NextResponse.json({
      success: true,
      data: uploadedMedia,
      message: `Successfully uploaded ${uploadedMedia.length} file(s)`,
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}
