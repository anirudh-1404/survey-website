"use client";

import { useState, useRef, ChangeEvent } from "react";
import {
  Upload,
  Link as LinkIcon,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
} from "lucide-react";

interface PollImageUploaderProps {
  imageUrl: string;
  cloudinaryPublicId: string;
  imageAlt: string;
  onChange: (data: {
    imageUrl: string;
    cloudinaryPublicId: string;
    imageAlt: string;
  }) => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function PollImageUploader({
  imageUrl,
  cloudinaryPublicId,
  imageAlt,
  onChange,
  disabled = false,
}: PollImageUploaderProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(imageUrl || "");
  const [altInput, setAltInput] = useState(imageAlt || "");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting the same file fires change event
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploadError(null);
    setUploadSuccess(null);
    setPreviewError(false);

    // 1. Client-side validation
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      setUploadError(
        "Invalid file format. Please upload a JPEG, PNG, or WebP image."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 5MB limit.`
      );
      return;
    }

    // 2. Perform upload
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Failed to upload image to Cloudinary.");
        setIsUploading(false);
        return;
      }

      setUploadSuccess("Image uploaded to Cloudinary successfully.");
      setUrlInput(data.data.url);
      onChange({
        imageUrl: data.data.url,
        cloudinaryPublicId: data.data.publicId,
        imageAlt: altInput.trim() || file.name.replace(/\.[^/.]+$/, ""),
      });
    } catch {
      setUploadError(
        "A network error occurred during upload. Please check your connection and retry."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    setUploadError(null);
    setUploadSuccess(null);
    setPreviewError(false);

    const clean = urlInput.trim();
    if (!clean) {
      onChange({
        imageUrl: "",
        cloudinaryPublicId: "",
        imageAlt: "",
      });
      return;
    }

    try {
      const parsed = new URL(clean);
      if (parsed.protocol !== "https:") {
        setUploadError("Image URL must use secure HTTPS protocol (https://).");
        return;
      }
    } catch {
      setUploadError("Please provide a valid URL format (e.g. https://...).");
      return;
    }

    onChange({
      imageUrl: clean,
      cloudinaryPublicId: "", // External URL does not have a Cloudinary asset ID
      imageAlt: altInput.trim(),
    });
    setUploadSuccess("External image URL applied.");
  };

  const handleRemove = () => {
    setUrlInput("");
    setAltInput("");
    setUploadError(null);
    setUploadSuccess(null);
    setPreviewError(false);
    onChange({
      imageUrl: "",
      cloudinaryPublicId: "",
      imageAlt: "",
    });
  };

  const handleAltChange = (val: string) => {
    setAltInput(val);
    onChange({
      imageUrl,
      cloudinaryPublicId,
      imageAlt: val,
    });
  };

  const hasImage = Boolean(imageUrl && !previewError);
  const isCloudinary = Boolean(cloudinaryPublicId || imageUrl.includes("cloudinary.com"));

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#10121a] p-5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="text-sm font-semibold text-white flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-rose-400" />
            <span>Featured Poll Image</span>
            <span className="text-xs font-normal text-zinc-400">(Optional)</span>
          </label>
          <p className="text-xs text-zinc-400">
            Display an editorial lead image on cards, homepage features, and poll details.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex rounded-lg bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === "upload"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Cloudinary Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              mode === "url"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>External URL</span>
          </button>
        </div>
      </div>

      {/* Upload or URL Controls */}
      {mode === "upload" ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            id="poll-image-file-input"
            disabled={disabled || isUploading}
          />

          <div
            onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-[#090a0f] p-6 text-center transition-all ${
              isUploading || disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-rose-500/50 hover:bg-white/[0.02]"
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
                <span className="text-xs font-medium text-zinc-300">
                  Optimizing and uploading to Cloudinary CDN...
                </span>
                <span className="text-[11px] text-zinc-500">
                  Generating responsive web assets
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-950/40 text-rose-400 border border-rose-900/30">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white">
                    Click to browse or drop an image file
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    JPEG, PNG, or WebP • Maximum file size 5MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 rounded-md border border-white/10 bg-[#090a0f] px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              disabled={disabled || !urlInput.trim()}
              className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Apply URL
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Provide a direct, high-resolution HTTPS image link.
          </p>
        </div>
      )}

      {/* Error & Success Feedback */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span className="flex-1">{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-400 hover:text-white"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {uploadSuccess && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="flex-1">{uploadSuccess}</span>
        </div>
      )}

      {/* Active Image Preview Container */}
      {hasImage && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-300">Active Preview</span>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium border ${
                  isCloudinary
                    ? "bg-sky-950/40 border-sky-800/40 text-sky-300"
                    : "bg-zinc-800/60 border-zinc-700 text-zinc-300"
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
                <span>{isCloudinary ? "Cloudinary CDN" : "External HTTPS"}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Aspect-Ratio Image Container */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-[#07080c]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={altInput || "Poll featured preview"}
              onError={() => setPreviewError(true)}
              className="h-full w-full object-cover transition-opacity duration-300"
            />
          </div>

          {/* Accessible Alt Text Input */}
          <div className="space-y-1">
            <label
              htmlFor="poll-image-alt-input"
              className="block text-xs font-medium text-zinc-300"
            >
              Image Description / Alt Text (Accessibility & SEO):
            </label>
            <input
              id="poll-image-alt-input"
              type="text"
              placeholder="Brief description of the image for screen readers and SEO..."
              value={altInput}
              onChange={(e) => handleAltChange(e.target.value)}
              maxLength={200}
              className="w-full rounded-md border border-white/10 bg-[#090a0f] px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              disabled={disabled}
            />
            <div className="flex justify-end text-[10px] text-zinc-500">
              {altInput.length}/200 characters
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
