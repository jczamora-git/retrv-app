import { MAX_VIDEO_DURATION_SECONDS } from "../../config/mediaLimits";
import type { VideoMetadataResult } from "../../types/media";

/**
 * Extracts video duration, dimensions, and captures a video poster frame.
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadataResult> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let hasHandledLoadedData = false;

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(videoUrl);
    };

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;

      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        cleanup();
        reject(
          new Error(
            `Video duration (${Math.round(duration)}s) exceeds the maximum allowed ${MAX_VIDEO_DURATION_SECONDS} seconds.`
          )
        );
        return;
      }

      // Seek slightly into the video to capture a non-black poster frame
      const targetTime = Math.min(1.0, duration > 1 ? 0.5 : duration / 2);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      if (hasHandledLoadedData) return;
      hasHandledLoadedData = true;

      try {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 360;
        const duration = video.duration || 0;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob((blob) => {
            cleanup();
            if (blob) {
              const posterUrl = URL.createObjectURL(blob);
              resolve({
                duration,
                width,
                height,
                posterBlob: blob,
                posterUrl
              });
            } else {
              resolve({
                duration,
                width,
                height,
                posterUrl: ""
              });
            }
          }, "image/jpeg", 0.8);
        } else {
          cleanup();
          resolve({
            duration,
            width,
            height,
            posterUrl: ""
          });
        }
      } catch (err) {
        cleanup();
        reject(new Error("Failed to capture video poster frame."));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load and validate video file."));
    };

    video.src = videoUrl;
  });
}

/**
 * Hook for server-side video transcoding pipeline.
 * Currently deferred to server-side media pipeline; prepares video metadata for upload.
 */
export async function prepareVideoForUpload(file: File): Promise<{
  file: File;
  metadata: VideoMetadataResult;
}> {
  const metadata = await extractVideoMetadata(file);
  return {
    file,
    metadata
  };
}
