import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Media from '@/models/Media';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const {
      date = '2015-11-14',
      type = 'video',
      limit = 2,
      uploadedBy = 'dance practice',
      caption = 'dance practice',
    } = body || {};

    // Build day range for the provided date (UTC)
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);

    // Find matching items
    const items = await Media.find({
      type,
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: 1 })
      .limit(Math.max(0, Math.min(Number(limit) || 0, 50))); // cap to 50 for safety

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No media found for the specified criteria',
        updatedCount: 0,
        items: [],
      });
    }

    const updatedIds: string[] = [];
    for (const item of items) {
      const updated = await Media.findByIdAndUpdate(
        item._id,
        { uploadedBy, caption, updatedAt: new Date() },
        { new: true }
      );
      if (updated) {
        updatedIds.push(updated._id.toString());
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedIds.length} media item(s).`,
      updatedCount: updatedIds.length,
      updatedIds,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { success: false, error: 'Bulk update failed' },
      { status: 500 }
    );
  }
}

