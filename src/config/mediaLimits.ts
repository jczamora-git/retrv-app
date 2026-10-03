export const MAX_MEDIA_ITEMS = 10;
export const MAX_VIDEO_ITEMS = 3;

export const MAX_IMAGE_ORIGINAL_SIZE_MB = 20;
export const MAX_IMAGE_ORIGINAL_SIZE_BYTES = MAX_IMAGE_ORIGINAL_SIZE_MB * 1024 * 1024;

export const MAX_VIDEO_ORIGINAL_SIZE_MB = 100;
export const MAX_VIDEO_ORIGINAL_SIZE_BYTES = MAX_VIDEO_ORIGINAL_SIZE_MB * 1024 * 1024;

export const MAX_VIDEO_DURATION_SECONDS = 120; // 2 minutes

export const MAX_IMAGE_DIMENSION = 2048; // Max width or height for long edge
export const IMAGE_COMPRESSION_QUALITY = 0.82; // Balanced social media quality

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm"
];

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES
];

export const ACCEPT_FILE_INPUT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm"
].join(",");
