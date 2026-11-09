import { connectToDatabase } from "@/lib/mongodb";
import { BlogModel, BlogStatus } from "@/models/Blog";
import "@/models/User";
import { BlogPost, BlogListResponse } from "@/types/blog";

import {
  generateSlug,
  calculateReadingTime,
  sanitizeRichTextHtml,
} from "./blog-utils";

export {
  generateSlug,
  calculateReadingTime,
  sanitizeRichTextHtml,
};

/**
 * Transform a Mongoose Blog document into a safe, UI-ready BlogPost object.
 */
export function mapBlogToUI(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any
): BlogPost {
  const author = doc.authorId;
  const authorObj =
    typeof author === "object" && author !== null
      ? {
          id: author._id ? author._id.toString() : "unknown",
          name: author.name || "PULSE Editorial Staff",
          role: author.role || "admin",
        }
      : {
          id: typeof author === "string" ? author : "unknown",
          name: "PULSE Editorial Staff",
          role: "admin" as const,
        };

  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    content: doc.content,
    imageUrl: doc.imageUrl || undefined,
    cloudinaryPublicId: doc.cloudinaryPublicId || undefined,
    imageAlt: doc.imageAlt || undefined,
    category: doc.category || "Analysis",
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    status: doc.status as BlogStatus,
    publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date(0).toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date(0).toISOString(),
    author: authorObj,
    seoTitle: doc.seoTitle || undefined,
    seoDescription: doc.seoDescription || undefined,
    readingTimeMinutes: calculateReadingTime(doc.content),
  };
}

/**
 * Retrieve public published blogs for the public /blogs feed.
 * Strictly excludes drafts.
 */
export async function getPublishedBlogs(options?: {
  page?: number;
  limit?: number;
  category?: string;
}): Promise<BlogListResponse> {
  await connectToDatabase();

  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(Math.max(1, options?.limit || 12), 50);
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    status: "published",
  };

  if (options?.category && options.category !== "All") {
    query.category = options.category;
  }

  const [totalCount, docs] = await Promise.all([
    BlogModel.countDocuments(query),
    BlogModel.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "name role")
      .lean(),
  ]);

  const blogs = docs.map(mapBlogToUI);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return {
    blogs,
    totalCount,
    page,
    totalPages,
  };
}

/**
 * Retrieve a published blog by unique slug.
 * Strictly returns null if draft, unpublished, or nonexistent.
 */
export async function getPublishedBlogBySlug(
  slug: string
): Promise<BlogPost | null> {
  await connectToDatabase();

  const doc = await BlogModel.findOne({
    slug: slug.toLowerCase().trim(),
    status: "published",
  })
    .populate("authorId", "name role")
    .lean();

  if (!doc) {
    return null;
  }

  return mapBlogToUI(doc);
}
