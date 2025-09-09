import mongoose, { Document, Schema } from 'mongoose';

export interface IMedia extends Document {
  filename: string;
  originalName: string;
  url: string;
  publicId: string;
  type: 'photo' | 'video';
  size: number;
  uploadedBy?: string;
  caption?: string;
  tags?: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['photo', 'video'],
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedBy: {
    type: String,
    default: 'guest',
  },
  caption: {
    type: String,
    default: '',
  },
  tags: [{
    type: String,
  }],
  isPublic: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);
