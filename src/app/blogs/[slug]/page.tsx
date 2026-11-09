import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getPublishedBlogBySlug, getPublishedBlogs, sanitizeRichTextHtml } from "@/lib/blogs";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Tag,
  ShieldCheck,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { connection } from "next/server";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

export const instant = false;

export async function generateMetadata({
  params,
}: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getPublishedBlogBySlug(slug);

  if (!blog || blog.status !== "published") {
    return {
      title: "Article Not Found — PULSE Journal",
      description: "The requested editorial dispatch could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulse.org";
  const canonicalUrl = `${siteUrl}/blogs/${blog.slug}`;
  const title = blog.seoTitle || `${blog.title} — PULSE Journal`;
  const description = blog.seoDescription || blog.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "PULSE",
      type: "article",
      publishedTime: blog.publishedAt || blog.createdAt,
      authors: [blog.author.name],
      ...(blog.imageUrl
        ? {
            images: [
              {
                url: blog.imageUrl,
                alt: blog.imageAlt || blog.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(blog.imageUrl ? { images: [blog.imageUrl] } : {}),
    },
  };
}

export default async function BlogPostDetailPage({ params }: BlogPageProps) {
  await connection();
  const { slug } = await params;
  const blog = await getPublishedBlogBySlug(slug);

  // Drafts, unpublished, or missing blogs strictly return 404
  if (!blog || blog.status !== "published") {
    notFound();
  }

  const sanitizedContent = sanitizeRichTextHtml(blog.content);

  // Fetch 3 related published articles from the same category or general feed
  const relatedResponse = await getPublishedBlogs({
    category: blog.category,
    limit: 4,
  });
  const relatedArticles = relatedResponse.blogs
    .filter((b) => b.id !== blog.id)
    .slice(0, 3);

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulse.org";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: blog.title,
    description: blog.excerpt,
    articleSection: blog.category,
    datePublished: blog.publishedAt || blog.createdAt,
    dateModified: blog.updatedAt || blog.createdAt,
    image: blog.imageUrl ? [blog.imageUrl] : undefined,
    author: {
      "@type": "Person",
      name: blog.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "PULSE",
      url: siteUrl,
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 pb-20">
        {/* Navigation Breadcrumb Bar */}
        <div className="border-b border-white/10 bg-[#0c0e15] py-4">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Back to all publications</span>
            </Link>
          </div>
        </div>

        {/* Article Header & Main Column */}
        <article className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 space-y-8">
          {/* Metadata pill row */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded bg-rose-950/60 px-3 py-1 font-bold tracking-wider text-rose-300 uppercase border border-rose-900/40">
              {blog.category}
            </span>

            <span className="text-zinc-500">•</span>

            <span className="flex items-center gap-1 text-zinc-400">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              <span>
                {blog.publishedAt
                  ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : new Date(blog.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
              </span>
            </span>

            <span className="text-zinc-500">•</span>

            <span className="flex items-center gap-1 text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-zinc-500" />
              <span>{blog.readingTimeMinutes || 3} min read</span>
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-[1.15]">
            {blog.title}
          </h1>

          {/* Lead Excerpt */}
          <p className="text-lg leading-relaxed text-zinc-300 sm:text-xl font-serif italic border-l-2 border-rose-500 pl-4 py-1">
            {blog.excerpt}
          </p>

          {/* Author Byline */}
          <div className="flex items-center justify-between border-y border-white/10 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-600/20 border border-rose-500/40 font-bold text-rose-300 text-sm">
                {blog.author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  {blog.author.name}
                </div>
                <div className="text-[11px] text-zinc-400">
                  PULSE Editorial Fellow & Research Contributor
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Peer Reviewed</span>
            </div>
          </div>

          {/* Optional Featured Image */}
          {blog.imageUrl && (
            <figure className="relative aspect-[21/10] sm:aspect-[21/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07080c] shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blog.imageUrl}
                alt={blog.imageAlt || blog.title}
                className="h-full w-full object-cover"
                loading="eager"
              />
              {blog.imageAlt && (
                <figcaption className="absolute bottom-3 right-3 text-[11px] text-zinc-300 bg-black/70 px-3 py-1 rounded backdrop-blur-sm border border-white/10">
                  {blog.imageAlt}
                </figcaption>
              )}
            </figure>
          )}

          {/* Sanitized Rich-Text Body */}
          <div
            className="prose prose-invert max-w-none text-zinc-200 text-base sm:text-lg leading-relaxed space-y-6 pt-4 [&>h2]:text-2xl sm:[&>h2]:text-3xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h3]:text-xl sm:[&>h3]:text-2xl [&>h3]:font-bold [&>h3]:text-zinc-100 [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:leading-relaxed [&>p]:text-zinc-300 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-2 [&>blockquote]:border-l-4 [&>blockquote]:border-rose-500 [&>blockquote]:pl-5 [&>blockquote]:py-1 [&>blockquote]:italic [&>blockquote]:text-zinc-300 [&>blockquote]:bg-white/[0.02] [&>blockquote]:rounded-r-lg [&>a]:text-rose-400 hover:[&>a]:underline [&>figure]:my-8 [&>figure>img]:rounded-xl [&>figure>img]:border [&>figure>img]:border-white/10 [&>figure>figcaption]:text-center [&>figure>figcaption]:text-xs [&>figure>figcaption]:text-zinc-500 [&>figure>figcaption]:mt-2"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {/* Tags Section */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="pt-8 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mr-1">
                <Tag className="h-3 w-3 text-rose-500" />
                <span>Indexed Topics:</span>
              </span>
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-white/5 border border-white/5 px-2.5 py-1 text-xs text-zinc-300 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </article>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20 pt-12 border-t border-white/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-rose-500" />
                  <span>Further Reading</span>
                </h2>
                <p className="text-xl font-bold tracking-tight text-white mt-1">
                  More dispatches from {blog.category}
                </p>
              </div>
              <Link
                href="/blogs"
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
              >
                Browse all publications →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <article
                  key={rel.id}
                  className="group rounded-xl border border-white/10 bg-[#0d0f17] p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition-colors"
                >
                  <div className="space-y-2">
                    <span className="rounded bg-rose-950/40 px-2 py-0.5 text-[10px] font-semibold text-rose-300 uppercase tracking-wider border border-rose-900/40">
                      {rel.category}
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-2">
                      <Link href={`/blogs/${rel.slug}`}>{rel.title}</Link>
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {rel.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                    <span>{rel.readingTimeMinutes || 3} min read</span>
                    <Link
                      href={`/blogs/${rel.slug}`}
                      className="text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Read</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
