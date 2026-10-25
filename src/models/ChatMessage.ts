import mongoose, { Schema, Document, Model } from "mongoose";

export type ChatMessageStatus = "visible" | "hidden" | "removed";

export interface IChatReaction {
  emoji: string;
  users: mongoose.Types.ObjectId[];
}

export interface IChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  pollId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  status: ChatMessageStatus;
  reactions: IChatReaction[];
  isFlagged: boolean;
  flagReason?: string;
  flaggedWords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatReactionSchema = new Schema<IChatReaction>(
  {
    emoji: {
      type: String,
      required: true,
      trim: true,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    pollId: {
      type: Schema.Types.ObjectId,
      ref: "Poll",
      required: [true, "Poll ID is required"],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author ID is required"],
      index: true,
    },
    content: {
      type: String,
      required: [true, "Chat message content cannot be empty"],
      trim: true,
      minlength: [1, "Chat message must be at least 1 character long"],
      maxlength: [1000, "Chat message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: ["visible", "hidden", "removed"],
        message: "{VALUE} is not a valid chat message status",
      },
      default: "visible",
      index: true,
    },
    reactions: {
      type: [ChatReactionSchema],
      default: [],
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: {
      type: String,
      default: undefined,
    },
    flaggedWords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for real-time history retrieval & user activity
ChatMessageSchema.index({ pollId: 1, status: 1, createdAt: -1 });
ChatMessageSchema.index({ pollId: 1, createdAt: -1 });
ChatMessageSchema.index({ authorId: 1, createdAt: -1 });

// Avoid stale cached model in long-running Next.js development server
if (process.env.NODE_ENV !== "production" && mongoose.models.ChatMessage) {
  delete mongoose.models.ChatMessage;
}

export const ChatMessageModel: Model<IChatMessage> =
  mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

export default ChatMessageModel;
