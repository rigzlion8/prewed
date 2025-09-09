import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Wish from '@/models/Wish';

// GET - Fetch a specific wish
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const wish = await Wish.findById(params.id);
    
    if (!wish) {
      return NextResponse.json(
        { success: false, error: 'Wish not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: wish });
  } catch (error) {
    console.error('Error fetching wish:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wish' },
      { status: 500 }
    );
  }
}

// PUT - Update a wish (for admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { name, message, isPublic } = body;

    const wish = await Wish.findById(params.id);
    
    if (!wish) {
      return NextResponse.json(
        { success: false, error: 'Wish not found' },
        { status: 404 }
      );
    }

    // Update fields if provided
    if (name !== undefined) wish.name = name.trim();
    if (message !== undefined) wish.message = message.trim();
    if (isPublic !== undefined) wish.isPublic = isPublic;

    await wish.save();

    return NextResponse.json({
      success: true,
      data: wish,
      message: 'Wish updated successfully'
    });
  } catch (error) {
    console.error('Error updating wish:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update wish' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a wish (for admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const wish = await Wish.findById(params.id);
    
    if (!wish) {
      return NextResponse.json(
        { success: false, error: 'Wish not found' },
        { status: 404 }
      );
    }

    await Wish.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Wish deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting wish:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete wish' },
      { status: 500 }
    );
  }
}
