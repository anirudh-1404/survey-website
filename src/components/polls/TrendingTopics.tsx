import { TrendingTopic } from "@/types/poll";
import { TrendingUp, Flame, MessageSquare } from "lucide-react";

interface TrendingTopicsProps {
  topics: TrendingTopic[];
}

export function TrendingTopics({ topics }: TrendingTopicsProps) {
  return (
    <section id="trending-topics" className="border-t border-white/10 py-12 lg:py-16 bg-[#0a0c12]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              <h2 className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
                Trending Topics & Civic Discourse
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              High-engagement topics driving ongoing community debate and policy analysis.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Updated Hourly • Verified Sentiment
          </span>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic, index) => (
            <div
              key={topic.id}
              className="group flex items-start justify-between rounded-lg border border-white/10 bg-[#11131c] p-4 transition-all hover:border-white/20 hover:bg-[#151825]"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-400">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {topic.category}
                  </span>
                  {topic.isHot && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-rose-950/50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 border border-rose-900/40">
                      <Flame className="h-2.5 w-2.5 text-rose-500" />
                      Hot
                    </span>
                  )}
                </div>

                <h3 className="text-base font-semibold text-white group-hover:text-rose-100 transition-colors">
                  {topic.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 text-zinc-400" />
                    {topic.pollCount} active polls
                  </span>
                  <span>•</span>
                  <span>{(topic.participantCount / 1000).toFixed(0)}k voters</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
