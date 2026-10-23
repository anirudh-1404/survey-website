"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  Tag,
  Globe,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { PollImageUploader } from "@/components/admin/PollImageUploader";
import { generateSlug } from "@/lib/blog-utils";
import { BlogPost, BlogStatus } from "@/types/blog";
import { toast } from "sonner";

const CATEGORIES = [
  "Analysis",
  "Editorial",
  "Policy",
  "Discourse",
  "Technology",
  "Economy",
  "Global Affairs",
  "Methodology",
];

interface EditBlogPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminEditBlogPage({ params }: EditBlogPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Analysis");
  const [tagsInput, setTagsInput] = useState("");
  const [status, setStatus] = useState<BlogStatus>("draft");

  // Featured Image
  const [imageUrl, setImageUrl] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  // SEO metadata
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function fetchBlog() {
      try {
        const res = await fetch(`/api/admin/blogs/${id}`);
        const data = await res.json();

        if (!isCancelled) {
          if (res.ok && data.success && data.data?.blog) {
            const blog: BlogPost = data.data.blog;
            setTitle(blog.title);
            setSlug(blog.slug);
            setExcerpt(blog.excerpt);
            setContent(blog.content);
            setCategory(blog.category || "Analysis");
            setTagsInput((blog.tags || []).join(", "));
            setStatus(blog.status);
            setImageUrl(blog.imageUrl || "");
            setCloudinaryPublicId(blog.cloudinaryPublicId || "");
            setImageAlt(blog.imageAlt || "");
            setSeoTitle(blog.seoTitle || "");
            setSeoDescription(blog.seoDescription || "");
          } else {
            setErrorMessage(data.error || "Failed to load blog post.");
          }
        }
      } catch {
        if (!isCancelled) {
          setErrorMessage("Network error while retrieving blog post.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchBlog();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const handleSave = async (overrideStatus?: BlogStatus) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim() || title.trim().length < 3) {
      setErrorMessage("Article title must be at least 3 characters.");
      return;
    }

    if (!excerpt.trim() || excerpt.trim().length < 10) {
      setErrorMessage("Excerpt summary must be at least 10 characters.");
      return;
    }

    if (!content.trim() || content.trim().length < 20) {
      setErrorMessage("Article content must be at least 20 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const targetStatus = overrideStatus || status;

      const payload = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        excerpt: excerpt.trim(),
        content: content.trim(),
        category,
        tags,
        status: targetStatus,
        imageUrl: imageUrl.trim() || undefined,
        cloudinaryPublicId: cloudinaryPublicId.trim() || undefined,
        imageAlt: imageAlt.trim() || undefined,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
      };

      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data?.blog) {
        setStatus(data.data.blog.status);
        const savedMsg = "Article changes securely saved.";
        setSuccessMessage(savedMsg);
        toast.success(savedMsg);
        router.refresh();
      } else {
        const editBlogErr = data.error || "Failed to save article changes.";
        setErrorMessage(editBlogErr);
        toast.error(editBlogErr);
      }
    } catch {
      const netEditErr = "Network error occurred while saving article.";
      setErrorMessage(netEditErr);
      toast.error(netEditErr);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <p className="text-xs">Loading article editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <Link
            href="/admin/blogs"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Articles</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-rose-500" />
              <span>Edit Publication</span>
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                status === "published"
                  ? "border border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                  : "border border-zinc-700 bg-zinc-800/60 text-zinc-400"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {status === "published" && (
            <Link
              href={`/blogs/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>View Live</span>
            </Link>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave(status === "published" ? "draft" : "published")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              status === "published"
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                : "bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50"
            }`}
          >
            {status === "published" ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Unpublish</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Publish</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave()}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 px-4 py-2 text-xs font-bold text-white shadow-md transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Save Interrupted</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 2. Main Form Fields */}
      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
            Article Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0d0f17] px-4 py-3 text-base font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              URL Slug <span className="text-rose-400">*</span>
            </label>
            <span className="text-[11px] text-zinc-500 font-mono">
              /blogs/{slug || "slug"}
            </span>
          </div>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(generateSlug(e.target.value))}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f17] px-3.5 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Excerpt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Short Excerpt / Deck <span className="text-rose-400">*</span>
            </label>
            <span className="text-[11px] font-mono text-zinc-500">
              {excerpt.length} / 500
            </span>
          </div>
          <textarea
            rows={3}
            maxLength={500}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0d0f17] p-3 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
          />
        </div>

        {/* Category & Tags Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Editorial Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0d0f17] px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-rose-500" />
              <span>Tags (comma separated)</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Governance, Technology, Statistics"
              className="w-full rounded-lg border border-white/10 bg-[#0d0f17] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Featured Image Section */}
        <div className="rounded-xl border border-white/10 bg-[#0d0f17] p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Featured Header Image
          </h2>
          <PollImageUploader
            imageUrl={imageUrl}
            cloudinaryPublicId={cloudinaryPublicId}
            imageAlt={imageAlt}
            onChange={(meta) => {
              setImageUrl(meta.imageUrl);
              setCloudinaryPublicId(meta.cloudinaryPublicId);
              setImageAlt(meta.imageAlt);
            }}
          />
        </div>

        {/* 3. Rich-Text Editor */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
            Article Rich-Text Body <span className="text-rose-400">*</span>
          </label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            minHeight="450px"
          />
        </div>

        {/* 4. Optional SEO Settings */}
        <div className="rounded-xl border border-white/10 bg-[#0d0f17] p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
            <Globe className="h-3.5 w-3.5 text-rose-500" />
            <span>Search Engine Optimization (SEO Metadata)</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Custom SEO Title
              </label>
              <input
                type="text"
                maxLength={100}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || "Defaults to article title"}
                className="w-full rounded-lg border border-white/10 bg-[#121522] px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Custom Meta Description
              </label>
              <textarea
                rows={2}
                maxLength={200}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder={excerpt || "Defaults to article excerpt"}
                className="w-full rounded-lg border border-white/10 bg-[#121522] p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
