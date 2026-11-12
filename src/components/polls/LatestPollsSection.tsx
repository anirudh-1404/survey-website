"use client";

import { useState, useMemo } from "react";
import { Poll, PollCategory, DEFAULT_POLL_CATEGORIES } from "@/types/poll";
import { PollCard } from "./PollCard";
import { Filter, Layers } from "lucide-react";
import { AdBanner } from "@/components/ads/AdBanner";

interface LatestPollsSectionProps {
  polls: Poll[];
}

export function LatestPollsSection({ polls }: LatestPollsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<"All" | PollCategory>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Closed">("All");

  const categories = useMemo(() => {
    const list: string[] = ["All"];
    const unique = new Set<string>();
    polls.forEach((p) => {
      if (p.category) unique.add(p.category);
    });
    DEFAULT_POLL_CATEGORIES.forEach((c) => {
      if (unique.has(c)) {
        list.push(c);
        unique.delete(c);
      }
    });
    unique.forEach((c) => list.push(c));
    if (list.length === 1) {
      return ["All", ...DEFAULT_POLL_CATEGORIES.slice(0, 6)];
    }
    return list;
  }, [polls]);

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const matchesCategory =
        selectedCategory === "All" || poll.category === selectedCategory;
      const matchesStatus =
        statusFilter === "All" || poll.status === statusFilter;
      return matchesCategory && matchesStatus;
    });
  }, [polls, selectedCategory, statusFilter]);

  return (
    <section id="latest-polls" className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-rose-500" />
              <h2 className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
                Continuous Inquiries
              </h2>
            </div>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Latest Public Opinion Polls
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Explore open surveys on legislative shifts, market directions, and societal changes.
            </p>
          </div>

          {/* Quick status toggle */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Filter by status:</span>
            <div className="inline-flex rounded-lg border border-white/10 bg-[#12141f] p-1">
              {(["All", "Open", "Closed"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
                    statusFilter === status
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-400 mr-1 shrink-0">
            <Filter className="h-3 w-3 text-zinc-400" />
            Topic:
          </span>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === category
                  ? "bg-white text-zinc-950 font-semibold shadow"
                  : "border border-white/10 bg-[#12141e] text-zinc-300 hover:border-white/20 hover:text-white hover:bg-[#161926]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Poll Cards Grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPolls.map((poll, index) => (
            <div key={poll.id} className="contents">
              <PollCard poll={poll} />
              {index === 2 && (
                <AdBanner placement="feed_inline" />
              )}
            </div>
          ))}
        </div>

        {filteredPolls.length === 0 && (
          <div className="mt-12 rounded-xl border border-white/10 bg-[#11131c] p-12 text-center">
            <p className="text-zinc-300 text-sm">
              {polls.length === 0
                ? "No polls published yet. New surveys will appear here as soon as they are launched!"
                : "No polls match the selected filter combination."}
            </p>
            {polls.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("All");
                  setStatusFilter("All");
                }}
                className="mt-4 text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
