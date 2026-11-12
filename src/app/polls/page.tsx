import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PollCard } from "@/components/polls/PollCard";
import { getPublishedPolls } from "@/lib/polls";
import { Poll, PollCategory, DEFAULT_POLL_CATEGORIES } from "@/types/poll";
import { PollModel } from "@/models/Poll";
import { Layers, BarChart3, HelpCircle } from "lucide-react";

interface PollsPageProps {
  searchParams: Promise<{ category?: string; status?: string }>;
}

export const instant = false;

export const metadata: Metadata = {
  title: "Public Opinion Polls Archive — PULSE",
  description:
    "Explore all open and concluded public opinion inquiries on pivotal technologies, socioeconomic policy, and global discourse.",
  openGraph: {
    title: "Public Opinion Polls Archive — PULSE",
    description:
      "Explore all open and concluded public opinion inquiries on pivotal technologies, socioeconomic policy, and global discourse.",
    siteName: "PULSE",
    type: "website",
  },
};

export default async function PollsListingPage({ searchParams }: PollsPageProps) {
  const { category: categoryParam, status: statusParam } = await searchParams;
  const selectedCategory = categoryParam || "All";
  const selectedStatus = statusParam || "All";

  let polls: Poll[] = [];
  let categoryFilters: string[] = ["All", ...DEFAULT_POLL_CATEGORIES.slice(0, 6)];

  try {
    const [dbPolls, distinctCategories] = await Promise.all([
      getPublishedPolls({
        category: selectedCategory !== "All" ? selectedCategory : undefined,
        limit: 50,
      }),
      PollModel.distinct("category", { status: "published" }).catch(() => []),
    ]);

    if (dbPolls && dbPolls.length > 0) {
      polls = dbPolls;
    }

    categoryFilters = Array.from(
      new Set(["All", ...DEFAULT_POLL_CATEGORIES.slice(0, 6), ...distinctCategories])
    );
  } catch {
    polls = [];
  }

  // Filter by status if requested
  const filteredPolls = polls.filter((poll) => {
    if (selectedStatus === "All") return true;
    return poll.status === selectedStatus;
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      <Navbar />

      <main className="flex-1 pb-20">
        {/* Header Hero Banner */}
        <header className="border-b border-white/10 bg-[#0a0c13] py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-rose-300">
                <Layers className="h-3.5 w-3.5" />
                <span>Verified Public Opinion Inquiries</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                Public Opinion Polls Archive
              </h1>

              <p className="text-base text-zinc-400 sm:text-lg leading-relaxed max-w-2xl mx-auto">
                Evidence-backed civic surveys tracking community sentiment on emerging technologies,
                economic policy, and pivotal global developments.
              </p>
            </div>

            {/* Category Filter Navigation */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {categoryFilters.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <Link
                    key={cat}
                    href={
                      cat === "All"
                        ? selectedStatus !== "All"
                          ? `/polls?status=${encodeURIComponent(selectedStatus)}`
                          : "/polls"
                        : `/polls?category=${encodeURIComponent(cat)}${
                            selectedStatus !== "All"
                              ? `&status=${encodeURIComponent(selectedStatus)}`
                              : ""
                          }`
                    }
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <BarChart3 className="h-4 w-4 text-rose-500" />
              <span>
                Showing <strong className="text-zinc-200">{filteredPolls.length}</strong>{" "}
                {selectedCategory !== "All" ? `${selectedCategory} ` : ""}surveys
              </span>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Status:</span>
              <div className="inline-flex rounded-lg border border-white/10 bg-[#12141f] p-1">
                {(["All", "Open", "Closed"] as const).map((st) => {
                  const isActive = selectedStatus === st;
                  const targetHref =
                    selectedCategory !== "All"
                      ? st !== "All"
                        ? `/polls?category=${encodeURIComponent(selectedCategory)}&status=${st}`
                        : `/polls?category=${encodeURIComponent(selectedCategory)}`
                      : st !== "All"
                      ? `/polls?status=${st}`
                      : "/polls";

                  return (
                    <Link
                      key={st}
                      href={targetHref}
                      className={`rounded-md px-3 py-1 font-medium transition-colors ${
                        isActive
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid */}
          {filteredPolls.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d0f17] p-16 text-center space-y-3 max-w-md mx-auto my-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-500">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-white">No Surveys Found</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                There are currently no polls matching your selected category and status filters.
              </p>
              <Link
                href="/polls"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 mt-2"
              >
                Reset All Filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPolls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
