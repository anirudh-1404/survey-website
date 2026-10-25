"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  ShieldAlert,
  Smile,
  Radio,
  LogIn,
  Flame,
  Trash2,
} from "lucide-react";
import { ChatMessage, ChatReactionSummary } from "@/types/chat";
import { toast } from "sonner";

interface PollChatProps {
  pollId: string;
  currentUser: {
    id: string;
    name: string;
    role: "user" | "admin";
    avatar?: string;
  } | null;
}

const WHATSAPP_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"];

/**
 * Generate consistent vibrant gradient colors based on user's name
 */
function getAvatarGradient(name: string): string {
  const gradients = [
    "from-rose-500 to-orange-500",
    "from-purple-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-blue-500 to-cyan-500",
    "from-amber-500 to-rose-500",
    "from-pink-500 to-rose-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

/**
 * Format relative time or timestamp
 */
function formatChatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function PollChat({ pollId, currentUser }: PollChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll inside chat feed without scrolling the main window/page
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  // 1. Fetch Chat History asynchronously on mount / pollId change
  useEffect(() => {
    let isCancelled = false;

    async function loadChatHistory() {
      try {
        const res = await fetch(`/api/polls/${pollId}/chat?limit=50`);
        if (!res.ok) throw new Error("Failed to load chat history");
        const json = await res.json();
        if (!isCancelled && json.success && json.data?.messages) {
          setMessages(json.data.messages);
          setTimeout(() => scrollToBottom("auto"), 150);
        }
      } catch {
        if (!isCancelled) {
          toast.error("Could not load live chat room.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadChatHistory();

    return () => {
      isCancelled = true;
    };
  }, [pollId, scrollToBottom]);

  // 2. Establish Real-time SSE Connection
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null;

    function connectSSE() {
      try {
        const es = new EventSource(`/api/polls/${pollId}/chat/stream`);
        eventSourceRef.current = es;

        es.addEventListener("open", () => {
          setIsConnected(true);
        });

        // Handle incoming new messages
        es.addEventListener("message", (event) => {
          try {
            const newMsg: ChatMessage = JSON.parse(event.data);
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMsg.id)) {
                return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
              }
              return [...prev, newMsg];
            });
            setTimeout(() => scrollToBottom("smooth"), 100);
          } catch {
            // Malformed SSE data
          }
        });

        // Handle incoming real-time reaction updates
        es.addEventListener("reaction", (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "reaction_update") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === payload.messageId
                    ? {
                        ...msg,
                        reactions: payload.reactions.map((r: ChatReactionSummary) => ({
                          ...r,
                          reactedByMe:
                            msg.reactions?.find((oldR) => oldR.emoji === r.emoji)?.reactedByMe ??
                            false,
                        })),
                      }
                    : msg
                )
              );
            }
          } catch {
            // Malformed reaction data
          }
        });

        // Handle incoming real-time message deletions
        es.addEventListener("delete", (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === "message_deleted") {
              setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
            }
          } catch {
            // Malformed deletion data
          }
        });

        es.addEventListener("error", () => {
          setIsConnected(false);
          es.close();
          // Try reconnect after 4 seconds
          reconnectTimeout = setTimeout(connectSSE, 4000);
        });
      } catch {
        setIsConnected(false);
      }
    }

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [pollId, scrollToBottom]);

  // 3. Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputContent.trim() || isSending) return;

    if (!currentUser) {
      toast.error("Please sign in to participate in the live chat.");
      return;
    }

    const trimmed = inputContent.trim();
    setIsSending(true);

    try {
      const res = await fetch(`/api/polls/${pollId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to deliver message.");
      }

      setInputContent("");
      setShowEmojiPicker(false);

      // Optimistically insert message if not already present from SSE
      const postedMsg: ChatMessage = data.data.message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === postedMsg.id)) return prev;
        return [...prev, postedMsg];
      });
      setTimeout(() => scrollToBottom("smooth"), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post message.";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  // 4. Handle WhatsApp-style Reaction Toggle
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) {
      toast.error("Sign in to react to messages.");
      return;
    }

    // Close reaction picker
    setActiveReactionMessageId(null);

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const reactions = [...(msg.reactions || [])];
        const existingIndex = reactions.findIndex((r) => r.emoji === emoji);

        if (existingIndex > -1) {
          const current = reactions[existingIndex];
          if (current.reactedByMe) {
            // Untoggle
            const newCount = current.count - 1;
            if (newCount <= 0) {
              reactions.splice(existingIndex, 1);
            } else {
              reactions[existingIndex] = { ...current, count: newCount, reactedByMe: false };
            }
          } else {
            // Add reaction
            reactions[existingIndex] = { ...current, count: current.count + 1, reactedByMe: true };
          }
        } else {
          reactions.push({ emoji, count: 1, reactedByMe: true });
        }

        return { ...msg, reactions };
      })
    );

    try {
      const res = await fetch(`/api/polls/${pollId}/chat/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save reaction.");
      }

      // Sync updated reactions from server
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, reactions: data.data.reactions } : msg
        )
      );
    } catch {
      toast.error("Could not register reaction.");
    }
  };

  // 5. Handle Delete Message (Author or Admin)
  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;

    // Optimistically remove from state
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setActiveReactionMessageId(null);

    try {
      const res = await fetch(`/api/polls/${pollId}/chat?messageId=${messageId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete message.");
      }
      toast.success("Message deleted");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to delete message.";
      toast.error(errMsg);
      // Re-fetch on error to restore state
      const res = await fetch(`/api/polls/${pollId}/chat?limit=50`);
      const json = await res.json();
      if (json.success && json.data?.messages) {
        setMessages(json.data.messages);
      }
    }
  };

  return (
    <div className="flex flex-col h-[650px] w-full rounded-2xl border border-white/10 bg-[#0d0d12]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Chat Room Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-rose-500/40 animate-ping" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <span>Live Public Discourse</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono">
                ROOM
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <Radio className={`h-3 w-3 ${isConnected ? "text-emerald-400" : "text-amber-400"}`} />
              <span>{isConnected ? "Real-time sync active" : "Reconnecting to stream..."}</span>
              <span>•</span>
              <span>{messages.length} messages</span>
            </p>
          </div>
        </div>
      </div>

      {/* Message Feed Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            <p className="text-xs">Connecting to secure chat channel...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2 text-center p-6">
            <div className="p-3 rounded-full bg-white/[0.03] border border-white/10 text-rose-400">
              <Flame className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-zinc-300">No chat messages yet</p>
            <p className="text-xs text-zinc-500 max-w-sm">
              Be the first citizen to voice your perspective on this national ballot inquiry.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = currentUser?.id === message.author.id;
            const isFlagged = message.isFlagged === true;
            const initials = (message.author.name || "A")
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const avatarGrad = getAvatarGradient(message.author.name || "A");

            return (
              <div
                key={message.id}
                className={`group relative flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
                }`}
              >
                {/* Profile Icon / Avatar */}
                <div
                  className={`h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr ${avatarGrad} flex items-center justify-center text-[11px] font-bold text-white shadow-md ring-1 ring-white/20`}
                  title={message.author.name}
                >
                  {initials}
                </div>

                {/* Message Content Container */}
                <div className={`relative flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {/* Author Name & Metadata */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                    <span className="font-semibold text-zinc-300">
                      {isMe ? "You" : message.author.name}
                    </span>
                    {message.author.role === "admin" && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                        Editor
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500">
                      {formatChatTime(message.createdAt)}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`relative rounded-2xl px-3.5 py-2.5 text-xs shadow-md transition-all ${
                      isFlagged
                        ? "bg-[#161622] border border-rose-500/25 text-zinc-300"
                        : isMe
                        ? "bg-gradient-to-br from-rose-600 to-rose-700 text-white rounded-tr-sm"
                        : "bg-[#181822] text-zinc-200 border border-white/10 rounded-tl-sm hover:border-white/20"
                    }`}
                  >
                    {/* Abusive / Crime Content Shield (Permanently hidden without View button) */}
                    {isFlagged ? (
                      <div className="flex items-center gap-2 py-0.5 select-none min-w-[190px]">
                        <div className="h-5 w-5 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                          <ShieldAlert className="h-3 w-3 text-rose-400" />
                        </div>
                        <span className="text-[11px] font-medium text-rose-300/90 tracking-wide">
                          Sensitive message hidden
                        </span>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed select-text">
                        {message.content}
                      </p>
                    )}

                    {/* Action Bar (Hover / Tap) */}
                    <div
                      className={`absolute -top-3 ${
                        isMe ? "-left-14" : "-right-14"
                      } hidden group-hover:flex items-center gap-1`}
                    >
                      {/* WhatsApp-Style Reaction Trigger */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionMessageId(
                            activeReactionMessageId === message.id ? null : message.id
                          )
                        }
                        title="React to message"
                        className="flex items-center justify-center h-6 w-6 rounded-full bg-[#1e1e2c] border border-white/20 text-zinc-400 hover:text-rose-400 hover:scale-110 shadow-lg transition-all"
                      >
                        <Smile className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete Message Button for Author or Admin */}
                      {(isMe || currentUser?.role === "admin") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message.id)}
                          title={isMe ? "Delete your message" : "Delete message (Admin)"}
                          className="flex items-center justify-center h-6 w-6 rounded-full bg-[#1e1e2c] border border-white/20 text-zinc-400 hover:text-rose-400 hover:scale-110 shadow-lg transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Popover WhatsApp Reaction Bar */}
                  {activeReactionMessageId === message.id && (
                    <div
                      className={`z-20 mt-1 flex items-center gap-1 rounded-full bg-[#1c1c28] border border-white/20 px-2 py-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
                        isMe ? "self-end" : "self-start"
                      }`}
                    >
                      {WHATSAPP_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(message.id, emoji)}
                          className="h-7 w-7 rounded-full flex items-center justify-center text-sm hover:scale-125 hover:bg-white/10 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}

                      {/* Delete trigger in popover for mobile / quick access */}
                      {(isMe || currentUser?.role === "admin") && (
                        <>
                          <div className="h-3.5 w-px bg-white/20 mx-0.5" />
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(message.id)}
                            title={isMe ? "Delete your message" : "Delete message (Admin)"}
                            className="h-7 w-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Reactions Pill Display (WhatsApp style at bottom of message) */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                      {message.reactions.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          type="button"
                          onClick={() => handleToggleReaction(message.id, reaction.emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                            reaction.reactedByMe
                              ? "bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-sm"
                              : "bg-white/[0.06] border border-white/10 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[10px]">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Input & Authentication Controls */}
      <div className="p-3 border-t border-white/10 bg-white/[0.02]">
        {!currentUser ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
            <span className="text-zinc-400">Sign in to participate in the live public chat:</span>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/login?redirect=${encodeURIComponent(`/polls/${pollId}`)}`}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-500 transition-colors shadow-sm"
              >
                <LogIn className="h-3 w-3 shrink-0" />
                <span className="whitespace-nowrap">Log In</span>
              </Link>
              <Link
                href={`/register?redirect=${encodeURIComponent(`/polls/${pollId}`)}`}
                className="whitespace-nowrap rounded border border-white/15 px-3 py-1.5 font-medium text-zinc-300 hover:text-white transition-colors"
              >
                Register
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-2">
            {/* Quick emoji helper bar if toggled */}
            {showEmojiPicker && (
              <div className="flex items-center gap-1 p-1.5 rounded-lg bg-[#181824] border border-white/10 overflow-x-auto">
                {WHATSAPP_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputContent((prev) => prev + emoji);
                    }}
                    className="h-7 w-7 rounded flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`p-2 rounded-xl border transition-colors ${
                  showEmojiPicker
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                    : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
                title="Add emoji"
              >
                <Smile className="h-4 w-4" />
              </button>

              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Share your verified opinion live in this poll..."
                  maxLength={1000}
                  disabled={isSending}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                  {inputContent.length > 0 && `${inputContent.length}/1000`}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSending || !inputContent.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition-all hover:bg-rose-500 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
              >
                {isSending ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
