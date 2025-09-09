import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Wish from '@/models/Wish';

// GET - Fetch all public wishes
export async function GET() {
  try {
    await connectDB();
    const wishes = await Wish.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to 50 most recent wishes
    
    return NextResponse.json({ 
      success: true, 
      data: wishes,
      count: wishes.length 
    });
  } catch (error) {
    console.error('Error fetching wishes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wishes' },
      { status: 500 }
    );
  }
}

// POST - Create a new wish
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, message } = body;

    // Validate input
    if (!name || !message) {
      return NextResponse.json(
        { success: false, error: 'Name and message are required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Name cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Message cannot exceed 500 characters' },
        { status: 400 }
      );
    }

    // Create new wish
    const wish = new Wish({
      name: name.trim(),
      message: message.trim(),
      isPublic: true
    });

    await wish.save();

    return NextResponse.json({
      success: true,
      data: wish,
      message: 'Thank you for your beautiful wish! We truly appreciate your kind words.'
    });
  } catch (error) {
    console.error('Error creating wish:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save wish' },
      { status: 500 }
    );
  }
}
