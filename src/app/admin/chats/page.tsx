"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MessageSquare,
  Search,
  ExternalLink,
  Loader2,
  RefreshCw,
  Radio,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  Edit,
} from "lucide-react";
import { PollChat } from "@/components/chat/PollChat";

interface AdminPollChatSummary {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "draft" | "published" | "closed";
  views: number;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

interface AdminUser {
  id: string;
  name: string;
  role: "user" | "admin";
  avatar?: string;
}

function AdminChatsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlPollId = searchParams.get("pollId");

  const [polls, setPolls] = useState<AdminPollChatSummary[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(urlPollId || null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load current user
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json?.data?.user) {
          setCurrentUser(json.data.user);
        }
      } catch {
        // silent
      }
    }
    loadUser();
  }, []);

  // Fetch all polls with chat tallies
  const fetchPolls = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/chats");
      const json = await res.json();
      if (json?.success && json?.data?.polls) {
        setPolls(json.data.polls);
        // Default select the first poll if none selected
        if (!selectedPollId && json.data.polls.length > 0) {
          const firstPoll = json.data.polls[0];
          setSelectedPollId(firstPoll.id);
        }
      }
    } catch {
      // silent
    } finally {
      if (!silent) setIsLoading(false);
      else setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  // Update selectedPollId if url changes
  useEffect(() => {
    if (urlPollId) {
      setSelectedPollId(urlPollId);
    }
  }, [urlPollId]);

  const handleSelectPoll = (pollId: string) => {
    setSelectedPollId(pollId);
    router.replace(`/admin/chats?pollId=${pollId}`);
  };

  const filteredPolls = useMemo(() => {
    if (!searchQuery.trim()) return polls;
    const q = searchQuery.toLowerCase();
    return polls.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q)
    );
  }, [polls, searchQuery]);

  const selectedPoll = useMemo(() => {
    return polls.find((p) => p.id === selectedPollId) || null;
  }, [polls, selectedPollId]);

  const totalAllMessages = useMemo(() => {
    return polls.reduce((acc, p) => acc + (p.messageCount || 0), 0);
  }, [polls]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2.5">
            <MessageSquare className="h-6 w-6 text-rose-500" />
            <span>Live Poll Chats & Discourse Hub</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time citizen debates and discussion rooms across all published inquiries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
            <span className="text-zinc-400">Total Discourse:</span>
            <span className="font-bold text-rose-400">{totalAllMessages.toLocaleString()} msgs</span>
          </div>

          <button
            type="button"
            onClick={() => fetchPolls(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-96 items-center justify-center rounded-2xl border border-white/10 bg-[#10121a]">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <span className="ml-3 text-sm text-zinc-400">Loading live chat rooms...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Poll Selector Sidebar (4 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 rounded-2xl border border-white/10 bg-[#10121a] overflow-hidden shadow-xl flex flex-col h-[750px]">
            {/* Search Input */}
            <div className="p-3.5 border-b border-white/10 bg-white/[0.02]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter inquiries..."
                  className="w-full rounded-lg border border-white/10 bg-[#151824] pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Polls List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {filteredPolls.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No inquiries found matching your query.
                </div>
              ) : (
                filteredPolls.map((poll) => {
                  const isSelected = poll.id === selectedPollId;

                  return (
                    <button
                      key={poll.id}
                      type="button"
                      onClick={() => handleSelectPoll(poll.id)}
                      className={`w-full text-left p-3.5 transition-all cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? "bg-rose-500/10 border-l-2 border-rose-500"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                          {poll.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              poll.messageCount > 0
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-white/5 text-zinc-500"
                            }`}
                          >
                            <MessageSquare className="h-2.5 w-2.5" />
                            <span>{poll.messageCount}</span>
                          </span>
                        </div>
                      </div>

                      <p
                        className={`text-xs font-medium line-clamp-2 leading-snug ${
                          isSelected ? "text-white font-semibold" : "text-zinc-200"
                        }`}
                      >
                        {poll.title}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                        <span
                          className={`uppercase font-semibold ${
                            poll.status === "published"
                              ? "text-emerald-400"
                              : poll.status === "closed"
                              ? "text-zinc-400"
                              : "text-amber-400"
                          }`}
                        >
                          ● {poll.status}
                        </span>
                        <span>
                          {poll.lastMessageAt
                            ? `Active ${new Date(poll.lastMessageAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}`
                            : "No chats yet"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Poll Chat Room (7-8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            {selectedPoll ? (
              <>
                {/* Active Poll Header Card */}
                <div className="rounded-xl border border-white/10 bg-[#10121a] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400 uppercase">
                        {selectedPoll.category}
                      </span>
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {selectedPoll.messageCount} verified messages
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white truncate leading-snug">
                      {selectedPoll.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/polls/${selectedPoll.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white hover:bg-white/10 transition-colors"
                      title="Inspect & Edit Poll"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Inspect Poll</span>
                    </Link>

                    <Link
                      href={`/polls/${selectedPoll.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
                      title="View on Public Website"
                    >
                      <span>Public Room</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Live Chat Box Component */}
                <div className="rounded-2xl border border-white/10 bg-[#10121a] overflow-hidden shadow-2xl h-[670px] flex flex-col">
                  <PollChat
                    pollId={selectedPoll.id}
                    currentUser={
                      currentUser || {
                        id: "admin",
                        name: "Editorial Admin",
                        role: "admin",
                      }
                    }
                  />
                </div>
              </>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#10121a] p-8 text-center text-zinc-400">
                <MessageSquare className="h-10 w-10 text-zinc-600 mb-3" />
                <p className="text-sm font-semibold text-white">No Inquiry Selected</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Select a survey from the left sidebar to inspect and participate in its live citizen chat stream.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminChatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        </div>
      }
    >
      <AdminChatsContent />
    </Suspense>
  );
}
