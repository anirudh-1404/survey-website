"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChatMessage, ChatAuthor } from "@/types/chat";
import {
  Send,
  Loader2,
  AlertCircle,
  LogIn,
  ArrowDown,
  Radio,
  WifiOff,
  Clock,
  ShieldAlert,
} from "lucide-react";

interface PollChatProps {
  pollId: string;
  pollTitle: string;
  currentUser?: {
    id: string;
    name: string;
    role: "user" | "admin";
  } | null;
  isClosed?: boolean;
}

type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

interface DisplayMessage extends ChatMessage {
  isOptimistic?: boolean;
}

export function PollChat({
  pollId,
  pollTitle,
  currentUser,
  isClosed = false,
}: PollChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = Boolean(currentUser);

  // Check if user is scrolled near bottom
  const checkIfScrolledToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom < 80;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
      setHasNewMessagesBelow(false);
    }
  }, []);

  // Load older messages for pagination
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);

    const oldest = messages[0];
    const prevScrollHeight = containerRef.current?.scrollHeight || 0;

    try {
      const res = await fetch(
        `/api/polls/${pollId}/chat?limit=30&before=${encodeURIComponent(
          oldest.createdAt
        )}`
      );
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const older = data.data.messages || [];
        setMessages((prev) => [...older, ...prev]);
        setHasMore(Boolean(data.data.hasMore));

        // Maintain relative scroll position after prepending
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const newScrollHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop += newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch {
      // Gracefully maintain current messages
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Setup Real-Time Server-Sent Events (SSE) Stream and History Initialization
  useEffect(() => {
    let isCancelled = false;

    function connectSSE() {
      if (isCancelled) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/polls/${pollId}/chat/stream`);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        if (!isCancelled) {
          setConnectionStatus("connected");
        }
      });

      es.addEventListener("message", (event) => {
        if (isCancelled) return;
        try {
          const newMsg: ChatMessage = JSON.parse(event.data);
          const wasNearBottom = checkIfScrolledToBottom();

          setMessages((prev) => {
            // Deduplicate if already present (e.g. optimistic replacement)
            const exists = prev.some(
              (m) =>
                m.id === newMsg.id ||
                (m.isOptimistic &&
                  m.content === newMsg.content &&
                  m.author.id === newMsg.author.id)
            );
            if (exists) {
              return prev.map((m) =>
                m.isOptimistic &&
                m.content === newMsg.content &&
                m.author.id === newMsg.author.id
                  ? newMsg
                  : m
              );
            }
            return [...prev, newMsg];
          });

          if (wasNearBottom) {
            setTimeout(() => scrollToBottom(true), 30);
          } else {
            setHasNewMessagesBelow(true);
          }
        } catch {
          // Ignore malformed payloads
        }
      });

      es.onerror = () => {
        if (isCancelled) return;
        if (es.readyState === EventSource.CLOSED) {
          setConnectionStatus("offline");
          // Schedule reconnect attempt
          reconnectTimeoutRef.current = setTimeout(connectSSE, 4000);
        } else {
          setConnectionStatus("reconnecting");
        }
      };
    }

    async function initializeChat() {
      try {
        const res = await fetch(`/api/polls/${pollId}/chat?limit=50`);
        const data = await res.json();
        if (!isCancelled) {
          if (res.ok && data.success && data.data) {
            setMessages(data.data.messages || []);
            setHasMore(Boolean(data.data.hasMore));
            setTimeout(() => scrollToBottom(false), 50);
          } else {
            setErrorMessage(data.error || "Failed to load recent messages.");
          }
        }
      } catch {
        if (!isCancelled) {
          setErrorMessage("Network error while retrieving chat history.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
          connectSSE();
        }
      }
    }

    initializeChat();

    return () => {
      isCancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [pollId, checkIfScrolledToBottom, scrollToBottom]);

  // Handle user scrolling
  const handleScroll = () => {
    if (checkIfScrolledToBottom()) {
      setHasNewMessagesBelow(false);
    }
  };

  // Submit new message with optimistic UI and error reversion
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    if (!currentUser) {
      setErrorMessage("Authentication required to send chat messages.");
      return;
    }

    if (isClosed) {
      setErrorMessage("This survey room is closed for discussion.");
      return;
    }

    const tempId = `optimistic-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const optimisticAuthor: ChatAuthor = {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
    };

    const optimisticMessage: DisplayMessage = {
      id: tempId,
      pollId,
      content: trimmed,
      createdAt: new Date().toISOString(),
      status: "visible",
      author: optimisticAuthor,
      isOptimistic: true,
    };

    // Optimistically insert message into UI
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");
    setIsSending(true);
    setErrorMessage(null);
    setTimeout(() => scrollToBottom(true), 30);

    try {
      const res = await fetch(`/api/polls/${pollId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data?.message) {
        const persisted: ChatMessage = data.data.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? persisted : m))
        );
      } else {
        // Revert optimistic message and restore input draft so user doesn't lose text
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputText(trimmed);
        setErrorMessage(
          data.error || "Failed to persist chat message. Please retry."
        );
      }
    } catch {
      // Revert optimistic message on network error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputText(trimmed);
      setErrorMessage(
        "A network error interrupted message transmission. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <section
      aria-labelledby="poll-chat-heading"
      className="flex flex-col h-[580px] rounded-xl border border-white/10 bg-[#0d0f17] shadow-xl overflow-hidden"
    >
      {/* 1. Header with Room Status and Live Indicator */}
      <header className="flex items-center justify-between border-b border-white/10 bg-[#121522] px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-950/60 border border-rose-900/40 text-rose-400">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h2
              id="poll-chat-heading"
              className="text-sm font-bold tracking-tight text-white flex items-center gap-2"
            >
              <span>Live Civic Room</span>
              <span className="text-[10px] font-semibold text-zinc-400 font-mono">
                #{pollId.slice(-6)}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400 truncate max-w-[280px] sm:max-w-md">
              Real-time exchange on &ldquo;{pollTitle}&rdquo;
            </p>
          </div>
        </div>

        {/* Connection status badge */}
        <div className="flex items-center gap-2">
          {connectionStatus === "connected" && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300"
              title="Real-time stream connected"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live</span>
            </span>
          )}

          {connectionStatus === "connecting" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-950/40 px-2.5 py-0.5 text-[11px] font-medium text-sky-300">
              <Loader2 className="h-2.5 w-2.5 animate-spin text-sky-400" />
              <span>Connecting</span>
            </span>
          )}

          {connectionStatus === "reconnecting" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Reconnecting</span>
            </span>
          )}

          {connectionStatus === "offline" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
              <WifiOff className="h-3 w-3 text-zinc-500" />
              <span>Offline</span>
            </span>
          )}
        </div>
      </header>

      {/* 2. Messages Stream Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10"
      >
        {/* Pagination: Load older messages */}
        {hasMore && (
          <div className="text-center pb-2">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-md border border-white/5 transition-colors cursor-pointer"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading history...</span>
                </>
              ) : (
                <span>Load earlier messages</span>
              )}
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoadingHistory && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 space-y-2 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
            <p className="text-xs">Connecting to room archive...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
            <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 mb-3">
              <Radio className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-white">No messages yet</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">
              Be the first to share an observation, empirical counterpoint, or breaking update in this room.
            </p>
          </div>
        )}

        {/* Messages List */}
        {!isLoadingHistory &&
          messages.map((msg) => {
            const isMe = currentUser?.id === msg.author.id;
            const isAdmin = msg.author.role === "admin";

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${
                  isMe ? "items-end" : "items-start"
                }`}
              >
                {/* Author Info & Timestamp */}
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-zinc-400 px-1">
                  <span
                    className={`font-semibold ${
                      isMe
                        ? "text-rose-300"
                        : isAdmin
                        ? "text-amber-300"
                        : "text-zinc-300"
                    }`}
                  >
                    {isMe ? "You" : msg.author.name}
                  </span>

                  {isAdmin && (
                    <span className="rounded bg-amber-950/70 border border-amber-800/40 text-amber-300 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                      Staff
                    </span>
                  )}

                  <span className="text-zinc-600">•</span>

                  <span
                    className="flex items-center gap-1 text-[10px] text-zinc-500"
                    title={new Date(msg.createdAt).toLocaleString()}
                  >
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  {msg.isOptimistic && (
                    <span className="text-[10px] text-rose-400 font-mono italic">
                      sending...
                    </span>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[85%] sm:max-w-[78%] text-xs sm:text-sm leading-relaxed break-words shadow-sm ${
                    isMe
                      ? "bg-rose-950/40 text-rose-100 border border-rose-900/40 rounded-tr-xs"
                      : "bg-[#181c2a] text-zinc-200 border border-white/5 rounded-tl-xs"
                  } ${msg.isOptimistic ? "opacity-70" : ""}`}
                >
                  {/* Safely render plain text */}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })}

        <div ref={messagesEndRef} />
      </div>

      {/* "New messages below" notification button */}
      {hasNewMessagesBelow && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            <span>New messages below</span>
          </button>
        </div>
      )}

      {/* 3. Error Banner */}
      {errorMessage && (
        <div className="px-4 py-2 bg-rose-950/60 border-t border-rose-900/40 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* 4. Input Composer or Authentication Prompt */}
      <footer className="border-t border-white/10 bg-[#121522] p-3 sm:p-4 shrink-0">
        {isClosed ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <ShieldAlert className="h-4 w-4 text-zinc-500" />
            <span>This survey inquiry has closed. Live chat is read-only.</span>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="text-xs text-zinc-400 text-center sm:text-left">
              <span className="font-semibold text-zinc-200">
                Join the live room.
              </span>{" "}
              Sign in with your verified citizen profile to post.
            </div>
            <Link
              href={`/login?returnTo=/polls/${pollId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="relative rounded-lg border border-white/10 bg-[#090b10] p-2 focus-within:border-rose-500/80 transition-colors">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1000}
                rows={2}
                disabled={isSending}
                placeholder="Share your perspective or breaking update (Enter to send, Shift+Enter for newline)..."
                className="w-full bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-500 font-mono">
                <span>{inputText.length} / 1000</span>
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1 font-sans text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isSending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span>Send</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </footer>
    </section>
  );
}
