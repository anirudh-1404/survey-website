import Link from "next/link";
import { Poll } from "@/types/poll";
import { ArrowRight, BarChart2 } from "lucide-react";
import { PollImage } from "@/components/polls/PollImage";

interface PollCardProps {
  poll: Poll;
}

export function PollCard({ poll }: PollCardProps) {
  const isOpen = poll.status === "Open" || poll.status === "Live";

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-white/10 bg-[#10121a] p-6 transition-all duration-200 hover:border-white/20 hover:bg-[#131522] hover:shadow-lg overflow-hidden">
      {/* Featured Lead Image or Graceful Placeholder */}
      <div className="-mx-6 -mt-6 mb-4">
        <PollImage
          imageUrl={poll.imageUrl}
          imageAlt={poll.imageAlt}
          title={poll.title}
          category={poll.category}
          aspectRatio="16/9"
          className="!border-0 !border-b !border-white/10"
        />
      </div>

      <div className="space-y-4">
        {/* Category & Status Header */}
        <div className="flex items-center justify-between text-xs">
          <span className="rounded bg-white/5 px-2.5 py-1 font-semibold tracking-wider text-rose-300 uppercase border border-white/5">
            {poll.category}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              isOpen
                ? "border border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                : "border border-zinc-700 bg-zinc-800/50 text-zinc-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOpen ? "bg-emerald-400" : "bg-zinc-500"
              }`}
            />
            {poll.status}
          </span>
        </div>

        {/* Title / Question */}
        <h3 className="text-lg font-bold tracking-tight text-white transition-colors group-hover:text-rose-100 leading-snug">
          <Link href={`/polls/${poll.id}`} className="hover:underline focus-visible:outline-none">
            {poll.title}
          </Link>
        </h3>

        {/* Short Summary */}
        <p className="text-sm leading-relaxed text-zinc-300 line-clamp-3">
          {poll.summary}
        </p>
      </div>

      {/* Card Footer: Metadata & View Action */}
      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <BarChart2 className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono font-medium text-zinc-300">
              {poll.totalVotes.toLocaleString()}
            </span>
            <span>votes</span>
          </div>

          <Link
            href={`/polls/${poll.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 transition-colors group-hover:text-rose-300 focus-visible:ring-1 focus-visible:ring-rose-500"
          >
            <span>View Poll & Discourse</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  );
}
