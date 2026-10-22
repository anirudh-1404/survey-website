"use client";

import { useState, useRef } from "react";
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link2,
  Image as ImageIcon,
  Eye,
  Edit3,
  Columns,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { sanitizeRichTextHtml } from "@/lib/blog-utils";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your investigative analysis, policy breakdowns, and editorial arguments...",
  minHeight = "400px",
}: RichTextEditorProps) {
  const [viewMode, setViewMode] = useState<"write" | "preview" | "split">("write");
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Link dialog state
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Image dialog state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to insert tags around selected text or at cursor
  const insertFormatting = (before: string, after = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const replacement = `${before}${selected || "text"}${after}`;

    const newValue =
      value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + (selected ? selected.length : 4)
      );
    }, 10);
  };

  const handleApplyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    let safeUrl = linkUrl.trim();
    if (!safeUrl.startsWith("http://") && !safeUrl.startsWith("https://") && !safeUrl.startsWith("/")) {
      safeUrl = `https://${safeUrl}`;
    }

    const tag = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${
      linkText.trim() || safeUrl
    }</a>`;
    insertFormatting(tag, "");
    setLinkText("");
    setLinkUrl("");
    setShowLinkModal(false);
  };

  const handleApplyImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageError(null);

    let finalUrl = imageUrl.trim();

    // If a file was selected, upload to Cloudinary using Phase 1 upload route
    if (imageFile) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("file", imageFile);

        const res = await fetch("/api/admin/uploads", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success && data.url) {
          finalUrl = data.url;
        } else {
          setImageError(data.error || "Failed to upload image to Cloudinary.");
          setIsUploadingImage(false);
          return;
        }
      } catch {
        setImageError("Network error while uploading image to Cloudinary.");
        setIsUploadingImage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    if (!finalUrl) {
      setImageError("Please provide an image file or an external image URL.");
      return;
    }

    const alt = imageAlt.trim() || "Editorial figure";
    const imgHtml = `\n<figure class="my-6">\n  <img src="${finalUrl}" alt="${alt}" class="w-full rounded-xl border border-white/10 shadow-lg" />\n  <figcaption class="mt-2 text-center text-xs text-zinc-400 font-mono">${alt}</figcaption>\n</figure>\n`;

    insertFormatting(imgHtml, "");
    setImageFile(null);
    setImageUrl("");
    setImageAlt("");
    setShowImageModal(false);
  };

  const sanitizedHtml = sanitizeRichTextHtml(value);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0f17] overflow-hidden shadow-lg">
      {/* 1. Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-[#121522] p-2 gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            title="Heading 2"
            onClick={() => insertFormatting("<h2>", "</h2>\n")}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Heading 3"
            onClick={() => insertFormatting("<h3>", "</h3>\n")}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Heading3 className="h-4 w-4" />
          </button>

          <span className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Inline Styles */}
          <button
            type="button"
            title="Bold"
            onClick={() => insertFormatting("<strong>", "</strong>")}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Italic"
            onClick={() => insertFormatting("<em>", "</em>")}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Italic className="h-4 w-4" />
          </button>

          <span className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Lists */}
          <button
            type="button"
            title="Bullet List"
            onClick={() => insertFormatting("<ul>\n  <li>", "</li>\n</ul>\n")}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => insertFormatting("<ol>\n  <li>", "</li>\n</ol>\n")}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Blockquote"
            onClick={() => insertFormatting("<blockquote>\n  <p>", "</p>\n</blockquote>\n")}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Quote className="h-4 w-4" />
          </button>

          <span className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Links & Images */}
          <button
            type="button"
            title="Insert Link"
            onClick={() => setShowLinkModal(true)}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Link2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Insert Inline Image"
            onClick={() => setShowImageModal(true)}
            className="rounded p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 border border-white/10 rounded-lg p-0.5 bg-[#090b10]">
          <button
            type="button"
            onClick={() => setViewMode("write")}
            className={`rounded px-2.5 py-1 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === "write"
                ? "bg-rose-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Edit3 className="h-3 w-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`hidden md:flex rounded px-2.5 py-1 text-xs font-semibold items-center gap-1 transition-colors cursor-pointer ${
              viewMode === "split"
                ? "bg-rose-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Columns className="h-3 w-3" />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`rounded px-2.5 py-1 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              viewMode === "preview"
                ? "bg-rose-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* 2. Editor Body & Live Preview */}
      <div
        className={`grid ${
          viewMode === "split"
            ? "grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10"
            : "grid-cols-1"
        }`}
        style={{ minHeight }}
      >
        {/* Write Pane */}
        {(viewMode === "write" || viewMode === "split") && (
          <div className="relative h-full flex flex-col">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 w-full bg-transparent p-5 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
              style={{ minHeight }}
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div
            className="p-6 bg-[#090a0f] overflow-y-auto"
            style={{ minHeight }}
          >
            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 border-b border-white/5 pb-2 mb-4 flex items-center justify-between">
              <span>Sanitized Render Preview</span>
              <span className="text-emerald-400 font-mono">XSS-Safe HTML</span>
            </div>

            {sanitizedHtml ? (
              <div
                className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-4 text-zinc-300 [&>h2]:text-xl sm:[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-6 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:text-zinc-100 [&>h3]:mt-4 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-2 [&>blockquote]:border-rose-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-zinc-400 [&>a]:text-rose-400 hover:[&>a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-500 text-xs">
                <span>No content written yet to preview.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Link Insertion Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleApplyLink}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#121522] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Link2 className="h-4 w-4 text-rose-500" />
                <span>Insert Web Link</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Link Text (Anchor)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. World Bank Empirical Dataset"
                  className="w-full rounded-lg border border-white/10 bg-[#090b10] px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Destination URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.org/dataset"
                  className="w-full rounded-lg border border-white/10 bg-[#090b10] px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="rounded px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer"
              >
                Insert Link
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Image Insertion Modal with Cloudinary Upload */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleApplyImage}
            className="w-full max-w-lg rounded-xl border border-white/10 bg-[#121522] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-rose-500" />
                <span>Insert Inline Image</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {imageError && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-950/30 text-xs text-rose-300">
                {imageError}
              </div>
            )}

            <div className="space-y-4">
              {/* Device Upload to Cloudinary */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Upload from Device (Cloudinary)
                </label>
                <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:border-rose-500/50 transition-colors bg-[#090b10]">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    id="inline-image-file"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setImageFile(e.target.files[0]);
                        setImageUrl("");
                      }
                    }}
                  />
                  <label
                    htmlFor="inline-image-file"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <Upload className="h-6 w-6 text-zinc-400" />
                    <span className="text-xs text-zinc-300 font-medium">
                      {imageFile
                        ? imageFile.name
                        : "Choose PNG, JPEG, or WebP (max 5 MB)"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-[1px] bg-white/10" />
                <span className="text-[10px] uppercase font-bold text-zinc-500">OR</span>
                <div className="flex-1 h-[1px] bg-white/10" />
              </div>

              {/* External HTTPS URL */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  External Image HTTPS URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  disabled={Boolean(imageFile)}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImageFile(null);
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-white/10 bg-[#090b10] px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 disabled:opacity-40"
                />
              </div>

              {/* Alt Text */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                  Image Caption / Alt Text
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="e.g. Statistical comparison chart of civic ballots"
                  className="w-full rounded-lg border border-white/10 bg-[#090b10] px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="rounded px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingImage}
                className="inline-flex items-center gap-1.5 rounded bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-500 cursor-pointer disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Insert Image</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
