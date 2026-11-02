"use client";

import { useState, useRef, ChangeEvent } from "react";
import {
  Upload,
  Link as LinkIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Video as VideoIcon,
  Info,
  Maximize2,
} from "lucide-react";
import { AdPlacement, PLACEMENT_SPECS } from "@/types/ad";

interface AdMediaUploaderProps {
  mediaType: "image" | "video";
  mediaUrl: string;
  placement: AdPlacement;
  cloudinaryPublicId?: string;
  onChange: (data: { mediaUrl: string; cloudinaryPublicId?: string }) => void;
  disabled?: boolean;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/**
 * Inspect image or video file dimensions asynchronously
 */
function getMediaDimensions(
  file: File,
  mediaType: "image" | "video"
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: video.videoWidth, height: video.videoHeight });
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read video file dimensions."));
      };
      video.src = objectUrl;
    } else {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to read image file dimensions."));
      };
      img.src = objectUrl;
    }
  });
}

export function AdMediaUploader({
  mediaType,
  mediaUrl,
  placement,
  cloudinaryPublicId,
  onChange,
  disabled = false,
}: AdMediaUploaderProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(mediaUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [detectedDimensions, setDetectedDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const spec = PLACEMENT_SPECS[placement] || PLACEMENT_SPECS.banner_top;

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError(null);
    setUploadSuccess(null);
    setDetectedDimensions(null);

    // 1. Validate file mime type
    if (mediaType === "image" && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setUploadError("Invalid image format. Supported formats: JPEG, PNG, WebP.");
      return;
    }
    if (mediaType === "video" && !ALLOWED_VIDEO_TYPES.includes(file.type.toLowerCase())) {
      setUploadError("Invalid video format. Supported formats: MP4, WebM, MOV.");
      return;
    }

    // 2. Validate file size (5MB image, 25MB video)
    const maxBytes = mediaType === "video" ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `File exceeds maximum permitted size of ${mediaType === "video" ? "25 MB" : "5 MB"}.`
      );
      return;
    }

    // 3. Strict Aspect Ratio & Dimension Check
    try {
      const dimensions = await getMediaDimensions(file, mediaType);
      setDetectedDimensions(dimensions);

      const actualRatio = dimensions.width / dimensions.height;
      const expectedRatio = spec.aspectRatioValue;
      const ratioDiff = Math.abs(actualRatio - expectedRatio) / expectedRatio;

      // Minimum resolution validation
      if (dimensions.width < spec.minWidth || dimensions.height < spec.minHeight) {
        setUploadError(
          `Image resolution (${dimensions.width}x${dimensions.height}px) is too small for ${spec.name}. Minimum required: ${spec.minWidth}x${spec.minHeight}px.`
        );
        return;
      }

      // Aspect ratio tolerance validation
      if (ratioDiff > spec.tolerance) {
        setUploadError(
          `Aspect ratio mismatch for ${spec.name}! Detected: ${(actualRatio).toFixed(2)}:1 (${dimensions.width}x${dimensions.height}px). Required ratio is ${spec.ratio} (Recommended: ${spec.recommendedWidth}x${spec.recommendedHeight}px). Please crop or resize your asset.`
        );
        return;
      }

      // 4. Proceed to upload
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: {
          "x-csrf-token": "verified",
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Upload failed");
      }

      onChange({
        mediaUrl: data.data.url,
        cloudinaryPublicId: data.data.publicId,
      });
      setUrlInput(data.data.url);
      setUploadSuccess(
        `✓ Validated & Uploaded (${dimensions.width}x${dimensions.height}px) to Cloudinary successfully!`
      );
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to process asset.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onChange({ mediaUrl: "", cloudinaryPublicId: undefined });
      return;
    }

    if (!trimmed.startsWith("https://")) {
      setUploadError("URL must begin with https:// for security.");
      return;
    }

    setUploadError(null);
    onChange({ mediaUrl: trimmed, cloudinaryPublicId: undefined });
  };

  const handleClear = () => {
    setUrlInput("");
    setUploadError(null);
    setUploadSuccess(null);
    setDetectedDimensions(null);
    onChange({ mediaUrl: "", cloudinaryPublicId: undefined });
  };

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#0d0f17] p-4">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          {mediaType === "video" ? (
            <VideoIcon className="h-4 w-4 text-rose-500" />
          ) : (
            <ImageIcon className="h-4 w-4 text-rose-500" />
          )}
          <span>{mediaType === "video" ? "Video Asset" : "Image Asset"}</span>
        </label>

        {/* Upload Mode Selector */}
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              mode === "upload"
                ? "bg-rose-600 text-white font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Upload className="h-3 w-3" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              mode === "url"
                ? "bg-rose-600 text-white font-medium"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LinkIcon className="h-3 w-3" />
            External URL
          </button>
        </div>
      </div>

      {/* Required Ratio & Resolution Guidance Badge for Selected Placement */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 flex items-start gap-3 text-xs">
        <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
          <Maximize2 className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              {spec.name} Requirements:
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/30 border border-rose-500/40 text-rose-200 font-mono font-bold text-[11px]">
              Ratio {spec.ratio}
            </span>
            <span className="px-2 py-0.5 rounded bg-white/10 text-zinc-300 font-mono text-[11px]">
              Recommended: {spec.recommendedWidth} × {spec.recommendedHeight}px
            </span>
            <span className="text-zinc-500 text-[10px]">
              (Min: {spec.minWidth} × {spec.minHeight}px)
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {spec.description}. Assets not matching this aspect ratio will be blocked to protect platform aesthetics.
          </p>
        </div>
      </div>

      {/* Upload Box */}
      {mode === "upload" ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === "video" ? "video/mp4,video/webm,video/quicktime" : "image/*"}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-full flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-rose-500/50 transition-all cursor-pointer group"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
                <p className="text-xs text-zinc-300">
                  Validating dimensions & uploading {mediaType}...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="h-10 w-10 rounded-full bg-white/[0.05] flex items-center justify-center group-hover:scale-110 transition-transform text-rose-400">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-200">
                  Click to select {mediaType === "video" ? "MP4 / WebM video" : "PNG / JPEG / WebP image"}
                </p>
                <p className="text-[11px] text-rose-400 font-medium">
                  Enforcing Ratio: {spec.ratio} ({spec.recommendedWidth}×{spec.recommendedHeight}px)
                </p>
                <p className="text-[10px] text-zinc-500">
                  Max file size: {mediaType === "video" ? "25 MB" : "5 MB"}
                </p>
              </div>
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={`https://example.com/asset.${mediaType === "video" ? "mp4" : "jpg"}`}
            disabled={disabled}
            className="flex-1 rounded-lg border border-white/10 bg-[#08090d] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApplyUrl}
            disabled={disabled}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Validation / Error Feedback */}
      {uploadError && (
        <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <span className="font-semibold text-rose-200">Upload Rejected:</span>
            <p className="text-[11px] text-rose-300/90 leading-relaxed">{uploadError}</p>
          </div>
        </div>
      )}
      {uploadSuccess && (
        <p className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{uploadSuccess}</span>
        </p>
      )}

      {/* Live Preview Card */}
      {mediaUrl && (
        <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black/60 shadow-xl">
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-black/80 hover:bg-rose-600 text-white transition-colors"
            title="Remove media"
          >
            <X className="h-4 w-4" />
          </button>

          {mediaType === "video" ? (
            <div className="relative aspect-video max-h-56 w-full flex items-center justify-center bg-black">
              <video
                src={mediaUrl}
                controls
                muted
                className="max-h-56 w-full object-contain"
              />
            </div>
          ) : (
            <div className="relative max-h-64 w-full flex items-center justify-center bg-black/40 p-2">
              <img
                src={mediaUrl}
                alt="Ad Preview"
                className="max-h-60 max-w-full rounded object-contain"
              />
            </div>
          )}

          <div className="p-3 bg-[#0a0c12] border-t border-white/10 text-[11px] text-zinc-400 flex items-center justify-between">
            <span className="truncate max-w-[70%]">{mediaUrl}</span>
            <div className="flex items-center gap-2 shrink-0">
              {detectedDimensions && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {detectedDimensions.width}×{detectedDimensions.height}px
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-zinc-300">
                {mediaType}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
