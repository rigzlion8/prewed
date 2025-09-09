export interface Wish {
  _id?: string;
  name: string;
  message: string;
  createdAt: Date;
}

export interface Media {
  _id?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadDate: Date;
  isVideo: boolean;
}
