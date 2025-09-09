import mongoose, { Document, Schema } from 'mongoose';

export interface IWish extends Document {
  name: string;
  message: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WishSchema = new Schema<IWish>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes for better performance
WishSchema.index({ createdAt: -1 });
WishSchema.index({ isPublic: 1 });

export default mongoose.models.Wish || mongoose.model<IWish>('Wish', WishSchema);
