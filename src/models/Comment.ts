import mongoose, { Schema, Document, Model } from "mongoose";

export type CommentStatus = "visible" | "hidden" | "removed";

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  pollId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  parentId?: mongoose.Types.ObjectId | null;
  status: CommentStatus;
  likes: mongoose.Types.ObjectId[];
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
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
      required: [true, "Comment content cannot be empty"],
      trim: true,
      minlength: [1, "Comment must be at least 1 character long"],
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    likes: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ["visible", "hidden", "removed"],
        message: "{VALUE} is not a valid comment status",
      },
      default: "visible",
      index: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    moderatedAt: {
      type: Date,
    },
    moderationReason: {
      type: String,
      trim: true,
      maxlength: [500, "Moderation reason cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

// Compound indexes for high-concurrency discussion rendering and moderation
CommentSchema.index({ pollId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ pollId: 1, parentId: 1, status: 1 });
CommentSchema.index({ status: 1, createdAt: -1 });

// Ensure hot reload in development does not reuse stale model lacking likes definition
if (mongoose.models.Comment && !mongoose.models.Comment.schema.paths.likes) {
  delete mongoose.models.Comment;
}

export const CommentModel: Model<IComment> =
  (mongoose.models.Comment as Model<IComment>) ||
  mongoose.model<IComment>("Comment", CommentSchema);
