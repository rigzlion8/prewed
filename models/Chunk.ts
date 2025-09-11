import mongoose from 'mongoose';

const ChunkSchema = new mongoose.Schema({
  chunkId: {
    type: String,
    required: true,
    unique: true
  },
  chunkIndex: {
    type: Number,
    required: true
  },
  totalChunks: {
    type: Number,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  data: {
    type: Buffer,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Auto-delete after 1 hour
  }
});

export default mongoose.models.Chunk || mongoose.model('Chunk', ChunkSchema);
