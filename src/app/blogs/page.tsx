import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getPublishedBlogs } from "@/lib/blogs";
import {
  BookOpen,
  Clock,
  Calendar,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

interface BlogsPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

export const instant = false;

export const metadata: Metadata = {
  title: "Editorial Analyses & Investigative Dispatches — PULSE",
  description:
    "In-depth research breakdowns, empirical polling analyses, and investigative editorial commentary shaping global civic discourse.",
  openGraph: {
    title: "Editorial Analyses & Investigative Dispatches — PULSE",
    description:
      "In-depth research breakdowns, empirical polling analyses, and investigative editorial commentary.",
    type: "website",
  },
};

const CATEGORIES = [
  "All",
  "Analysis",
  "Editorial",
  "Policy",
  "Discourse",
  "Technology",
  "Economy",
  "Global Affairs",
];

export default async function BlogsIndexPage({ searchParams }: BlogsPageProps) {
  const { page: pageParam, category: categoryParam } = await searchParams;
  const page = Math.max(1, pageParam ? parseInt(pageParam, 10) : 1);
  const selectedCategory = categoryParam || "All";

  const { blogs, totalCount, totalPages } = await getPublishedBlogs({
    page,
    limit: 9,
    category: selectedCategory !== "All" ? selectedCategory : undefined,
  });

  const featuredBlog = blogs[0];
  const remainingBlogs = blogs.slice(1);

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      <Navbar />

      <main className="flex-1 pb-20">
        {/* Header Hero Banner */}
        <header className="border-b border-white/10 bg-[#0a0c13] py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-rose-300">
                <BookOpen className="h-3.5 w-3.5" />
                <span>PULSE Research & Editorial Journal</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                Empirical Analyses & Investigative Dispatches
              </h1>

              <p className="text-base text-zinc-400 sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Evidence-based investigations, statistical methodology breakdowns, and
                civil arguments evaluating key global opinion trajectories.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <Link
                    key={cat}
                    href={cat === "All" ? "/blogs" : `/blogs?category=${encodeURIComponent(cat)}`}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-rose-600 text-white shadow-md shadow-rose-900/30 ring-1 ring-rose-400"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {cat}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12">
          {blogs.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d0f17] p-16 text-center space-y-3 max-w-md mx-auto my-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-white">No Articles Found</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {selectedCategory !== "All"
                  ? `There are currently no published articles in the "${selectedCategory}" category.`
                  : "Our research desk is preparing upcoming publications. Please check back shortly."}
              </p>
              {selectedCategory !== "All" && (
                <Link
                  href="/blogs"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 mt-2"
                >
                  <span>View all articles</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {/* Lead Featured Article (if page 1) */}
              {page === 1 && featuredBlog && (
                <article className="group relative rounded-2xl border border-white/10 bg-[#0d0f17] overflow-hidden shadow-2xl transition-all hover:border-white/20">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                    {/* Featured Image */}
                    <div className="lg:col-span-7 relative aspect-[16/9] lg:aspect-auto min-h-[280px] sm:min-h-[360px] bg-[#07080c] overflow-hidden">
                      {featuredBlog.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={featuredBlog.imageUrl}
                          alt={featuredBlog.imageAlt || featuredBlog.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-rose-950/20 via-[#0a0c14] to-[#121524] p-8 text-center">
                          <BookOpen className="h-12 w-12 text-rose-500/40 mb-3" />
                          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                            PULSE Research Lead
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-transparent lg:hidden" />
                      <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg">
                        <Sparkles className="h-3 w-3" />
                        <span>Lead Feature</span>
                      </div>
                    </div>

                    {/* Meta & Excerpt */}
                    <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="rounded bg-rose-950/60 px-2.5 py-0.5 font-bold uppercase tracking-wider text-rose-300 border border-rose-900/50">
                            {featuredBlog.category}
                          </span>
                          <span className="text-zinc-500">•</span>
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Clock className="h-3.5 w-3.5 text-zinc-500" />
                            <span>{featuredBlog.readingTimeMinutes || 3} min read</span>
                          </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight group-hover:text-rose-300 transition-colors">
                          <Link href={`/blogs/${featuredBlog.slug}`}>
                            {featuredBlog.title}
                          </Link>
                        </h2>

                        <p className="text-sm leading-relaxed text-zinc-300 line-clamp-3">
                          {featuredBlog.excerpt}
                        </p>
                      </div>

                      <div className="pt-6 border-t border-white/5 flex items-center justify-between mt-6">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                          <span>
                            {featuredBlog.publishedAt
                              ? new Date(featuredBlog.publishedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Recently published"}
                          </span>
                        </div>

                        <Link
                          href={`/blogs/${featuredBlog.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <span>Read Article</span>
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              )}

              {/* Grid of Remaining Articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(page === 1 ? remainingBlogs : blogs).map((blog) => (
                  <article
                    key={blog.id}
                    className="group flex flex-col rounded-xl border border-white/10 bg-[#0d0f17] overflow-hidden shadow-lg hover:border-white/20 transition-all"
                  >
                    {/* Header Image */}
                    <Link
                      href={`/blogs/${blog.slug}`}
                      className="relative aspect-[16/9] w-full overflow-hidden bg-[#07080c] block"
                    >
                      {blog.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={blog.imageUrl}
                          alt={blog.imageAlt || blog.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/[0.02]">
                          <ImageIcon className="h-8 w-8 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className="rounded bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300 border border-white/10">
                          {blog.category}
                        </span>
                      </div>
                    </Link>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          <span>{blog.readingTimeMinutes || 3} min read</span>
                          <span>•</span>
                          <span>
                            {blog.publishedAt
                              ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Recent"}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white leading-snug group-hover:text-rose-400 transition-colors line-clamp-2">
                          <Link href={`/blogs/${blog.slug}`}>{blog.title}</Link>
                        </h3>

                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                          {blog.excerpt}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-zinc-500">
                          By {blog.author.name}
                        </span>
                        <Link
                          href={`/blogs/${blog.slug}`}
                          className="inline-flex items-center gap-1 font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <span>Read</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-10 flex items-center justify-center gap-3">
                  {page > 1 && (
                    <Link
                      href={`/blogs?page=${page - 1}${
                        selectedCategory !== "All"
                          ? `&category=${encodeURIComponent(selectedCategory)}`
                          : ""
                      }`}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      ← Previous Page
                    </Link>
                  )}

                  <span className="text-xs font-mono text-zinc-500">
                    Page {page} of {totalPages} ({totalCount} articles)
                  </span>

                  {page < totalPages && (
                    <Link
                      href={`/blogs?page=${page + 1}${
                        selectedCategory !== "All"
                          ? `&category=${encodeURIComponent(selectedCategory)}`
                          : ""
                      }`}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Next Page →
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
