import { connectToDatabase } from "@/lib/mongodb";
import { ChatMessageModel, IChatMessage } from "@/models/ChatMessage";
import { PollModel } from "@/models/Poll";
import { UserModel } from "@/models/User";
import { ChatMessage, ChatHistoryResponse } from "@/types/chat";
import { checkRateLimit } from "@/lib/auth";
import mongoose from "mongoose";
import { EventEmitter } from "events";

export class ChatError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ChatError";
    this.statusCode = statusCode;
  }
}

// In-process event emitter for real-time room dispatch
class ChatRoomEmitter extends EventEmitter {}

// Global singleton to avoid multiple emitters across Next.js reloads
declare global {
  var __pulseChatEmitter: ChatRoomEmitter | undefined;
}

const chatEmitter = globalThis.__pulseChatEmitter || new ChatRoomEmitter();
if (process.env.NODE_ENV !== "production") {
  globalThis.__pulseChatEmitter = chatEmitter;
}
chatEmitter.setMaxListeners(500);

/**
 * Sanitize plain user text while preserving whitespace and punctuation.
 * Strips script tags, HTML tags, and control characters to prevent XSS.
 */
export function sanitizeChatMessage(raw: string): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ""); // Strip non-printable ASCII
}

/**
 * Subscribe a connected client to real-time chat messages for a specific poll.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToPollChat(
  pollId: string,
  listener: (message: ChatMessage) => void
): () => void {
  const channel = `poll:${pollId}`;
  chatEmitter.on(channel, listener);
  return () => {
    chatEmitter.off(channel, listener);
  };
}

/**
 * Broadcast a new persisted chat message to all connected clients in the room.
 */
export async function broadcastChatMessage(
  pollId: string,
  message: ChatMessage
): Promise<void> {
  const channel = `poll:${pollId}`;
  chatEmitter.emit(channel, message);

  // Optional: If Pusher managed service credentials are configured, broadcast via Pusher
  const pusherAppId = process.env.PUSHER_APP_ID;
  const pusherKey = process.env.PUSHER_KEY;
  const pusherSecret = process.env.PUSHER_SECRET;
  const pusherCluster = process.env.PUSHER_CLUSTER || "mt1";

  if (pusherAppId && pusherKey && pusherSecret) {
    try {
      // Lazy load pusher or use standard Pusher HTTP event trigger
      const crypto = await import("crypto");
      const path = `/apps/${pusherAppId}/events`;
      const body = JSON.stringify({
        name: "new-message",
        channel: `poll-${pollId}`,
        data: JSON.stringify(message),
      });

      const bodyMd5 = crypto.createHash("md5").update(body).digest("hex");
      const timestamp = Math.floor(Date.now() / 1000);
      const queryString = `auth_key=${pusherKey}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
      const signString = `POST\n${path}\n${queryString}`;
      const authSignature = crypto
        .createHmac("sha256", pusherSecret)
        .update(signString)
        .digest("hex");

      const pusherUrl = `https://api-${pusherCluster}.pusher.com${path}?${queryString}&auth_signature=${authSignature}`;
      await fetch(pusherUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch {
      // Pusher broadcast error should not fail message delivery or response
    }
  }
}

/**
 * Retrieve recent chat history for a published poll.
 * Rejects draft polls by returning null.
 * Never exposes emails, password hashes, or private account fields.
 */
export async function getPollChatHistory(
  pollIdentifier: string,
  options?: { limit?: number; before?: string }
): Promise<ChatHistoryResponse | null> {
  await connectToDatabase();

  const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
    ],
  })
    .select("_id status slug")
    .lean();

  if (!poll || poll.status === "draft") {
    return null;
  }

  const limit = Math.min(Math.max(1, options?.limit || 50), 100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    pollId: poll._id,
    status: "visible",
  };

  if (options?.before) {
    const beforeDate = new Date(options.before);
    if (!isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate };
    }
  }

  const totalCount = await ChatMessageModel.countDocuments({
    pollId: poll._id,
    status: "visible",
  });

  const rawMessages = await ChatMessageModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate<{ authorId: { _id: mongoose.Types.ObjectId; name: string; role: "user" | "admin"; status: string } }>(
      "authorId",
      "name role status"
    )
    .lean();

  const hasMore = rawMessages.length > limit;
  const slicedMessages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

  // Transform safely and return in chronological order (oldest to newest)
  const messages: ChatMessage[] = slicedMessages
    .reverse()
    .map((doc) => {
      const author = doc.authorId;
      return {
        id: doc._id.toString(),
        pollId: doc.pollId.toString(),
        content: doc.content,
        createdAt: doc.createdAt.toISOString(),
        status: doc.status,
        author: {
          id: author?._id ? author._id.toString() : "unknown",
          name: author?.name || "Anonymous Citizen",
          role: author?.role || "user",
        },
      };
    });

  return {
    messages,
    totalCount,
    hasMore,
  };
}

/**
 * Persist and broadcast a new chat message to a published poll room.
 * Enforces per-user rate limiting, validation, author derivation, and room isolation.
 */
export async function createChatMessage(
  pollIdentifier: string,
  authorId: string,
  rawContent: string
): Promise<ChatMessage> {
  await connectToDatabase();

  const content = sanitizeChatMessage(rawContent);

  if (!content || content.length === 0) {
    throw new ChatError("Chat message cannot be empty.", 400);
  }

  if (content.length > 1000) {
    throw new ChatError("Chat message cannot exceed 1000 characters.", 400);
  }

  // Verify rate limit (max 15 chat messages per minute per authenticated citizen)
  const rateLimitKey = `chat:${authorId}`;
  const rateLimit = checkRateLimit(rateLimitKey, 15, 60 * 1000);
  if (!rateLimit.allowed) {
    throw new ChatError(
      "You are sending messages too quickly. Please pause briefly before sending another message.",
      429
    );
  }

  // Find poll and ensure it is published (reject draft or closed polls)
  const isObjectId = mongoose.Types.ObjectId.isValid(pollIdentifier);
  const poll = await PollModel.findOne({
    $or: [
      { slug: pollIdentifier },
      ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(pollIdentifier) }] : []),
    ],
  })
    .select("_id status closesAt")
    .lean();

  if (!poll) {
    throw new ChatError("The requested survey does not exist.", 404);
  }

  if (poll.status === "draft") {
    throw new ChatError("Chat is not available for draft surveys.", 403);
  }

  // Verify author exists and is active
  const author = await UserModel.findById(authorId).select("_id name role status").lean();
  if (!author) {
    throw new ChatError("Author account not found.", 401);
  }

  if (author.status === "suspended") {
    throw new ChatError("Account is suspended from public discourse.", 403);
  }

  // Persist message in MongoDB
  const createdDoc: IChatMessage = await ChatMessageModel.create({
    pollId: poll._id,
    authorId: author._id,
    content,
    status: "visible",
  });

  const messagePayload: ChatMessage = {
    id: createdDoc._id.toString(),
    pollId: poll._id.toString(),
    content: createdDoc.content,
    createdAt: createdDoc.createdAt.toISOString(),
    status: "visible",
    author: {
      id: author._id.toString(),
      name: author.name,
      role: author.role,
    },
  };

  // Broadcast to all active room subscribers
  await broadcastChatMessage(poll._id.toString(), messagePayload);

  return messagePayload;
}
