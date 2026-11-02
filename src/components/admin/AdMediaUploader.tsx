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
  Play,
} from "lucide-react";

interface AdMediaUploaderProps {
  mediaType: "image" | "video";
  mediaUrl: string;
  cloudinaryPublicId?: string;
  onChange: (data: { mediaUrl: string; cloudinaryPublicId?: string }) => void;
  disabled?: boolean;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function AdMediaUploader({
  mediaType,
  mediaUrl,
  cloudinaryPublicId,
  onChange,
  disabled = false,
}: AdMediaUploaderProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(mediaUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError(null);
    setUploadSuccess(null);

    // Validate type based on mediaType
    if (mediaType === "image" && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setUploadError("Please upload a valid image (JPEG, PNG, WebP).");
      return;
    }
    if (mediaType === "video" && !ALLOWED_VIDEO_TYPES.includes(file.type.toLowerCase())) {
      setUploadError("Please upload a valid video file (MP4, WebM, MOV).");
      return;
    }

    // Size limit: 5MB for image, 25MB for video
    const maxBytes = mediaType === "video" ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `File exceeds maximum permitted size of ${mediaType === "video" ? "25 MB" : "5 MB"}.`
      );
      return;
    }

    try {
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
        `${mediaType === "video" ? "Video" : "Image"} uploaded successfully to Cloudinary!`
      );
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload file");
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
    onChange({ mediaUrl: "", cloudinaryPublicId: undefined });
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[#0d0f17] p-4">
      <div className="flex items-center justify-between">
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
                  Uploading {mediaType} to Cloudinary...
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
                <p className="text-[11px] text-zinc-500">
                  Max size: {mediaType === "video" ? "25 MB" : "5 MB"}
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

      {/* Upload Feedback */}
      {uploadError && (
        <p className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/40 p-2 rounded-lg">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{uploadError}</span>
        </p>
      )}
      {uploadSuccess && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 p-2 rounded-lg">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{uploadSuccess}</span>
        </p>
      )}

      {/* Live Preview Card */}
      {mediaUrl && (
        <div className="relative rounded-lg overflow-hidden border border-white/15 bg-black/40">
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
            title="Remove media"
          >
            <X className="h-3.5 w-3.5" />
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
            <div className="relative max-h-56 w-full flex items-center justify-center bg-black/30 p-2">
              <img
                src={mediaUrl}
                alt="Ad Preview"
                className="max-h-52 max-w-full rounded object-contain"
              />
            </div>
          )}

          <div className="p-2.5 bg-[#0a0c12] border-t border-white/10 text-[11px] text-zinc-400 flex items-center justify-between">
            <span className="truncate max-w-[80%]">{mediaUrl}</span>
            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/10 text-zinc-300">
              {mediaType}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
