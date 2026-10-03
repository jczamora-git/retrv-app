export type MediaType = "image" | "video";

export type MediaItemStatus =
  | "preparing"
  | "ready"
  | "uploading"
  | "uploaded"
  | "error";

export interface ComposerMediaItem {
  id: string;
  file: File;
  type: MediaType;
  previewUrl: string;
  optimizedFile?: File;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  originalSize: number;
  optimizedSize?: number;
  status: MediaItemStatus;
  uploadProgress?: number;
  error?: string;
  remoteUrl?: string;
  remoteKey?: string;
}

export interface PostMediaItem {
  id?: string;
  url: string;
  key?: string;
  type: MediaType;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}

export interface ImageOptimizationResult {
  optimizedFile: File;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  previewUrl: string;
  mimeType: string;
}

export interface VideoMetadataResult {
  duration: number;
  width: number;
  height: number;
  posterBlob?: Blob;
  posterUrl: string;
}
