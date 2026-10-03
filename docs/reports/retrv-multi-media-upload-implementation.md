# Retrv Multi-Media Upload Implementation

## Previous Architecture
Prior to this release, Retrv supported single-photo image uploads in the Create Post flow:
- `PostComposerModal` allowed only one file selection via `<input type="file" accept="image/*">`.
- `useImageUpload.ts` exposed `uploadPostPhoto` targeting the UploadThing `postPhotoUploader` route (max 1 file).
- `posts` table stored a single image URL in `image_url` along with a JSONB `photos` array that primarily mirrored the single image.
- `PostCard` and `PostDetailsPage` assumed a single image element.
- Oversized camera photos (e.g. 10MB–20MB 4K/8K captures from mobile devices) were uploaded directly without client-side downscaling or EXIF metadata stripping.
- Video attachments were completely unsupported.

## New Media Model
The composer and post data model now utilizes a structured, rich media collection:
- **Composer State (`ComposerMediaItem`):**
  ```ts
  export interface ComposerMediaItem {
    id: string;
    file: File;
    type: "image" | "video";
    previewUrl: string;
    optimizedFile?: File;
    thumbnailUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
    originalSize: number;
    optimizedSize?: number;
    status: "preparing" | "ready" | "uploading" | "uploaded" | "error";
    uploadProgress?: number;
    error?: string;
    remoteUrl?: string;
    remoteKey?: string;
  }
  ```
- **Persisted Post Media (`PostMediaItem`):**
  ```ts
  export interface PostMediaItem {
    id?: string;
    url: string;
    key?: string;
    type: "image" | "video";
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;
    size?: number;
  }
  ```
- Reordering is preserved via array indices (`sort_order`). The lead item (index 0) serves as the primary cover media for feeds and social preview cards.

## Limits
Centralized in `src/config/mediaLimits.ts`:
- **`MAX_MEDIA_ITEMS`**: 10 items per post.
- **`MAX_VIDEO_ITEMS`**: 3 videos per post.
- **`MAX_IMAGE_ORIGINAL_SIZE_MB`**: 20 MB max raw size.
- **`MAX_VIDEO_ORIGINAL_SIZE_MB`**: 100 MB max raw size.
- **`MAX_VIDEO_DURATION_SECONDS`**: 120 seconds (2 minutes).
- **`MAX_IMAGE_DIMENSION`**: 2048 px (long edge).
- **`IMAGE_COMPRESSION_QUALITY`**: 0.82 (balanced social media visual quality).
- **Supported Image Types**: `image/jpeg`, `image/png`, `image/webp`.
- **Supported Video Types**: `video/mp4`, `video/quicktime` (.mov), `video/webm`.

## Image Optimization
Implemented in `src/utils/media/imageOptimizer.ts`:
1. **Decode & Dimension Inspection**: Measures natural image dimensions. If both dimensions are within 2048px, the original resolution is preserved without upscaling.
2. **Proportional Resizing**: If the long edge exceeds 2048px, it is downscaled proportionally using high-quality bicubic canvas interpolation.
3. **Format & Transparency**:
   - Transparent PNG graphics are preserved with WebP lossless/lossy alpha encoding.
   - Standard photographic images are encoded as WebP with quality 0.82 (with automatic JPEG fallback if browser canvas encoding fails).
4. **Metadata & Privacy**: Re-rendering to canvas naturally strips sensitive EXIF metadata (embedded GPS coordinates, camera serial numbers, creation timestamps) while preserving readable item markings and serial numbers.
5. **Memory Management**: Canvas and temporary object URLs are revoked immediately after optimization to avoid mobile memory spikes.

## Video Handling
Implemented in `src/utils/media/videoMetadata.ts`:
1. **Duration & Dimension Extraction**: Uses browser `<video>` metadata inspection before any upload occurs. Videos exceeding 120 seconds are rejected immediately with user feedback.
2. **Poster Frame Capture**: Automatically seeks to the first useful second (0.5s–1.0s) and captures a representative frame via `<canvas>` for instant video preview, thumbnail generation, and poster display.
3. **No Autoplay with Sound**: Feed cards and composer previews display poster thumbnails with duration badges. In Post Details, `<video controls playsinline preload="metadata">` allows user-initiated playback.

## Video Compression Status
**DEFERRED TO SERVER-SIDE MEDIA PIPELINE.**
- Client-side FFmpeg (`ffmpeg.wasm`) was intentionally excluded to prevent bundle bloat (20MB+), high memory overhead, and severe mobile battery drain.
- A clean abstraction `prepareVideoForUpload(file)` is established. Server-side transcoding can be hooked into UploadThing webhooks or Supabase Edge Functions without altering the frontend composer UI.

## Upload Pipeline
1. Client selects mixed files via multi-file picker.
2. Queue processes items with concurrency limit of 2 (optimizing images, extracting video metadata/posters).
3. Upon post submission, `uploadPostMedia` in `src/composables/useImageUpload.ts` uploads all optimized images and video files to the UploadThing `postMediaUploader` endpoint.
4. Returns an array of normalized `PostMediaItem` objects.
5. Post creation in `src/composables/usePosts.ts` stores the array in `posts.photos` JSONB and assigns the lead item's URL to `posts.image_url`.

## Database Changes
- **Zero Disruptive Migrations Required**: Supabase `posts.photos` was already provisioned as a JSONB column (`photos JSONB DEFAULT '[]'::jsonb`).
- Storing structured `PostMediaItem` JSON objects in `photos` preserves full relational fidelity without schema locks.
- `posts.image_url` is automatically populated with the cover media URL for backward compatibility with legacy consumers and third-party webhooks.

## Backward Compatibility
- `mapPostRow` in `src/composables/usePosts.ts` handles all historical data formats:
  - Posts with string array `photos: ["https://..."]` are dynamically mapped to `PostMediaItem[]`.
  - Posts with single `image_url` and empty `photos` are mapped to a 1-item `PostMediaItem[]`.
  - Posts with structured `PostMediaItem` arrays are preserved directly.
- Existing legacy posts continue to render identically without regressions.

## Feed Rendering
`PostCard.vue` dynamically adjusts layout based on media count:
- **1 Item**: Full-width card preview (aspect-ratio 16:10).
- **2 Items**: 2-column split (50% / 50%).
- **3 Items**: 3-grid layout (lead item 2fr, secondary items 1fr stacked).
- **4+ Items**: 2x2 grid with `+N` count overlay on the 4th cell for posts with 5 or more items.
- Videos show a play icon and duration badge over the poster frame.

## Mobile Compatibility
- Tested and compliant with Ionic Vue, Capacitor WebViews, and responsive desktop web views.
- Sequential / 2-worker processing prevents memory crashes on low-RAM mobile devices.
- Native touch interactions for thumbnail switching and reordering controls.

## Storage Impact
- Resizing 12MP–48MP mobile camera photos (4000x3000px, 8MB–15MB) to max 2048px WebP reduces per-photo upload size by 75%–90% (average 300KB–800KB per image).
- Video upload limit (100MB, 120s) prevents storage exhaustion.

## Known Limitations
- Client-side video compression is deferred (videos are uploaded in original web-compatible format up to 100MB / 120s).
- Direct drag-and-drop reordering is not included; reordering is executed via intuitive move controls.

## Future Server-Side Video Transcoding
- Next phase architecture will add an asynchronous transcoding worker (e.g. AWS MediaConvert, Cloudflare Stream, or FFmpeg Edge Worker) to transcode uploaded videos to 720p/1080p H.264 MP4 with adaptive streaming (HLS).
