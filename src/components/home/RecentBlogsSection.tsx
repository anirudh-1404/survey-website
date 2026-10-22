import Link from "next/link";
import { BlogPost } from "@/types/blog";
import { BookOpen, Clock, Calendar, ArrowRight, Image as ImageIcon } from "lucide-react";

interface RecentBlogsSectionProps {
  blogs: BlogPost[];
}

export function RecentBlogsSection({ blogs }: RecentBlogsSectionProps) {
  if (!blogs || blogs.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-white/10 py-16 lg:py-20 bg-[#090b10]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-6 mb-10">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-rose-500" />
              <h2 className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
                Editorial Journal
              </h2>
            </div>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Recent Analyses & Dispatches
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Evidence-based investigations, statistical methodology breakdowns, and policy debates.
            </p>
          </div>

          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors shrink-0 group"
          >
            <span>View All Publications</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Blog Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <article
              key={blog.id}
              className="group flex flex-col justify-between rounded-xl border border-white/10 bg-[#10121a] overflow-hidden transition-all duration-200 hover:border-white/20 hover:bg-[#131522] hover:shadow-lg"
            >
              {/* Optional Featured Image */}
              <Link href={`/blogs/${blog.slug}`} className="block overflow-hidden">
                {blog.imageUrl ? (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#090a0f] border-b border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blog.imageUrl}
                      alt={blog.imageAlt || blog.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10121a] via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] w-full items-center justify-center bg-white/[0.02] border-b border-white/10 text-zinc-600">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                  </div>
                )}
              </Link>

              <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  {/* Category & Meta */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded bg-white/5 px-2.5 py-0.5 font-semibold tracking-wider text-rose-300 uppercase border border-white/5">
                      {blog.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {blog.readingTimeMinutes || 3} min read
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-lg font-bold tracking-tight text-white transition-colors group-hover:text-rose-100 leading-snug">
                    <Link href={`/blogs/${blog.slug}`} className="hover:underline">
                      {blog.title}
                    </Link>
                  </h4>

                  {/* Excerpt */}
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {blog.excerpt}
                  </p>
                </div>

                {/* Footer Metadata */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    <span>
                      {blog.publishedAt
                        ? new Date(blog.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Recent"}
                    </span>
                  </div>

                  <Link
                    href={`/blogs/${blog.slug}`}
                    className="inline-flex items-center gap-1 font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <span>Read</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom Entry Link */}
        <div className="mt-10 text-center">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span>Explore All Editorial Publications & Analyses</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
